/**
 * Standardise categories in expiry_logs AND products to the official list.
 *
 * Usage:
 *   npx tsx scripts/standardise-categories-neon.ts            # dry-run (default)
 *   npx tsx scripts/standardise-categories-neon.ts --execute  # live update
 */

import "./_env";
import pool from "../lib/db-postgres";

const EXECUTE = process.argv.includes("--execute");

const CATEGORY_MAP: Record<string, string> = {
  // Poison medicines
  "Poison A":             "POISON A MEDICINE",
  "Poison B":             "POISON B MEDICINE",
  "Poison C":             "POISON C MEDICINE",
  "POISON B":             "POISON B MEDICINE",
  "POISON C":             "POISON C MEDICINE",
  // OTC
  "OTC":                  "OTC MEDICINE",
  // Food & Beverage
  "F&B":                  "FOOD AND BEVERAGE",
  "F & B":                "FOOD AND BEVERAGE",
  "FOOD & BEVERAGE":      "FOOD AND BEVERAGE",
  // Food Supplement
  "FS":                   "FOOD SUPPLEMENT",
  "Food Supplement":      "FOOD SUPPLEMENT",
  // Health Supplement
  "HS":                   "HEALTH SUPPLEMENT",
  "Health Supplement":    "HEALTH SUPPLEMENT",
  // Mom and Baby
  "MOM & BABY":           "MOM AND BABY",
  "Mom & Baby":           "MOM AND BABY",
  "Mom and Baby":         "MOM AND BABY",
  // Traditional Medicine
  "Traditional":          "TRADITIONAL MEDICINE",
  "Traditional Medicine": "TRADITIONAL MEDICINE",
  // Medical Device
  "MD":                   "MEDICAL DEVICE",
  "Medical Device":       "MEDICAL DEVICE",
  // Personal Care
  "PC":                   "PERSONAL CARE",
  "Personal Care":        "PERSONAL CARE",
  // Household
  "HH":                   "HOUSEHOLD PRODUCT",
  "Household":            "HOUSEHOLD PRODUCT",
};

const OFFICIAL = new Set([
  "ACCOUNTING", "CLAIM SUPPLIER", "FOOD AND BEVERAGE", "FOOD SUPPLEMENT",
  "GENERAL EXPENSES", "HEALTH SUPPLEMENT", "HOUSEHOLD PRODUCT",
  "INHOUSE SERVICES", "INTERNAL PM", "MARKETING COST", "MARKETPLACE FEE",
  "MEDICAL DEVICE", "MOM AND BABY", "NA", "OTC MEDICINE", "PERSONAL CARE",
  "PET CARE", "POISON B MEDICINE", "POISON C MEDICINE", "PREMIUMS",
  "REHAB", "TRADITIONAL MEDICINE", "POISON A MEDICINE",
]);

function resolve(raw: string | null): string | null {
  if (raw === null) return null;
  if (OFFICIAL.has(raw)) return null;          // already correct — no change needed
  if (CATEGORY_MAP[raw]) return CATEGORY_MAP[raw];
  return "NA";                                 // unknown category
}

async function main() {
  console.log("\n── Standardise Categories (Neon) ─────────────────────\n");
  console.log(`Mode: ${EXECUTE ? "EXECUTE (live update)" : "DRY-RUN (no changes)"}`);
  console.log(`🌐 Connecting to: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}\n`);

  const client = await pool.connect();
  try {
    // ── Step 1: Show all distinct categories in both tables ──
    console.log("── Current categories ────────────────────────────────\n");
    const current = await client.query<{ source: string; category: string; count: number }>(`
      SELECT 'expiry_logs' AS source, category, COUNT(*)::int AS count
        FROM expiry_logs GROUP BY category
      UNION ALL
      SELECT 'products' AS source, category_id AS category, COUNT(*)::int AS count
        FROM products GROUP BY category_id
      ORDER BY source, count DESC
    `);

    let lastSource = "";
    for (const row of current.rows) {
      if (row.source !== lastSource) {
        console.log(`\n[${row.source}]`);
        console.log(`${"category".padEnd(35)} count`);
        console.log("─".repeat(45));
        lastSource = row.source;
      }
      const mapped = resolve(row.category);
      const flag = mapped ? ` → ${mapped}` : " ✓";
      console.log(`${(row.category ?? "(null)").padEnd(35)} ${row.count}${flag}`);
    }
    console.log();

    // ── Step 2: Build per-value update plan for expiry_logs ──
    const elDistinct = await client.query<{ category: string; count: number }>(`
      SELECT category, COUNT(*)::int AS count
      FROM expiry_logs
      GROUP BY category
    `);

    const elChanges = elDistinct.rows
      .map(r => ({ old: r.category, new: resolve(r.category), count: r.count }))
      .filter(r => r.new !== null) as { old: string; new: string; count: number }[];

    const elTotal = elChanges.reduce((s, r) => s + r.count, 0);

    // ── Step 3: Build per-value update plan for products ──────
    const prDistinct = await client.query<{ category_id: string; count: number }>(`
      SELECT category_id, COUNT(*)::int AS count
      FROM products
      GROUP BY category_id
    `);

    const prChanges = prDistinct.rows
      .map(r => ({ old: r.category_id, new: resolve(r.category_id), count: r.count }))
      .filter(r => r.new !== null) as { old: string; new: string; count: number }[];

    const prTotal = prChanges.reduce((s, r) => s + r.count, 0);

    console.log("── Change summary ────────────────────────────────────\n");
    console.log(`expiry_logs  rows to change: ${elTotal}`);
    for (const c of elChanges) {
      console.log(`  "${c.old}" → "${c.new}"  (${c.count} rows)`);
    }
    console.log();
    console.log(`products     rows to change: ${prTotal}`);
    for (const c of prChanges) {
      console.log(`  "${c.old}" → "${c.new}"  (${c.count} rows)`);
    }
    console.log();

    if (elTotal === 0 && prTotal === 0) {
      console.log("✅ Nothing to update — all categories already official.\n");
      return;
    }

    if (!EXECUTE) {
      console.log("DRY-RUN complete. Run with --execute to apply changes.\n");
      return;
    }

    // ── Step 4: Apply changes ─────────────────────────────────
    console.log("Applying updates…\n");

    for (const c of elChanges) {
      const r = await client.query(
        "UPDATE expiry_logs SET category = $1 WHERE category = $2",
        [c.new, c.old],
      );
      console.log(`  expiry_logs: "${c.old}" → "${c.new}"  (${r.rowCount} rows)`);
    }

    for (const c of prChanges) {
      const r = await client.query(
        "UPDATE products SET category_id = $1 WHERE category_id = $2",
        [c.new, c.old],
      );
      console.log(`  products:    "${c.old}" → "${c.new}"  (${r.rowCount} rows)`);
    }

    // ── Step 5: Final verification ────────────────────────────
    console.log("\n── Final verification (expiry_logs) ──────────────────\n");
    const final = await client.query<{ category: string; count: number }>(`
      SELECT category, COUNT(*)::int AS count
      FROM expiry_logs
      GROUP BY category
      ORDER BY count DESC
    `);

    let allOfficial = true;
    console.log(`${"category".padEnd(35)} count  official?`);
    console.log("─".repeat(55));
    for (const row of final.rows) {
      const ok = OFFICIAL.has(row.category);
      if (!ok) allOfficial = false;
      console.log(`${(row.category ?? "(null)").padEnd(35)} ${String(row.count).padEnd(6)} ${ok ? "✓" : "✗ NOT IN LIST"}`);
    }
    console.log();
    if (allOfficial) {
      console.log("✅ All categories in expiry_logs are now from the official list.\n");
    } else {
      console.log("⚠️  Some categories are still not in the official list — check above.\n");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err);
  process.exit(1);
});
