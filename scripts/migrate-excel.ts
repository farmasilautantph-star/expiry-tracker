/**
 * Phase 11 — Import historical data from EXPIRY_TRACKER_1.xlsx into expiry_logs.
 *
 * Usage:
 *   npm run migrate:excel              # live run
 *   npm run migrate:excel -- --dry-run # preview only
 */

import * as XLSX from "xlsx";
import { DatabaseSync } from "node:sqlite";
import * as fs from "fs";
import * as path from "path";

// ── Config ────────────────────────────────────────────────────────────────────

const EXCEL_PATH = path.join(process.cwd(), "migrate", "csv", "EXPIRY TRACKER_1.xlsx");
const DB_PATH    = path.join(process.cwd(), "db", "expiry-tracker.db");
const REPORT_DIR = path.join(process.cwd(), "migrate", "reports");
const isDryRun   = process.argv.includes("--dry-run");

// ── Date helpers ──────────────────────────────────────────────────────────────

function excelDateToISO(serial: unknown): string {
  if (!serial || typeof serial !== "number" || isNaN(serial)) return "";
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split("T")[0];
}

// ── Status mappers ────────────────────────────────────────────────────────────

function mapItemStatus(status: unknown): string {
  switch ((status as string)?.trim()) {
    case "Sold":        return "sold";
    case "Returned":    return "completed";
    case "Transferred": return "completed";
    case "Active":      return "active";
    default:            return "active";
  }
}

function mapReturnStatus(policy: unknown, status: unknown): string {
  if ((policy as string)?.trim() === "Returnable") {
    if ((status as string)?.trim() === "Returned") return "returned";
    return "pending";
  }
  return "non-returnable";
}

function mapCompletedVia(status: unknown): string | null {
  switch ((status as string)?.trim()) {
    case "Sold":        return "sold";
    case "Returned":    return "returned";
    case "Transferred": return "offer_received";
    default:            return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface SkippedRow {
  reason: string;
  row: string;
}

function main() {
  console.log(`\n── Excel Migration ${isDryRun ? "(DRY RUN) " : ""}─────────────────────────────\n`);

  // Load workbook
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ File not found: ${EXCEL_PATH}`);
    process.exit(1);
  }
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet    = workbook.Sheets["EXPIRY_TRACKER"];
  if (!sheet) {
    console.error("❌ Sheet 'EXPIRY_TRACKER' not found in workbook.");
    process.exit(1);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
  console.log(`📄 Loaded ${rows.length} rows from Excel\n`);

  // Open DB
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  // Build PIC → user_id lookup from users table
  interface UserRow { id: number; pic_name: string }
  const userRows = db.prepare("SELECT id, pic_name FROM users").all() as unknown as UserRow[];
  const picToUserId = new Map<string, number>(
    userRows.map((u) => [u.pic_name.toUpperCase().trim(), u.id])
  );

  console.log("👥 Users in DB:", Array.from(picToUserId.keys()).join(", "));

  // Prepare INSERT statement
  const insertStmt = db.prepare(`
    INSERT INTO expiry_logs (
      barcode, description, uom,
      category, pic_id, pic_name,
      logged_at, expiry_date,
      quantity, original_qty,
      return_status, return_by_date,
      return_notes,
      item_status, completed_via,
      completed_at,
      notes,
      review_status,
      last_reviewed_at
    ) VALUES (
      ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?,
      ?, ?,
      ?,
      ?,
      ?,
      ?
    )
  `);

  let imported = 0;
  const skipped: SkippedRow[] = [];

  for (const row of rows) {
    const rowLabel = (row["Description"] as string | undefined)?.trim() || row["ID"] || "(unknown)";

    // ── Validate required fields ──────────────────────────────────────────────

    const picName = (row["PIC"] as string | undefined)?.trim()?.toUpperCase();
    if (!picName) {
      skipped.push({ reason: "No PIC", row: rowLabel });
      continue;
    }

    const description = (row["Description"] as string | undefined)?.trim();
    if (!description) {
      skipped.push({ reason: "No Description", row: rowLabel });
      continue;
    }

    const userId = picToUserId.get(picName);
    if (!userId) {
      skipped.push({ reason: `PIC not found: ${picName}`, row: rowLabel });
      continue;
    }

    // ── Convert fields ────────────────────────────────────────────────────────

    const loggedAt    = excelDateToISO(row["Date Logged"]);
    const expiryDate  = excelDateToISO(row["Expiry Date"]);
    const returnByDate = row["Return By Month"] ? excelDateToISO(row["Return By Month"]) : null;

    if (!loggedAt || !expiryDate) {
      skipped.push({ reason: "Invalid date (logged_at or expiry_date)", row: rowLabel });
      continue;
    }

    const itemStatus   = mapItemStatus(row["Status"]);
    const returnStatus = mapReturnStatus(row["Return Policy"], row["Status"]);
    const completedVia = mapCompletedVia(row["Status"]);

    const barcode    = (row["Barcode"] as string | undefined)?.toString().trim() || "";
    const uom        = (row["UOM"] as string | undefined)?.trim() || null;
    const category   = (row["Category"] as string | undefined)?.trim() || "";
    const quantity   = Number(row["Current Qty"]) || 0;
    const originalQty = Number(row["Starting Qty"]) || 0;
    const returnNotes = (row["Return Remark"] as string | undefined)?.trim() || null;
    const notes      = (row["Outlet Notes"] as string | undefined)?.trim() || null;
    const reviewStatus = itemStatus === "active" ? "needs_review" : "resolved";

    if (isDryRun) {
      console.log(`  [DRY RUN] Would insert: "${description}" | ${picName} | ${loggedAt} | ${expiryDate} | ${itemStatus}`);
      imported++;
      continue;
    }

    try {
      insertStmt.run(
        barcode,
        description,
        uom,
        category,
        userId,
        picName,
        loggedAt,
        expiryDate,
        quantity,
        originalQty,
        returnStatus,
        returnByDate,
        returnNotes,
        itemStatus,
        completedVia,
        completedVia ? loggedAt : null,
        notes,
        reviewStatus,
        null  // last_reviewed_at
      );
      imported++;
    } catch (err) {
      skipped.push({ reason: `DB error: ${(err as Error).message}`, row: rowLabel });
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────

  console.log(`\n──────────────────────────────────────────────────\n`);
  console.log(`Migration ${isDryRun ? "Preview" : "Complete"}:`);
  console.log(`✅ ${isDryRun ? "Would import" : "Imported"}: ${imported} rows`);
  console.log(`⏭️  Skipped: ${skipped.length} rows`);

  if (skipped.length > 0) {
    console.log("\nSkipped rows:");
    skipped.forEach((s) => console.log(`  - "${s.row}": ${s.reason}`));
  }

  if (!isDryRun) {
    const finalCount = (db.prepare("SELECT COUNT(*) as cnt FROM expiry_logs").get() as { cnt: number }).cnt;
    console.log(`\n📊 Total rows in expiry_logs now: ${finalCount}`);

    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
    const report = {
      timestamp: new Date().toISOString(),
      imported,
      skipped: skipped.length,
      skippedDetails: skipped,
    };
    const reportPath = path.join(REPORT_DIR, "migration-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📝 Report written to ${reportPath}`);
  }

  console.log();
}

main();
