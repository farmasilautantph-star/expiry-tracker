/**
 * Backfill expiry_logs.category from products.category_id where they differ.
 *
 * Usage:
 *   npx tsx scripts/fix-categories-neon.ts            # dry-run (default)
 *   npx tsx scripts/fix-categories-neon.ts --execute  # live update
 */

import "./_env";
import pool from "../lib/db-postgres";

const EXECUTE = process.argv.includes("--execute");

async function main() {
  console.log("\n── Fix: expiry_logs.category ─────────────────────────\n");
  console.log(`Mode: ${EXECUTE ? "EXECUTE (live update)" : "DRY-RUN (no changes)"}`);
  console.log(`\n🌐 Connecting to: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}\n`);

  const client = await pool.connect();
  try {
    // ── Step 1: Mismatch analysis ──────────────────────────
    console.log("── Mismatch Analysis ─────────────────────────────────\n");

    const mismatchQuery = await client.query(`
      SELECT
        el.category  AS old_category,
        p.category_id AS correct_category,
        COUNT(*)::int AS count
      FROM expiry_logs el
      LEFT JOIN products p ON el.barcode = p.barcode
      WHERE el.category != p.category_id
         OR (el.category IS NOT NULL AND p.category_id IS NULL)
      GROUP BY el.category, p.category_id
      ORDER BY count DESC
    `);

    if (mismatchQuery.rows.length === 0) {
      console.log("✅ No mismatches found — all categories are already correct.\n");
    } else {
      console.log("Mismatched categories:");
      console.log(
        `${"old_category".padEnd(30)} ${"correct_category".padEnd(30)} count`
      );
      console.log("─".repeat(70));
      for (const row of mismatchQuery.rows) {
        const old = (row.old_category ?? "(null)").padEnd(30);
        const correct = (row.correct_category ?? "(no match in products)").padEnd(30);
        console.log(`${old} ${correct} ${row.count}`);
      }
      console.log();
    }

    // ── Step 2: Count rows to be updated ──────────────────
    const countResult = await client.query(`
      SELECT COUNT(*)::int AS total
      FROM expiry_logs el
      JOIN products p ON el.barcode = p.barcode
      WHERE el.category != p.category_id
    `);
    const totalToUpdate: number = countResult.rows[0].total;

    // Count rows skipped (barcode not in products)
    const skippedResult = await client.query(`
      SELECT COUNT(*)::int AS total
      FROM expiry_logs el
      LEFT JOIN products p ON el.barcode = p.barcode
      WHERE p.barcode IS NULL
    `);
    const totalSkipped: number = skippedResult.rows[0].total;

    console.log(`Rows to be updated : ${totalToUpdate}`);
    console.log(`Rows to be skipped : ${totalSkipped} (barcode not in products — category kept as-is)\n`);

    if (totalToUpdate === 0) {
      console.log("✅ Nothing to update.\n");
      return;
    }

    // ── Step 3: Sample before/after ───────────────────────
    const sampleResult = await client.query(`
      SELECT el.id, el.barcode, el.description,
             el.category AS old_category,
             p.category_id AS new_category
      FROM expiry_logs el
      JOIN products p ON el.barcode = p.barcode
      WHERE el.category != p.category_id
      ORDER BY el.id
      LIMIT 5
    `);

    console.log("Sample before/after (first 5 rows):");
    console.log(
      `${"id".padEnd(6)} ${"barcode".padEnd(14)} ${"old_category".padEnd(30)} new_category`
    );
    console.log("─".repeat(80));
    for (const row of sampleResult.rows) {
      console.log(
        `${String(row.id).padEnd(6)} ${String(row.barcode ?? "").padEnd(14)} ${String(row.old_category).padEnd(30)} ${row.new_category}`
      );
    }
    console.log();

    // ── Step 4: Execute or dry-run ─────────────────────────
    if (!EXECUTE) {
      console.log("DRY-RUN complete. Run with --execute to apply changes.\n");
      return;
    }

    console.log("Applying updates…");
    const updateResult = await client.query(`
      UPDATE expiry_logs el
      SET category = p.category_id
      FROM products p
      WHERE el.barcode = p.barcode
        AND el.category != p.category_id
    `);

    console.log(`\n✅ Done.`);
    console.log(`   Rows updated : ${updateResult.rowCount}`);
    console.log(`   Rows skipped : ${totalSkipped} (barcode not in products)\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err);
  process.exit(1);
});
