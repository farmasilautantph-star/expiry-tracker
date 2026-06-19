import { DatabaseSync } from "node:sqlite";

type ColInfo = { name: string };

export function up(db: DatabaseSync): void {
  const cols = db
    .prepare("PRAGMA table_info(expiry_logs)")
    .all() as unknown as ColInfo[];
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("original_qty")) {
    db.exec("ALTER TABLE expiry_logs ADD COLUMN original_qty INTEGER DEFAULT NULL");
  }
}
