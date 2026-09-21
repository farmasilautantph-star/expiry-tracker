/**
 * Import a product master (Stock ID, Barcode, Description, UOM) into the
 * Neon `products` table — powers the "Product Search" autofill when logging
 * a new expiry entry. Full truncate + reload each run.
 *
 * Usage:
 *   npx tsx scripts/import-products-neon.ts <path-to-xlsx-or-csv>
 */

import * as XLSX from "xlsx";
import { Pool } from "pg";

function s(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const str = String(v).trim();
  return str === "" ? null : str;
}

interface ProductRow {
  stock_id: string | null;
  barcode: string | null;
  description: string | null;
  uom: string | null;
  category_id: string | null;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx scripts/import-products-neon.ts <path-to-xlsx-or-csv>");
    process.exit(1);
  }

  console.log(`\n── Product Import ─────────────────────────────────────\n`);
  console.log(`Reading: ${filePath}`);

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  console.log(`${rows.length} raw rows found`);

  const valid: ProductRow[] = [];
  const seenBarcodes = new Set<string>();
  let skipped = 0;

  for (const raw of rows) {
    const stockId = s(raw["Stock ID"]);
    const barcode = s(raw["Barcode"]);
    const description = s(raw["Description 1"] ?? raw["Description"]);
    const uom = s(raw["UOM ID"] ?? raw["UOM"]);
    const categoryId = s(raw["Category ID"] ?? raw["Category"]);

    if (!description && !barcode && !stockId) {
      skipped++;
      continue;
    }
    if (barcode && seenBarcodes.has(barcode)) {
      skipped++;
      continue;
    }
    if (barcode) seenBarcodes.add(barcode);

    valid.push({ stock_id: stockId, barcode, description, uom, category_id: categoryId });
  }

  console.log(`Valid: ${valid.length}, skipped: ${skipped} (empty row or duplicate barcode)`);

  if (valid.length === 0) {
    console.error("No valid rows to import — aborting.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  console.log(`\n🌐 Connecting to: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}\n`);

  const client = await pool.connect();
  const CHUNK = 500;
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE products RESTART IDENTITY");

    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK);
      const values: unknown[] = [];
      const placeholders = chunk
        .map((r, idx) => {
          const base = idx * 5;
          values.push(r.stock_id, r.barcode, r.description, r.uom, r.category_id);
          return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5})`;
        })
        .join(",");
      await client.query(
        `INSERT INTO products (stock_id, barcode, description, uom, category_id) VALUES ${placeholders}`,
        values,
      );
      process.stdout.write(`\r  Inserted ${Math.min(i + CHUNK, valid.length)}/${valid.length}`);
    }

    await client.query("COMMIT");
    console.log(`\n\n✅ Imported ${valid.length} products (${skipped} skipped)\n`);
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
