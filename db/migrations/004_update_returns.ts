import { DatabaseSync } from "node:sqlite";

type ColInfo = { name: string };

export function up(db: DatabaseSync): void {
  const cols = db.prepare("PRAGMA table_info(returns)").all() as unknown as ColInfo[];
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("stock_id"))       db.exec("ALTER TABLE returns ADD COLUMN stock_id TEXT");
  if (!names.has("uom"))            db.exec("ALTER TABLE returns ADD COLUMN uom TEXT");
  if (!names.has("return_by_date")) db.exec("ALTER TABLE returns ADD COLUMN return_by_date TEXT");
  if (!names.has("notes"))          db.exec("ALTER TABLE returns ADD COLUMN notes TEXT");
  if (!names.has("status"))         db.exec("ALTER TABLE returns ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
}
