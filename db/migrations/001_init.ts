import { DatabaseSync } from "node:sqlite";

export function up(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     TEXT    NOT NULL UNIQUE,
      password_hash TEXT   NOT NULL,
      role         TEXT    NOT NULL CHECK(role IN ('manager', 'staff')),
      pic_name     TEXT    NOT NULL,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expiry_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode     TEXT    NOT NULL,
      description TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      expiry_date TEXT    NOT NULL,
      pic_id      INTEGER NOT NULL REFERENCES users(id),
      pic_name    TEXT    NOT NULL,
      logged_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      notes       TEXT
    );

    CREATE TABLE IF NOT EXISTS offers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT    NOT NULL,
      barcode     TEXT    NOT NULL,
      uom         TEXT    NOT NULL,
      quantity    INTEGER NOT NULL DEFAULT 1,
      has_alert   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      created_by  INTEGER NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS returns (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      logged_date TEXT    NOT NULL,
      pic_id      INTEGER NOT NULL REFERENCES users(id),
      pic_name    TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      description TEXT    NOT NULL,
      barcode     TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS history_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      action      TEXT    NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE')),
      module      TEXT    NOT NULL,
      record_id   INTEGER NOT NULL,
      pic_id      INTEGER REFERENCES users(id),
      pic_name    TEXT    NOT NULL,
      description TEXT    NOT NULL,
      timestamp   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
