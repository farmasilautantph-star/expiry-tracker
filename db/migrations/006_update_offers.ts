import { DatabaseSync } from "node:sqlite";

type ColInfo = { name: string };

export function up(db: DatabaseSync): void {
  const cols = db.prepare("PRAGMA table_info(offers)").all() as unknown as ColInfo[];
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("stock_id"))  db.exec("ALTER TABLE offers ADD COLUMN stock_id TEXT");
  if (!names.has("category"))  db.exec("ALTER TABLE offers ADD COLUMN category TEXT");
  if (!names.has("notes"))     db.exec("ALTER TABLE offers ADD COLUMN notes TEXT");
}
