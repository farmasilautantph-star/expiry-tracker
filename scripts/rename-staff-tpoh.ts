/**
 * One-time fix: rename existing staff pic_name to the "TPOH <Name>" format
 * used by the POS export, and save each account's IC number (confirmed
 * from the August 2026 POS report) so future monthly-sales uploads auto-
 * match without needing to re-map in the upload modal.
 *
 * Usage:
 *   npx tsx scripts/rename-staff-tpoh.ts            # dry-run (default)
 *   npx tsx scripts/rename-staff-tpoh.ts --execute   # live update
 */

import "./_env";
import pool from "../lib/db-postgres";

const EXECUTE = process.argv.includes("--execute");

// Matched from users.pic_name (current) -> POS "Salesman ID" (IC number),
// confirmed against migrate/csv/Monthly_sales_expiry.xlsx this session.
const MAPPING: { current_pic_name: string; new_pic_name: string; ic_number: string }[] = [
  { current_pic_name: "AINA",    new_pic_name: "TPOH AINA",    ic_number: "911031115394" },
  { current_pic_name: "NADIAH",  new_pic_name: "TPOH NADIAH",  ic_number: "960814115754" },
  { current_pic_name: "NAJIHAH", new_pic_name: "TPOH NAJIHAH", ic_number: "951026115572" },
  { current_pic_name: "NURAINI", new_pic_name: "TPOH NURAINI", ic_number: "990511115148" },
  { current_pic_name: "AIZAT",   new_pic_name: "TPOH AIZAT",   ic_number: "990426115055" },
];

async function main() {
  console.log(`\n── Rename staff to TPOH format ───────────────────────\n`);
  console.log(`Mode: ${EXECUTE ? "EXECUTE (live update)" : "DRY-RUN (no changes)"}\n`);

  const client = await pool.connect();
  try {
    for (const m of MAPPING) {
      const existing = (
        await client.query(`SELECT id, pic_name, ic_number FROM users WHERE pic_name = $1`, [m.current_pic_name])
      ).rows[0];

      if (!existing) {
        console.log(`  ⚠ No user found with pic_name = "${m.current_pic_name}" — skipping`);
        continue;
      }

      console.log(
        `  ${existing.pic_name.padEnd(10)} -> ${m.new_pic_name.padEnd(14)}  ic_number: ${existing.ic_number ?? "(none)"} -> ${m.ic_number}`,
      );

      if (EXECUTE) {
        await client.query(`UPDATE users SET pic_name = $1, ic_number = $2 WHERE id = $3`, [
          m.new_pic_name,
          m.ic_number,
          existing.id,
        ]);
      }
    }

    console.log(EXECUTE ? "\n✅ Updated.\n" : "\nDRY-RUN complete. Run with --execute to apply.\n");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err);
  process.exit(1);
});
