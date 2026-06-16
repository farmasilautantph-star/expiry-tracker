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

type ExpiryRow = {
  id: number;
  barcode: string;
  description: string;
  category: string;
  expiry_date: string;
  pic_name: string;
};

const rows = db
  .prepare("SELECT id, barcode, description, category, expiry_date, pic_name FROM expiry_logs ORDER BY expiry_date ASC")
  .all() as unknown as ExpiryRow[];

const today = new Date();
today.setHours(0, 0, 0, 0);

const in7  = new Date(today); in7.setDate(today.getDate() + 7);
const in30 = new Date(today); in30.setDate(today.getDate() + 30);

const buckets = { expired: [] as ExpiryRow[], critical: [] as ExpiryRow[], warning: [] as ExpiryRow[], safe: [] as ExpiryRow[] };

for (const row of rows) {
  const d = new Date(row.expiry_date);
  d.setHours(0, 0, 0, 0);
  if      (d < today) buckets.expired.push(row);
  else if (d <= in7)  buckets.critical.push(row);
  else if (d <= in30) buckets.warning.push(row);
  else                buckets.safe.push(row);
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function daysUntil(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

if (buckets.expired.length > 0) {
  console.log(`\n🔴 EXPIRED (${buckets.expired.length})`);
  for (const r of buckets.expired) {
    const days = Math.abs(daysUntil(r.expiry_date));
    console.log(`   [${r.id}] ${r.description} | ${formatDate(r.expiry_date)} | ${days}d ago | PIC: ${r.pic_name}`);
  }
}

if (buckets.critical.length > 0) {
  console.log(`\n🟠 CRITICAL — ≤7 days (${buckets.critical.length})`);
  for (const r of buckets.critical) {
    const days = daysUntil(r.expiry_date);
    console.log(`   [${r.id}] ${r.description} | ${formatDate(r.expiry_date)} | ${days}d left | PIC: ${r.pic_name}`);
  }
}

if (buckets.warning.length > 0) {
  console.log(`\n🟡 WARNING — ≤30 days (${buckets.warning.length})`);
  for (const r of buckets.warning) {
    const days = daysUntil(r.expiry_date);
    console.log(`   [${r.id}] ${r.description} | ${formatDate(r.expiry_date)} | ${days}d left | PIC: ${r.pic_name}`);
  }
}

if (buckets.safe.length > 0) {
  console.log(`\n🟢 SAFE — >30 days (${buckets.safe.length})`);
  for (const r of buckets.safe) {
    const days = daysUntil(r.expiry_date);
    console.log(`   [${r.id}] ${r.description} | ${formatDate(r.expiry_date)} | ${days}d left | PIC: ${r.pic_name}`);
  }
}

console.log(`\nSummary: ${buckets.expired.length} expired, ${buckets.critical.length} critical, ${buckets.warning.length} warning, ${buckets.safe.length} safe`);

db.close();

if (buckets.expired.length > 0 || buckets.critical.length > 0) {
  process.exit(0); // non-zero would break CI on expected data; expiries are domain state not errors
}
