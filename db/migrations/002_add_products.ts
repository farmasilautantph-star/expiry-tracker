import { DatabaseSync } from "node:sqlite";

export function up(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_id    TEXT,
      barcode     TEXT,
      description TEXT,
      uom         TEXT,
      category_id TEXT
    );
  `);

  // Indexes — CREATE INDEX IF NOT EXISTS is idempotent
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_stock_id    ON products(stock_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_barcode     ON products(barcode);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_description ON products(description);`);
}
