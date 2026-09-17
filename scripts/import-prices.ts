/**
 * Import item prices (Barcode → Price 1) from the POS product export CSV
 * into the Neon `item_prices` table. Full truncate + reload each run, so
 * re-running with an updated export is the standard way to refresh prices.
 *
 * Usage:
 *   npx tsx scripts/import-prices.ts                      # uses default path below
 *   npx tsx scripts/import-prices.ts path/to/export.csv    # or an explicit path
 */

import "./_env"; // must come before db-postgres import
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import pool from "../lib/db-postgres";

const DEFAULT_PATH = path.join(process.cwd(), "migrate", "csv", "total price.csv");

function resolveFile(): string {
  const candidates = [process.argv[2], DEFAULT_PATH].filter(Boolean) as string[];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`Price CSV not found. Tried: ${candidates.join(", ")}`);
}

interface PriceRow {
  barcode: string;
  stock_id: string | null;
  description: string | null;
  price: number;
}

function parsePrice(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const filePath = resolveFile();
  console.log(`\n── Price Import ───────────────────────────────────────\n`);
  console.log(`Reading: ${filePath}`);

  const wb = XLSX.readFile(filePath, { raw: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  console.log(`${rows.length} raw rows found`);

  const valid: PriceRow[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const raw of rows) {
    const barcode = String(raw["Barcode"] ?? "").trim();
    const price = parsePrice(raw["Price 1"]);
    if (!barcode || price === null) {
      skipped++;
      continue;
    }
    if (seen.has(barcode)) {
      skipped++;
      continue;
    }
    seen.add(barcode);
    valid.push({
      barcode,
      stock_id: String(raw["Stock ID"] ?? "").trim() || null,
      description: String(raw["Description 1"] ?? "").trim() || null,
      price,
    });
  }

  console.log(`Valid: ${valid.length}, skipped: ${skipped} (missing barcode/price or duplicate barcode)`);

  if (valid.length === 0) {
    console.error("No valid rows to import — aborting.");
    process.exit(1);
  }

  console.log(`\n🌐 Connecting to: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}\n`);

  const client = await pool.connect();
  const CHUNK = 500;
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE item_prices RESTART IDENTITY");

    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK);
      const values: unknown[] = [];
      const placeholders = chunk
        .map((r, idx) => {
          const base = idx * 4;
          values.push(r.barcode, r.stock_id, r.description, r.price);
          return `($${base + 1},$${base + 2},$${base + 3},$${base + 4})`;
        })
        .join(",");
      await client.query(
        `INSERT INTO item_prices (barcode, stock_id, description, price) VALUES ${placeholders}`,
        values,
      );
      process.stdout.write(`\r  Inserted ${Math.min(i + CHUNK, valid.length)}/${valid.length}`);
    }

    await client.query("COMMIT");
    console.log(`\n\n✅ Imported ${valid.length} prices (${skipped} skipped)\n`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("\n\n❌ Import failed:", e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
