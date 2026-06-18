import { DatabaseSync } from "node:sqlite";

type ColInfo = { name: string };

export function up(db: DatabaseSync): void {
  // --- expiry_logs columns ---
  const expiryCol = db
    .prepare("PRAGMA table_info(expiry_logs)")
    .all() as unknown as ColInfo[];
  const expiryNames = new Set(expiryCol.map((c) => c.name));

  if (!expiryNames.has("item_status")) {
    db.exec(
      "ALTER TABLE expiry_logs ADD COLUMN item_status TEXT NOT NULL DEFAULT 'active'",
    );
  }
  if (!expiryNames.has("sold_at")) {
    db.exec("ALTER TABLE expiry_logs ADD COLUMN sold_at TEXT");
  }
  if (!expiryNames.has("sold_by")) {
    db.exec("ALTER TABLE expiry_logs ADD COLUMN sold_by TEXT");
  }
  if (!expiryNames.has("completed_via")) {
    db.exec("ALTER TABLE expiry_logs ADD COLUMN completed_via TEXT");
  }
  if (!expiryNames.has("completed_at")) {
    db.exec("ALTER TABLE expiry_logs ADD COLUMN completed_at TEXT");
  }
  if (!expiryNames.has("completed_notes")) {
    db.exec("ALTER TABLE expiry_logs ADD COLUMN completed_notes TEXT");
  }
  if (!expiryNames.has("return_notes")) {
    db.exec("ALTER TABLE expiry_logs ADD COLUMN return_notes TEXT");
  }

  // --- offers columns ---
  const offersCol = db
    .prepare("PRAGMA table_info(offers)")
    .all() as unknown as ColInfo[];
  const offersNames = new Set(offersCol.map((c) => c.name));

  if (!offersNames.has("received_at")) {
    db.exec("ALTER TABLE offers ADD COLUMN received_at TEXT");
  }
  if (!offersNames.has("rejection_notes")) {
    db.exec("ALTER TABLE offers ADD COLUMN rejection_notes TEXT");
  }
}
