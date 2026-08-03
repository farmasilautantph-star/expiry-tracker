import "./_env";
import pool from "../lib/db-postgres";

const STATEMENTS = [
  {
    name: "Add is_locked column",
    sql: `ALTER TABLE expiry_logs ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;`,
  },
  {
    name: "Add locked_at column",
    sql: `ALTER TABLE expiry_logs ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;`,
  },
  {
    name: "Add unlocked_reason column",
    sql: `ALTER TABLE expiry_logs ADD COLUMN IF NOT EXISTS unlocked_reason TEXT;`,
  },
  {
    name: "Add unlocked_by column",
    sql: `ALTER TABLE expiry_logs ADD COLUMN IF NOT EXISTS unlocked_by INTEGER REFERENCES users(id);`,
  },
];

async function run() {
  const client = await pool.connect();
  try {
    for (const stmt of STATEMENTS) {
      try {
        await client.query(stmt.sql);
        console.log(`[OK] ${stmt.name}`);
      } catch (err) {
        console.error(`[FAIL] ${stmt.name}:`, err);
        throw err;
      }
    }
    console.log("\nMigration complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
