import "./_env";
import pool from "../lib/db-postgres";

async function main() {
  console.log("=== Offers schema ===");
  const schema = await pool.query(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_name = 'offers'
      ORDER BY ordinal_position`,
  );
  console.table(schema.rows);

  console.log("\n=== Orphan offers BEFORE delete ===");
  const before = await pool.query(
    `SELECT COUNT(*)::int AS cnt
       FROM offers o
       LEFT JOIN expiry_logs el ON o.expiry_log_id = el.id
      WHERE el.id IS NULL`,
  );
  console.log(`Orphan count: ${before.rows[0].cnt}`);

  const orphanRows = await pool.query(
    `SELECT o.id, o.expiry_log_id, o.description, o.outlet_name, o.offer_status, o.created_at
       FROM offers o
       LEFT JOIN expiry_logs el ON o.expiry_log_id = el.id
      WHERE el.id IS NULL
      ORDER BY o.id`,
  );
  if (orphanRows.rowCount && orphanRows.rowCount > 0) {
    console.log("Orphans to be deleted:");
    console.table(orphanRows.rows);
  }

  const del = await pool.query(
    `DELETE FROM offers
      WHERE expiry_log_id IS NULL
         OR expiry_log_id NOT IN (SELECT id FROM expiry_logs)`,
  );
  console.log(`\nDeleted ${del.rowCount} orphan offer(s).`);

  console.log("\n=== Verification AFTER delete ===");
  const after = await pool.query(
    `SELECT COUNT(*)::int AS cnt
       FROM offers o
       LEFT JOIN expiry_logs el ON o.expiry_log_id = el.id
      WHERE el.id IS NULL`,
  );
  console.log(`Orphan count: ${after.rows[0].cnt}`);
  if (after.rows[0].cnt !== 0) {
    console.error("FAIL: orphans still present");
    process.exit(1);
  }
  console.log("OK: zero orphans remaining.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
