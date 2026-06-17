import { DatabaseSync } from "node:sqlite";

export function up(db: DatabaseSync): void {
  db.exec("UPDATE expiry_logs SET return_status = 'pending' WHERE return_status = 'returnable'");
}
