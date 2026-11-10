/**
 * One-time fix: rename-staff-tpoh.ts updated users.pic_name from "AINA" to
 * "TPOH AINA" (etc), but expiry_logs, returns, and history_log each keep
 * their own denormalized pic_name snapshot copied in at the time of the
 * action — those were never updated, which is why staff showed up twice
 * (once under the old name, once under the new) in staff-facing reports.
 *
 * This backfills those historical snapshots to the current name, using the
 * exact same mapping as rename-staff-tpoh.ts.
 *
 * Usage:
 *   npx tsx scripts/backfill-pic-name-tpoh.ts            # dry-run (default)
 *   npx tsx scripts/backfill-pic-name-tpoh.ts --execute   # live update
 */

import "./_env";
import pool from "../lib/db-postgres";

const EXECUTE = process.argv.includes("--execute");

const MAPPING: { old_pic_name: string; new_pic_name: string }[] = [
  { old_pic_name: "AINA", new_pic_name: "TPOH AINA" },
  { old_pic_name: "NADIAH", new_pic_name: "TPOH NADIAH" },
  { old_pic_name: "NAJIHAH", new_pic_name: "TPOH NAJIHAH" },
  { old_pic_name: "NURAINI", new_pic_name: "TPOH NURAINI" },
  { old_pic_name: "AIZAT", new_pic_name: "TPOH AIZAT" },
];

const TABLES = ["expiry_logs", "returns", "history_log"];

async function main() {
  console.log(`\n── Backfill historical pic_name snapshots ────────────\n`);
  console.log(`Mode: ${EXECUTE ? "EXECUTE (live update)" : "DRY-RUN (no changes)"}\n`);

  const client = await pool.connect();
  try {
    for (const table of TABLES) {
      console.log(`${table}:`);
      for (const m of MAPPING) {
        const { rows } = await client.query(
          `SELECT COUNT(*) AS cnt FROM ${table} WHERE pic_name = $1`,
          [m.old_pic_name],
        );
        const count = Number(rows[0].cnt);

        if (count === 0) {
          console.log(`  ${m.old_pic_name.padEnd(10)} -> ${m.new_pic_name.padEnd(14)}  0 rows — skipping`);
          continue;
        }

        console.log(`  ${m.old_pic_name.padEnd(10)} -> ${m.new_pic_name.padEnd(14)}  ${count} row(s)`);

        if (EXECUTE) {
          await client.query(
            `UPDATE ${table} SET pic_name = $1 WHERE pic_name = $2`,
            [m.new_pic_name, m.old_pic_name],
          );
        }
      }
      console.log("");
    }

    console.log(EXECUTE ? "✅ Updated.\n" : "DRY-RUN complete. Run with --execute to apply.\n");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err);
  process.exit(1);
});
