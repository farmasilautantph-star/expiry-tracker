import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryRow {
  id: number;
  pic_id: number;
  pic_name: string;
  description: string;
  quantity: number;
  original_qty: number | null;
  notes: string | null;
  is_locked: boolean;
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

  const existing = (await pool.query(
    "SELECT id, pic_id, pic_name, description, quantity, original_qty, notes, is_locked FROM expiry_logs WHERE id = $1",
    [id],
  )).rows[0] as unknown as ExpiryRow | undefined;

  if (!existing)
    return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });

  if (user.role !== "manager" && existing.pic_id !== user.userId)
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  // Locked items are near-expiry and pulled from the sellable shelf — selling to
  // a customer is the specific risk this feature prevents. Enforce server-side
  // regardless of the client state. Managers may override and sell directly;
  // staff must ask a manager to unlock or sell it.
  if (existing.is_locked && user.role !== "manager")
    return NextResponse.json(
      {
        success: false,
        error: "Item is locked (near expiry) — sale is blocked. Remove it from the shelf, or ask a manager to sell it.",
      },
      { status: 403 },
    );

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
    await pool.query(
      `UPDATE expiry_logs
       SET item_status    = 'sold',
           quantity       = 0,
           original_qty   = $1,
           sold_at        = $2,
           sold_by        = $3,
           completed_via  = 'sold',
           completed_at   = $4,
           completed_notes = $5,
           review_status  = 'resolved',
           last_updated_at = $6,
           last_reviewed_at = $7,
           is_push_item        = FALSE,
           push_item_marked_at = NULL,
           push_item_marked_by = NULL,
           is_locked           = FALSE,
           locked_at           = NULL
       WHERE id = $8`,
      [
        capturedOriginalQty,
        now,
        user.picName,
        now,
        `All ${capturedOriginalQty} unit(s) sold`,
        now,
        now,
        id,
      ],
    );

    await pool.query(
      `INSERT INTO history_log
         (action, module, record_id, pic_id, pic_name, description, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "UPDATE",
        "expiry",
        id,
        user.userId,
        user.picName,
        `All ${capturedOriginalQty} unit(s) fully sold by ${user.picName}`,
        now,
      ],
    );
  } else {
    const noteEntry = `[${dateLabel}]: ${unitsSold} unit(s) sold, ${remaining} remaining`;
    const existingNotes = (existing.notes ?? "").trim();
    const newNotes = existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry;

    await pool.query(
      `UPDATE expiry_logs
       SET quantity        = $1,
           original_qty    = $2,
           notes           = $3,
           last_updated_at = $4,
           last_reviewed_at = $5,
           review_status   = 'pending',
           sold_by         = $6
       WHERE id = $7`,
      [remaining, capturedOriginalQty, newNotes, now, now, user.picName, id],
    );

    await pool.query(
      `INSERT INTO history_log
         (action, module, record_id, pic_id, pic_name, description, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "UPDATE",
        "expiry",
        id,
        user.userId,
        user.picName,
        `${unitsSold} unit(s) sold by ${user.picName}. Remaining: ${remaining} units`,
        now,
      ],
    );
  }

  const entry = (await pool.query("SELECT * FROM expiry_logs WHERE id = $1", [id])).rows[0];
  return NextResponse.json({ success: true, data: entry, fully_sold: fullySold, remaining });
}
