import * as XLSX from "xlsx";
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

// Accept optional path arg; try both extensions
function resolveFile(): string {
  const candidates = [
    process.argv[2],
    path.join(process.cwd(), "scripts/data/products.xlsx"),
    path.join(process.cwd(), "scripts/data/products.xlsx.xlsx"),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Excel file not found. Place the file at scripts/data/products.xlsx and retry.\nTried: ${candidates.join(", ")}`
  );
}

const filePath = resolveFile();
console.log(`Reading: ${filePath}`);

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), "db", "expiry-tracker.db");

if (!fs.existsSync(DB_PATH)) {
  console.error("DB not found. Run `npm run migrate` first.");
  process.exit(1);
}

// Read Excel
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

console.log(`Sheet: "${sheetName}" — ${rows.length} raw rows`);

if (rows.length === 0) {
  console.error("No rows found in sheet.");
  process.exit(1);
}

// Print header keys from first row so user can verify column names
const sampleKeys = Object.keys(rows[0]);
console.log(`Columns detected: ${sampleKeys.join(", ")}`);

// Flexible column finder — case-insensitive, trims spaces
function findKey(obj: Record<string, unknown>, ...candidates: string[]): string | null {
  const lower = candidates.map((c) => c.toLowerCase().replace(/\s+/g, " ").trim());
  for (const k of Object.keys(obj)) {
    const norm = k.toLowerCase().replace(/\s+/g, " ").trim();
    if (lower.includes(norm)) return k;
  }
  return null;
}

const first = rows[0];
const COL_STOCK_ID    = findKey(first, "Stock ID", "StockID", "stock_id", "STOCK ID");
const COL_BARCODE     = findKey(first, "Barcode", "BARCODE", "barcode");
const COL_DESCRIPTION = findKey(first, "Description", "DESCRIPTION", "description", "Desc");
const COL_UOM         = findKey(first, "UOM", "Uom", "uom", "Unit");
const COL_CATEGORY_ID = findKey(first, "Category ID", "CategoryID", "category_id", "CATEGORY ID", "Cat ID");

console.log(`\nColumn mapping:`);
console.log(`  Stock ID    → "${COL_STOCK_ID}"`);
console.log(`  Barcode     → "${COL_BARCODE}"`);
console.log(`  Description → "${COL_DESCRIPTION}"`);
console.log(`  UOM         → "${COL_UOM}"`);
console.log(`  Category ID → "${COL_CATEGORY_ID}"`);

if (!COL_DESCRIPTION && !COL_BARCODE) {
  console.error("\nCould not find Description or Barcode columns. Check column names above.");
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON");

// Clear existing products before import
db.exec("DELETE FROM products");

const insert = db.prepare(
  "INSERT INTO products (stock_id, barcode, description, uom, category_id) VALUES (?, ?, ?, ?, ?)"
);

const seenBarcodes = new Set<string>();
let imported = 0;
let skipped = 0;

for (const row of rows) {
  const stockId    = COL_STOCK_ID    ? String(row[COL_STOCK_ID] ?? "").trim()    : "";
  const barcode    = COL_BARCODE     ? String(row[COL_BARCODE] ?? "").trim()     : "";
  const desc       = COL_DESCRIPTION ? String(row[COL_DESCRIPTION] ?? "").trim() : "";
  const uom        = COL_UOM         ? String(row[COL_UOM] ?? "").trim()         : "";
  const categoryId = COL_CATEGORY_ID ? String(row[COL_CATEGORY_ID] ?? "").trim() : "";

  // Skip empty rows
  if (!desc && !barcode && !stockId) { skipped++; continue; }

  // Skip duplicate barcodes (keep first)
  if (barcode && seenBarcodes.has(barcode)) { skipped++; continue; }
  if (barcode) seenBarcodes.add(barcode);

  insert.run(
    stockId || null,
    barcode || null,
    desc || null,
    uom || null,
    categoryId || null,
  );
  imported++;
}

db.close();

console.log(`\n✓ Imported ${imported} products (${skipped} skipped)`);
