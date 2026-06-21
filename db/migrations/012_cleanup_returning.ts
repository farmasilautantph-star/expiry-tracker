import { DatabaseSync } from "node:sqlite";

export function up(db: DatabaseSync): void {
  db.exec(`
    UPDATE expiry_logs
    SET return_status = 'returned',
        item_status = 'completed',
        completed_via = 'returned',
        completed_at = COALESCE(completed_at, datetime('now'))
    WHERE return_status = 'returning'
  `);
}
