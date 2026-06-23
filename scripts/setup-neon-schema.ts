/**
 * Phase 15 — Create all tables in Neon PostgreSQL.
 *
 * Mirrors the SQLite schema with these adjustments:
 *   - INTEGER PRIMARY KEY AUTOINCREMENT → SERIAL PRIMARY KEY
 *   - datetime('now') defaults          → to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
 *   - INTEGER bool (has_alert)          → BOOLEAN
 *   - Date columns stay TEXT (app stores ISO strings)
 *
 * Run:
 *   npx ts-node --project tsconfig.scripts.json scripts/setup-neon-schema.ts
 */

import "./_env"; // must come before db-postgres import
import pool from "../lib/db-postgres";

const STATEMENTS: { name: string; sql: string }[] = [
  {
    name: "users",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL CHECK (role IN ('manager', 'staff')),
        pic_name      TEXT NOT NULL,
        created_at    TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
      )
    `,
  },
  {
    name: "products",
    sql: `
      CREATE TABLE IF NOT EXISTS products (
        id          SERIAL PRIMARY KEY,
        stock_id    TEXT,
        barcode     TEXT,
        description TEXT,
        uom         TEXT,
        category_id TEXT
      )
    `,
  },
  {
    name: "expiry_logs",
    sql: `
      CREATE TABLE IF NOT EXISTS expiry_logs (
        id               SERIAL PRIMARY KEY,
        barcode          TEXT NOT NULL,
        description      TEXT NOT NULL,
        category         TEXT NOT NULL,
        expiry_date      TEXT NOT NULL,
        pic_id           INTEGER NOT NULL REFERENCES users(id),
        pic_name         TEXT NOT NULL,
        logged_at        TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
        notes            TEXT,
        stock_id         TEXT,
        uom              TEXT,
        return_status    TEXT,
        return_by_date   TEXT,
        quantity         INTEGER NOT NULL DEFAULT 1,
        last_reviewed_at TEXT,
        last_reviewed_by TEXT,
        last_updated_at  TEXT,
        review_status    TEXT NOT NULL DEFAULT 'pending',
        item_status      TEXT NOT NULL DEFAULT 'active',
        sold_at          TEXT,
        sold_by          TEXT,
        completed_via    TEXT,
        completed_at     TEXT,
        completed_notes  TEXT,
        return_notes     TEXT,
        original_qty     INTEGER DEFAULT NULL
      )
    `,
  },
  {
    name: "offers",
    sql: `
      CREATE TABLE IF NOT EXISTS offers (
        id               SERIAL PRIMARY KEY,
        description      TEXT NOT NULL,
        barcode          TEXT NOT NULL,
        uom              TEXT NOT NULL,
        quantity         INTEGER NOT NULL DEFAULT 1,
        has_alert        BOOLEAN NOT NULL DEFAULT FALSE,
        created_at       TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
        created_by       INTEGER NOT NULL REFERENCES users(id),
        stock_id         TEXT,
        category         TEXT,
        notes            TEXT,
        expiry_log_id    INTEGER REFERENCES expiry_logs(id),
        outlet_name      TEXT,
        offer_status     TEXT NOT NULL DEFAULT 'offered',
        updated_at       TEXT,
        received_at      TEXT,
        rejection_notes  TEXT,
        expiry_date      TEXT
      )
    `,
  },
  {
    name: "returns",
    sql: `
      CREATE TABLE IF NOT EXISTS returns (
        id             SERIAL PRIMARY KEY,
        logged_date    TEXT NOT NULL,
        pic_id         INTEGER NOT NULL REFERENCES users(id),
        pic_name       TEXT NOT NULL,
        category       TEXT NOT NULL,
        description    TEXT NOT NULL,
        barcode        TEXT NOT NULL,
        created_at     TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
        stock_id       TEXT,
        uom            TEXT,
        return_by_date TEXT,
        notes          TEXT,
        status         TEXT NOT NULL DEFAULT 'pending'
      )
    `,
  },
  {
    name: "history_log",
    sql: `
      CREATE TABLE IF NOT EXISTS history_log (
        id          SERIAL PRIMARY KEY,
        action      TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
        module      TEXT NOT NULL,
        record_id   INTEGER NOT NULL,
        pic_id      INTEGER REFERENCES users(id),
        pic_name    TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp   TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
      )
    `,
  },
];

async function main() {
  console.log("\n── Neon Schema Setup ─────────────────────────────────\n");
  console.log(`🌐 Connecting to: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}\n`);

  const client = await pool.connect();
  try {
    for (const stmt of STATEMENTS) {
      process.stdout.write(`  CREATE TABLE IF NOT EXISTS ${stmt.name.padEnd(15)} `);
      await client.query(stmt.sql);
      console.log("✅");
    }
    console.log("\n──────────────────────────────────────────────────────");
    console.log(`\n✅ ${STATEMENTS.length} tables created (or already existed).\n`);
  } catch (err) {
    console.error("\n❌ Schema setup failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
