import { DatabaseSync } from "node:sqlite";

type ColInfo = { name: string };

export function up(db: DatabaseSync): void {
  const cols = db
    .prepare("PRAGMA table_info(expiry_logs)")
    .all() as unknown as ColInfo[];
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("last_reviewed_at")) {
    db.exec("ALTER TABLE expiry_logs ADD COLUMN last_reviewed_at TEXT");
  }
  if (!names.has("last_reviewed_by")) {
    db.exec("ALTER TABLE expiry_logs ADD COLUMN last_reviewed_by TEXT");
  }
  if (!names.has("last_updated_at")) {
    db.exec("ALTER TABLE expiry_logs ADD COLUMN last_updated_at TEXT");
  }
  if (!names.has("review_status")) {
    db.exec(
      "ALTER TABLE expiry_logs ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'",
    );
  }
}
