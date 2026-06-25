/**
 * Migrate Return Policy from Excel to Neon.
 *
 * Source: migrate/csv/Return_Policy_2026-06-25.xlsx (sheet "Return Policy")
 *
 * Usage:
 *   npx tsx scripts/migrate-return-policy.ts            # dry-run (default)
 *   npx tsx scripts/migrate-return-policy.ts --execute  # create table + insert
 */

import "./_env";
import path from "path";
import xlsx from "xlsx";
import pool from "../lib/db-postgres";

const EXECUTE = process.argv.includes("--execute");
const FILE = path.join("migrate", "csv", "Return_Policy_2026-06-25.xlsx");

const VALID_TYPES = new Set(["RETURNABLE", "EXCHANGEABLE", "NON_RETURNABLE", "UNKNOWN"]);

interface RawRow {
  "Supplier ID"?: string;
  "Supplier Name"?: string;
  Brand?: string;
  Scope?: string;
  Address?: string;
  "Contact Person"?: string;
  "Item Description"?: string;
  "Return Type"?: string;
  "Months Before Expiry"?: number | string | null;
  "Special Conditions"?: string;
  "Strict Supplier"?: string;
  "Last Updated"?: string | number | null;
  "Updated By"?: string | number;
}

interface CleanRow {
  supplier_id: string;
  supplier_name: string;
  brand: string;
  scope: string;
  address: string | null;
  contact_person: string | null;
  item_description: string | null;
  return_type: string;
  months_before_expiry: number | null;
  special_conditions: string | null;
  strict_supplier: boolean;
  last_updated: string | null;
  updated_by: string | null;
}

function s(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const str = String(v).trim();
  return str === "" ? null : str;
}

function normalizeType(v: unknown): string | null {
  const raw = s(v);
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/[\s-]+/g, "_");
  return VALID_TYPES.has(upper) ? upper : null;
}

function parseMonths(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function parseStrict(v: unknown): boolean {
  const str = s(v)?.toUpperCase();
  return str === "YES" || str === "TRUE" || str === "Y" || str === "1";
}

// Excel may give M/D/YYYY string or a serial number. Convert to ISO date.
function parseDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    // Excel serial: days since 1899-12-30
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().split("T")[0];
  }
  const str = String(v).trim();
  if (!str) return null;
  // M/D/YYYY or MM/DD/YYYY
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mo = String(m[1]).padStart(2, "0");
    const da = String(m[2]).padStart(2, "0");
    return `${m[3]}-${mo}-${da}`;
  }
  // Fallback: let Date parse it
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}

function clean(raw: RawRow, idx: number): CleanRow | { skip: string } {
  const supplier_id = s(raw["Supplier ID"]);
  const supplier_name = s(raw["Supplier Name"]);
  const brand = s(raw.Brand);
  const return_type = normalizeType(raw["Return Type"]);

  if (!supplier_id) return { skip: `row ${idx + 2}: missing Supplier ID` };
  if (!supplier_name) return { skip: `row ${idx + 2}: missing Supplier Name` };
  if (!return_type)
    return { skip: `row ${idx + 2}: invalid Return Type "${raw["Return Type"]}"` };

  return {
    supplier_id,
    supplier_name,
    brand: brand ?? "",
    scope: s(raw.Scope) ?? "BRAND",
    address: s(raw.Address),
    contact_person: s(raw["Contact Person"]),
    item_description: s(raw["Item Description"]),
    return_type,
    months_before_expiry: parseMonths(raw["Months Before Expiry"]),
    special_conditions: s(raw["Special Conditions"]),
    strict_supplier: parseStrict(raw["Strict Supplier"]),
    last_updated: parseDate(raw["Last Updated"]),
    updated_by: s(raw["Updated By"]),
  };
}

async function ensureTable(client: import("pg").PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS return_policies (
      id SERIAL PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      brand TEXT NOT NULL,
      scope TEXT DEFAULT 'BRAND',
      address TEXT,
      contact_person TEXT,
      item_description TEXT,
      return_type TEXT NOT NULL,
      months_before_expiry INTEGER,
      special_conditions TEXT,
      strict_supplier BOOLEAN DEFAULT false,
      last_updated DATE,
      updated_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await client.query(
    "CREATE INDEX IF NOT EXISTS idx_return_policies_supplier_id ON return_policies (supplier_id);",
  );
  await client.query(
    "CREATE INDEX IF NOT EXISTS idx_return_policies_brand ON return_policies (brand);",
  );
  await client.query(
    "CREATE INDEX IF NOT EXISTS idx_return_policies_return_type ON return_policies (return_type);",
  );
}

async function main() {
  console.log("\n── Migrate Return Policy → Neon ──────────────────────\n");
  console.log(`Mode: ${EXECUTE ? "EXECUTE (live)" : "DRY-RUN"}`);
  console.log(`File: ${FILE}\n`);

  const wb = xlsx.readFile(FILE);
  const sheet = wb.Sheets["Return Policy"];
  if (!sheet) throw new Error('Sheet "Return Policy" not found');
  const rows = xlsx.utils.sheet_to_json<RawRow>(sheet, { defval: null });
  console.log(`Loaded ${rows.length} rows from Excel.\n`);

  const ok: CleanRow[] = [];
  const skipped: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = clean(rows[i], i);
    if ("skip" in r) skipped.push(r.skip);
    else ok.push(r);
  }

  console.log(`Valid: ${ok.length}`);
  console.log(`Skipped: ${skipped.length}`);
  if (skipped.length) {
    for (const s of skipped.slice(0, 10)) console.log(`  - ${s}`);
    if (skipped.length > 10) console.log(`  …and ${skipped.length - 10} more`);
  }

  // Type breakdown
  const byType: Record<string, number> = {};
  for (const r of ok) byType[r.return_type] = (byType[r.return_type] ?? 0) + 1;
  console.log("\nBy Return Type:");
  for (const [k, v] of Object.entries(byType)) console.log(`  ${k.padEnd(16)} ${v}`);

  if (ok.length > 0) {
    console.log("\nFirst row:");
    console.log(JSON.stringify(ok[0], null, 2));
  }

  if (!EXECUTE) {
    console.log("\nDRY-RUN complete. Re-run with --execute to apply.\n");
    return;
  }

  const client = await pool.connect();
  try {
    await ensureTable(client);

    // Replace strategy: clear table then insert all
    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE return_policies RESTART IDENTITY");

    let inserted = 0;
    for (const r of ok) {
      await client.query(
        `INSERT INTO return_policies (
          supplier_id, supplier_name, brand, scope, address, contact_person,
          item_description, return_type, months_before_expiry, special_conditions,
          strict_supplier, last_updated, updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          r.supplier_id,
          r.supplier_name,
          r.brand,
          r.scope,
          r.address,
          r.contact_person,
          r.item_description,
          r.return_type,
          r.months_before_expiry,
          r.special_conditions,
          r.strict_supplier,
          r.last_updated,
          r.updated_by,
        ],
      );
      inserted++;
    }
    await client.query("COMMIT");
    console.log(`\n✅ Inserted ${inserted} rows into return_policies.\n`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("\n❌ Migration failed:", e);
  process.exit(1);
});
