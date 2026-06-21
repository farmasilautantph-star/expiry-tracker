import { DatabaseSync } from "node:sqlite";

export function up(db: DatabaseSync): void {
  db.exec(`ALTER TABLE offers ADD COLUMN expiry_date TEXT`);

  // Back-fill from linked expiry_logs where available
  db.exec(`
    UPDATE offers
    SET expiry_date = (
      SELECT el.expiry_date
      FROM expiry_logs el
      WHERE el.id = offers.expiry_log_id
    )
    WHERE expiry_log_id IS NOT NULL
      AND expiry_date IS NULL
  `);
}
