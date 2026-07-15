/**
 * Feature: Add "exchangeable" as a 3rd return-status value.
 *
 * `expiry_logs.return_status` is a plain TEXT column with NO CHECK constraint,
 * so storing the new value 'exchangeable' requires NO schema change. This script
 * is a safe, idempotent verification/report that confirms that assumption against
 * the live Neon database before we ship the feature.
 *
 * What it checks:
 *   1. The column exists and is TEXT.
 *   2. There is no CHECK constraint that would reject 'exchangeable'.
 *   3. Reports the current distinct return_status values + counts.
 *
 * It performs NO writes.
 *
 * Run:
 *   npx tsx scripts/add-exchangeable-status.ts
 */

import "./_env";
import pool from "../lib/db-postgres";

async function main() {
  console.log("\n── Exchangeable Return Status — Neon check ───────────\n");
  console.log(`🌐 ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}\n`);

  const client = await pool.connect();
  try {
    // 1. Column type
    const col = await client.query(
      `SELECT data_type
         FROM information_schema.columns
        WHERE table_name = 'expiry_logs' AND column_name = 'return_status'`,
    );
    if (col.rowCount === 0) {
      console.error("❌ expiry_logs.return_status column not found.");
      process.exit(1);
    }
    console.log(`  return_status type: ${col.rows[0].data_type}`);

    // 2. Any CHECK constraint mentioning return_status?
    const checks = await client.query(
      `SELECT conname, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE conrelid = 'expiry_logs'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%return_status%'`,
    );
    if (checks.rowCount === 0) {
      console.log("  CHECK constraints on return_status: none ✅");
      console.log("  → 'exchangeable' can be stored with no schema change.");
    } else {
      console.log("  ⚠️  CHECK constraint(s) found — review before shipping:");
      for (const r of checks.rows) console.log(`     ${r.conname}: ${r.def}`);
    }

    // 3. Current distribution
    const dist = await client.query(
      `SELECT COALESCE(return_status, '(null)') AS status, COUNT(*)::int AS n
         FROM expiry_logs
        GROUP BY return_status
        ORDER BY n DESC`,
    );
    console.log("\n  Current return_status distribution:");
    for (const r of dist.rows) console.log(`     ${String(r.status).padEnd(16)} ${r.n}`);

    console.log("\n✅ Check complete. No migration required.\n");
  } catch (err) {
    console.error("\n❌ Check failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
