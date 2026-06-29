/**
 * Creates push_subscriptions + notifications tables in Neon PostgreSQL.
 *
 * Run:
 *   npx ts-node --project tsconfig.scripts.json scripts/create-notifications-tables.ts
 */

import "./_env";
import pool from "../lib/db-postgres";

const STATEMENTS: { name: string; sql: string }[] = [
  {
    name: "push_subscriptions",
    sql: `
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint     TEXT NOT NULL UNIQUE,
        p256dh       TEXT NOT NULL,
        auth         TEXT NOT NULL,
        user_agent   TEXT,
        created_at   TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
      )
    `,
  },
  {
    name: "push_subscriptions_user_idx",
    sql: `CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id)`,
  },
  {
    name: "notifications",
    sql: `
      CREATE TABLE IF NOT EXISTS notifications (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title      TEXT NOT NULL,
        body       TEXT NOT NULL,
        url        TEXT,
        type       TEXT,
        is_read    BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
      )
    `,
  },
  {
    name: "notifications_user_idx",
    sql: `CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, is_read, created_at DESC)`,
  },
];

async function main() {
  console.log("\n── Notifications Tables Setup ─────────────────────────\n");
  console.log(`🌐 Connecting to: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}\n`);

  const client = await pool.connect();
  try {
    for (const stmt of STATEMENTS) {
      process.stdout.write(`  ${stmt.name.padEnd(32)} `);
      await client.query(stmt.sql);
      console.log("✅");
    }
    console.log("\n──────────────────────────────────────────────────────");
    console.log(`\n✅ Notifications schema ready.\n`);
  } catch (err) {
    console.error("\n❌ Setup failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
