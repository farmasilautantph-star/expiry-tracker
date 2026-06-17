import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), "db", "expiry-tracker.db");

if (!fs.existsSync(DB_PATH)) {
  console.error("❌ DB file not found:", DB_PATH);
  console.error('   Run `npm run migrate` then `npm run seed` first.');
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);

let warnings = 0;
let errors = 0;

// ── Required tables ───────────────────────────────────────────────────────────
const REQUIRED_TABLES: Record<string, string[]> = {
  users:       ["id", "username", "password_hash", "role", "pic_name", "created_at"],
  expiry_logs: ["id", "barcode", "description", "category", "expiry_date", "pic_id", "pic_name", "logged_at", "quantity"],
  offers:      ["id", "description", "barcode", "uom", "quantity", "has_alert", "created_at", "created_by",
                "stock_id", "category", "notes", "expiry_log_id", "outlet_name", "offer_status", "updated_at"],
  history_log: ["id", "action", "module", "record_id", "pic_id", "pic_name", "description", "timestamp"],
};

type TableInfoRow = { name: string };
type CountRow = { count: number };

for (const [table, requiredCols] of Object.entries(REQUIRED_TABLES)) {
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(table) as TableInfoRow | undefined;

  if (!exists) {
    console.error(`❌ Table missing: ${table}`);
    errors++;
    continue;
  }

  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));
  const missing = requiredCols.filter((c) => !colNames.has(c));

  const rowCount = (db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as unknown as CountRow).count;

  if (missing.length > 0) {
    console.error(`❌ Table: ${table.padEnd(12)} (${rowCount} rows) — missing columns: ${missing.join(", ")}`);
    errors++;
  } else {
    console.log(`✅ Table: ${table.padEnd(12)} (${rowCount} rows)`);
  }
}

// ── Date format check ─────────────────────────────────────────────────────────
type DateRow = { id: number; val: string };

const ISO_RE = /^\d{4}-\d{2}-\d{2}/;

function checkDates(table: string, col: string) {
  const rows = db
    .prepare(`SELECT id, ${col} as val FROM ${table} WHERE ${col} IS NOT NULL`)
    .all() as unknown as DateRow[];

  const bad = rows.filter((r) => !ISO_RE.test(String(r.val)));
  if (bad.length > 0) {
    const ids = bad.map((r) => r.id).join(", ");
    console.warn(`⚠️  Date format: ${table}.${col} — ${bad.length} bad value(s) (IDs: ${ids})`);
    warnings++;
  } else {
    console.log(`✅ Date format: ${table}.${col} — OK`);
  }
}

checkDates("expiry_logs", "expiry_date");
checkDates("expiry_logs", "logged_at");

// ── Null checks on critical fields ────────────────────────────────────────────
type NullCheckRow = { id: number };

function checkNulls(table: string, col: string) {
  const rows = db
    .prepare(`SELECT id FROM ${table} WHERE ${col} IS NULL OR ${col} = ''`)
    .all() as unknown as NullCheckRow[];

  if (rows.length > 0) {
    const ids = rows.map((r) => r.id).join(", ");
    console.warn(`⚠️  Null check: ${table}.${col} — ${rows.length} null/empty value(s) (IDs: ${ids})`);
    warnings++;
  } else {
    console.log(`✅ Null check: ${table}.${col} — OK`);
  }
}

checkNulls("expiry_logs", "description");
checkNulls("expiry_logs", "expiry_date");
checkNulls("users", "username");
checkNulls("users", "role");

// ── FK integrity: expiry_logs.pic_id → users.id ───────────────────────────────
type OrphanRow = { id: number };

const orphanedExpiry = db
  .prepare("SELECT id FROM expiry_logs WHERE pic_id NOT IN (SELECT id FROM users)")
  .all() as unknown as OrphanRow[];

if (orphanedExpiry.length > 0) {
  const ids = orphanedExpiry.map((r) => r.id).join(", ");
  console.warn(`⚠️  FK check: expiry_logs.pic_id — ${orphanedExpiry.length} orphaned row(s) (IDs: ${ids})`);
  warnings++;
} else {
  console.log("✅ FK check: expiry_logs.pic_id → users.id — OK");
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nSummary: ${warnings} warning(s), ${errors} error(s)`);

db.close();

if (errors > 0) process.exit(1);
