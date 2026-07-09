import "./_env";
import pool from "../lib/db-postgres";

/**
 * One-time repair for items where a return was recorded (return_status =
 * 'returned' or 'not_approved') but item_status never flipped to
 * 'completed' — leaving them stuck in the Item Status Active list.
 * Brings them in line with the normal return-completion logic in
 * app/api/returns/[id]/status/route.ts.
 */
async function run() {
  const client = await pool.connect();
  try {
    const stuck = await client.query(
      `SELECT id, description, return_status, item_status
       FROM expiry_logs
       WHERE return_status IN ('returned', 'not_approved') AND item_status != 'completed'`,
    );

    if (stuck.rows.length === 0) {
      console.log("No stuck return items found — nothing to fix.");
      return;
    }

    console.log(`Found ${stuck.rows.length} stuck item(s):`);
    console.table(stuck.rows);

    const now = new Date().toISOString();
    const result = await client.query(
      `UPDATE expiry_logs
       SET item_status = 'completed',
           completed_via = return_status,
           completed_at = COALESCE(completed_at, $1),
           review_status = 'resolved',
           last_reviewed_at = COALESCE(last_reviewed_at, $1),
           last_updated_at = $1
       WHERE return_status IN ('returned', 'not_approved') AND item_status != 'completed'`,
      [now],
    );

    console.log(`\n[OK] Repaired ${result.rowCount} item(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Repair failed:", err);
  process.exit(1);
});
