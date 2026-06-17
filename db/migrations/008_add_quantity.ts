import { DatabaseSync } from "node:sqlite";

type ColInfo = { name: string };

export function up(db: DatabaseSync): void {
  const cols = db.prepare("PRAGMA table_info(expiry_logs)").all() as unknown as ColInfo[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("quantity")) {
    db.exec("ALTER TABLE expiry_logs ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1");
  }
}
