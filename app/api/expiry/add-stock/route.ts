import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryLogRow {
  id: number;
  barcode: string;
  description: string;
  category: string;
  expiry_date: string;
  pic_name: string;
  quantity: number;
  original_qty: number | null;
  notes: string | null;
  uom: string | null;
  item_status: string;
}

async function auth(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

export async function POST(req: NextRequest) {
  const user = await auth(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { existing_id, additional_qty, reason } = body ?? {};

  if (!reason || !String(reason).trim()) {
    return NextResponse.json(
      { success: false, error: "Reason is required" },
      { status: 400 },
    );
  }

  const addQty = Number(additional_qty);
  if (!Number.isInteger(addQty) || addQty < 1) {
    return NextResponse.json(
      { success: false, error: "additional_qty must be a whole number >= 1" },
      { status: 400 },
    );
  }

  if (!existing_id || !Number.isInteger(Number(existing_id))) {
    return NextResponse.json(
      { success: false, error: "existing_id is required" },
      { status: 400 },
    );
  }

  const entry = (
    await pool.query("SELECT * FROM expiry_logs WHERE id = $1", [Number(existing_id)])
  ).rows[0] as unknown as ExpiryLogRow | undefined;

  if (!entry) {
    return NextResponse.json(
      { success: false, error: "Entry not found" },
      { status: 404 },
    );
  }

  const previousQty = entry.quantity;
  const newQty = previousQty + addQty;
  const now = new Date().toISOString();
  const trimmedReason = String(reason).trim();

  const noteAppend = `[${fmtDate(now)}]: +${addQty} unit(s) added by ${user.picName}. Reason: ${trimmedReason}`;

  // A row shows up in the Sales Record tab when it looks like a sale, i.e. when
  // `original_qty IS NOT NULL`, `item_status = 'sold'`, or a note line contains
  // "unit(s) sold". Adding stock is NOT a sale, so it must never leave the item
  // in any of those states.
  const wasClosed =
    entry.item_status === "sold" ||
    entry.item_status === "completed" ||
    previousQty === 0;

  if (wasClosed) {
    // The item had been fully sold / completed and closed. Restocking it makes
    // it a fresh ACTIVE item again, so clear every sale/completion field and
    // drop the historical "unit(s) sold" note lines that would otherwise keep
    // it in Sales Record. The full sale history is preserved in history_log.
    const cleanedPriorNotes = (entry.notes ?? "")
      .split("\n")
      .filter((line) => !/unit\(s\) sold/i.test(line))
      .join("\n")
      .trim();
    const revivedNotes = cleanedPriorNotes ? `${cleanedPriorNotes}\n${noteAppend}` : noteAppend;

    await pool.query(
      `UPDATE expiry_logs
       SET quantity         = $1,
           original_qty     = NULL,
           item_status      = 'active',
           sold_at          = NULL,
           sold_by          = NULL,
           completed_via    = NULL,
           completed_at     = NULL,
           completed_notes  = NULL,
           review_status    = 'pending',
           last_updated_at  = $2,
           notes            = $3
       WHERE id = $4`,
      [newQty, now, revivedNotes, entry.id],
    );
  } else {
    // Active item. Only bump quantity. If the item is genuinely partially sold
    // (original_qty already set), bump original_qty by the same amount so the
    // Sales Record units_sold figure stays correct. Never SET original_qty from
    // null — that would wrongly list a pure stock addition as a sale.
    const updatedNotes = entry.notes ? `${entry.notes}\n${noteAppend}` : noteAppend;

    if (entry.original_qty !== null) {
      await pool.query(
        "UPDATE expiry_logs SET original_qty = $1 WHERE id = $2",
        [entry.original_qty + addQty, entry.id],
      );
    }

    await pool.query(
      `UPDATE expiry_logs
       SET quantity = $1, last_updated_at = $2, review_status = 'pending', notes = $3
       WHERE id = $4`,
      [newQty, now, updatedNotes, entry.id],
    );
  }

  const historyDesc =
    `+${addQty} unit(s) added to ${entry.description} ` +
    `(Expiry: ${fmtDate(entry.expiry_date)}). ` +
    `Reason: ${trimmedReason}. ` +
    `New total: ${newQty} units`;

  await pool.query(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    ["UPDATE", "expiry", entry.id, user.userId, user.picName, historyDesc, now],
  );

  const updatedEntry = (
    await pool.query("SELECT * FROM expiry_logs WHERE id = $1", [entry.id])
  ).rows[0];

  return NextResponse.json({
    success: true,
    data: {
      updated_entry: updatedEntry,
      previous_qty: previousQty,
      additional_qty: addQty,
      new_qty: newQty,
      reason: trimmedReason,
    },
  });
}
