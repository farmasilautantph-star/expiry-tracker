import { DatabaseSync } from "node:sqlite";

type ColInfo = { name: string };

export function up(db: DatabaseSync): void {
  const cols = db.prepare("PRAGMA table_info(offers)").all() as unknown as ColInfo[];
  const names = new Set(cols.map((c) => c.name));

  // Drop old columns that no longer fit the schema by recreating the table
  // Only if the new shape hasn't been applied yet (check for outlet_name)
  if (!names.has("expiry_log_id")) db.exec("ALTER TABLE offers ADD COLUMN expiry_log_id INTEGER REFERENCES expiry_logs(id)");
  if (!names.has("outlet_name"))   db.exec("ALTER TABLE offers ADD COLUMN outlet_name TEXT");
  if (!names.has("offer_status"))  db.exec("ALTER TABLE offers ADD COLUMN offer_status TEXT NOT NULL DEFAULT 'offered'");
  if (!names.has("updated_at"))    db.exec("ALTER TABLE offers ADD COLUMN updated_at TEXT");

  // Backfill updated_at for existing rows
  db.exec("UPDATE offers SET updated_at = created_at WHERE updated_at IS NULL");
}
