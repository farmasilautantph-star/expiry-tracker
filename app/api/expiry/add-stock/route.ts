import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
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

  const db = getDb();
  const entry = db
    .prepare("SELECT * FROM expiry_logs WHERE id = ?")
    .get(Number(existing_id)) as unknown as ExpiryLogRow | undefined;

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
  const updatedNotes = entry.notes
    ? `${entry.notes}\n${noteAppend}`
    : noteAppend;

  if (entry.original_qty === null) {
    db.prepare(
      "UPDATE expiry_logs SET original_qty = ? WHERE id = ?",
    ).run(previousQty, entry.id);
  }

  db.prepare(
    `UPDATE expiry_logs
     SET quantity = ?, last_updated_at = ?, review_status = 'pending', notes = ?
     WHERE id = ?`,
  ).run(newQty, now, updatedNotes, entry.id);

  const historyDesc =
    `+${addQty} unit(s) added to ${entry.description} ` +
    `(Expiry: ${fmtDate(entry.expiry_date)}). ` +
    `Reason: ${trimmedReason}. ` +
    `New total: ${newQty} units`;

  db.prepare(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run("UPDATE", "expiry", entry.id, user.userId, user.picName, historyDesc, now);

  const updatedEntry = db
    .prepare("SELECT * FROM expiry_logs WHERE id = ?")
    .get(entry.id);

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
