import { DatabaseSync } from "node:sqlite";

type ColInfo = { name: string };

export function up(db: DatabaseSync): void {
  const cols = db.prepare("PRAGMA table_info(expiry_logs)").all() as unknown as ColInfo[];
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("stock_id"))      db.exec("ALTER TABLE expiry_logs ADD COLUMN stock_id TEXT");
  if (!names.has("uom"))           db.exec("ALTER TABLE expiry_logs ADD COLUMN uom TEXT");
  if (!names.has("return_status")) db.exec("ALTER TABLE expiry_logs ADD COLUMN return_status TEXT");
  if (!names.has("return_by_date"))db.exec("ALTER TABLE expiry_logs ADD COLUMN return_by_date TEXT");
}
