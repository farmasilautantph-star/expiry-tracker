import "./_env";
import pool from "../lib/db-postgres";

/**
 * One-time correction for the add-stock regression.
 *
 * A previous version of POST /api/expiry/add-stock let staff add stock to an
 * item that had already been fully SOLD / COMPLETED (quantity 0, closed). It
 * bumped `quantity` back up but left `item_status = 'sold'/'completed'`, kept
 * the stale `original_qty`, and kept the "unit(s) sold" note lines — so the
 * restocked item wrongly stayed in the Sales Record tab (e.g. "Partial Sold,
 * 0 units sold, N remaining") instead of returning to Item Status.
 *
 * The tell-tale signature is a CLOSED item that still holds stock:
 *   item_status IN ('sold','completed') AND quantity > 0
 * (a legitimately sold/completed item always has quantity = 0).
 *
 * This script revives those rows to a clean ACTIVE state — exactly what the
 * fixed route now does — clearing all sale/completion tracking and stripping
 * historical "unit(s) sold" note lines. The full audit trail remains in
 * history_log. Rows with real, still-open sales are untouched.
 *
 * Pass --execute to apply; without it the script only previews affected rows.
 */

const EXECUTE = process.argv.includes("--execute");

const WHERE = `item_status IN ('sold','completed') AND quantity > 0`;

interface Row {
  id: number;
  barcode: string;
  description: string;
  quantity: number;
  original_qty: number | null;
  item_status: string;
  notes: string | null;
}

function cleanNotes(notes: string | null): string | null {
  const cleaned = (notes ?? "")
    .split("\n")
    .filter((line) => !/unit\(s\) sold/i.test(line))
    .join("\n")
    .trim();
  return cleaned || null;
}

async function run() {
  const client = await pool.connect();
  try {
    const preview = (
      await client.query(
        `SELECT id, barcode, description, quantity, original_qty, item_status, notes
         FROM expiry_logs
         WHERE ${WHERE}
         ORDER BY id`,
      )
    ).rows as unknown as Row[];

    if (preview.length === 0) {
      console.log("No closed-but-restocked rows found — nothing to correct.");
      return;
    }

    console.log(`Found ${preview.length} closed item(s) that were restocked (wrongly in Sales Record):\n`);
    for (const r of preview) {
      console.log(
        `  id=${r.id}  ${r.barcode}  "${r.description}"  ` +
          `qty=${r.quantity}  original_qty=${r.original_qty}  status=${r.item_status}`,
      );
    }

    if (!EXECUTE) {
      console.log("\n(dry run) Re-run with --execute to revive these rows to active Item Status.");
      return;
    }

    let updated = 0;
    for (const r of preview) {
      await client.query(
        `UPDATE expiry_logs
         SET item_status     = 'active',
             original_qty    = NULL,
             sold_at         = NULL,
             sold_by         = NULL,
             completed_via   = NULL,
             completed_at    = NULL,
             completed_notes = NULL,
             review_status   = 'pending',
             notes           = $1
         WHERE id = $2`,
        [cleanNotes(r.notes), r.id],
      );
      updated++;
    }
    console.log(`\n[OK] Revived ${updated} row(s) to active Item Status; removed from Sales Record.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Correction failed:", err);
  process.exit(1);
});
