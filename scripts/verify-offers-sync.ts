import "./_env";
import pool from "../lib/db-postgres";

async function main() {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS cnt
       FROM offers o
       LEFT JOIN expiry_logs el ON o.expiry_log_id = el.id
      WHERE el.id IS NULL`,
  );
  console.log(`Orphan offers: ${r.rows[0].cnt}`);
  if (r.rows[0].cnt !== 0) {
    console.error("FAIL");
    process.exit(1);
  }
  console.log("OK — Outlet Offers is 100% synced with Expiry Monitor.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
