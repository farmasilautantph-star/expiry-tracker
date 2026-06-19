import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryRow {
  id: number;
  pic_id: number;
  pic_name: string;
  description: string;
  quantity: number;
  original_qty: number | null;
  notes: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id))
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });

  let body: { units_sold?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const unitsSold = Number(body.units_sold);
  if (!Number.isInteger(unitsSold) || unitsSold < 1)
    return NextResponse.json(
      { success: false, error: "units_sold must be a positive integer" },
      { status: 400 },
    );

  const db = getDb();
  const existing = db
    .prepare("SELECT id, pic_id, pic_name, description, quantity, original_qty, notes FROM expiry_logs WHERE id = ?")
    .get(id) as unknown as ExpiryRow | undefined;

  if (!existing)
    return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });

  if (user.role !== "manager" && existing.pic_id !== user.userId)
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  if (unitsSold > existing.quantity)
    return NextResponse.json(
      {
        success: false,
        error: `Units sold cannot exceed available quantity of ${existing.quantity}`,
      },
      { status: 400 },
    );

  const now = new Date().toISOString();
  const [y, m, d] = now.split("T")[0].split("-");
  const dateLabel = `${d}/${m}/${y}`;

  const remaining = existing.quantity - unitsSold;
  const fullySold = remaining === 0;
  const capturedOriginalQty = existing.original_qty ?? existing.quantity;

  if (fullySold) {
    db.prepare(
      `UPDATE expiry_logs
       SET item_status    = 'sold',
           quantity       = 0,
           original_qty   = ?,
           sold_at        = ?,
           sold_by        = ?,
           completed_via  = 'sold',
           completed_at   = ?,
           completed_notes = ?,
           review_status  = 'resolved',
           last_updated_at = ?,
           last_reviewed_at = ?
       WHERE id = ?`,
    ).run(
      capturedOriginalQty,
      now,
      user.picName,
      now,
      `All ${capturedOriginalQty} unit(s) sold`,
      now,
      now,
      id,
    );

    db.prepare(
      `INSERT INTO history_log
         (action, module, record_id, pic_id, pic_name, description, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "UPDATE",
      "expiry",
      id,
      user.userId,
      user.picName,
      `All ${capturedOriginalQty} unit(s) fully sold by ${user.picName}`,
      now,
    );
  } else {
    const noteEntry = `[${dateLabel}]: ${unitsSold} unit(s) sold, ${remaining} remaining`;
    const existingNotes = (existing.notes ?? "").trim();
    const newNotes = existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry;

    db.prepare(
      `UPDATE expiry_logs
       SET quantity        = ?,
           original_qty    = ?,
           notes           = ?,
           last_updated_at = ?,
           last_reviewed_at = ?,
           review_status   = 'pending'
       WHERE id = ?`,
    ).run(remaining, capturedOriginalQty, newNotes, now, now, id);

    db.prepare(
      `INSERT INTO history_log
         (action, module, record_id, pic_id, pic_name, description, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "UPDATE",
      "expiry",
      id,
      user.userId,
      user.picName,
      `${unitsSold} unit(s) sold by ${user.picName}. Remaining: ${remaining} units`,
      now,
    );
  }

  const entry = db.prepare("SELECT * FROM expiry_logs WHERE id = ?").get(id);
  return NextResponse.json({ success: true, data: entry, fully_sold: fullySold, remaining });
}
