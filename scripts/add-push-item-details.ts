import "./_env";
import pool from "../lib/db-postgres";

const STATEMENTS = [
  {
    name: "Add push_product_image column",
    sql: `ALTER TABLE expiry_logs ADD COLUMN IF NOT EXISTS push_product_image TEXT;`,
  },
  {
    name: "Add push_active_ingredient column",
    sql: `ALTER TABLE expiry_logs ADD COLUMN IF NOT EXISTS push_active_ingredient TEXT;`,
  },
  {
    name: "Add push_selling_points column",
    sql: `ALTER TABLE expiry_logs ADD COLUMN IF NOT EXISTS push_selling_points TEXT;`,
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
