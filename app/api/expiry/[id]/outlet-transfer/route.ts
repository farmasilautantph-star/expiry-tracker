import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryRow {
  id: number;
  pic_id: number;
  description: string;
  barcode: string;
  category: string;
  uom: string | null;
  quantity: number;
  original_qty: number | null;
  expiry_date: string;
  stock_id: string | null;
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

  let body: { outlet_name?: unknown; qty_transferred?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const outlet_name = String(body.outlet_name ?? "").trim();
  if (!outlet_name)
    return NextResponse.json({ success: false, error: "Outlet name is required" }, { status: 400 });

  const qty_transferred = Number(body.qty_transferred);
  if (!Number.isInteger(qty_transferred) || qty_transferred < 1)
    return NextResponse.json(
      { success: false, error: "qty_transferred must be a positive integer" },
      { status: 400 },
    );

  const existing = (
    await pool.query(
      "SELECT id, pic_id, description, barcode, category, uom, quantity, original_qty, expiry_date, stock_id FROM expiry_logs WHERE id = $1",
      [id],
    )
  ).rows[0] as unknown as ExpiryRow | undefined;

  if (!existing)
    return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });

  if (qty_transferred > existing.quantity)
    return NextResponse.json(
      { success: false, error: `Cannot transfer more than available quantity (${existing.quantity})` },
      { status: 400 },
    );

  const now = new Date().toISOString();
  const new_qty = existing.quantity - qty_transferred;
  const fullyClosed = new_qty === 0;
  const capturedOriginalQty = existing.original_qty ?? existing.quantity;

  if (fullyClosed) {
    await pool.query(
      `UPDATE expiry_logs
       SET quantity       = 0,
           original_qty   = $1,
           item_status    = 'completed',
           completed_via  = 'offer_received',
           completed_at   = $2,
           review_status  = 'resolved',
           last_updated_at = $3
       WHERE id = $4`,
      [capturedOriginalQty, now, now, id],
    );
  } else {
    await pool.query(
      `UPDATE expiry_logs
       SET quantity        = $1,
           original_qty    = $2,
           last_updated_at = $3
       WHERE id = $4`,
      [new_qty, capturedOriginalQty, now, id],
    );
  }

  await pool.query(
    `INSERT INTO offers
       (expiry_log_id, description, barcode, category, uom, quantity, outlet_name,
        offer_status, notes, created_at, created_by, received_at, expiry_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'accepted', $8, $9, $10, $11, $12)`,
    [
      id,
      existing.description,
      existing.barcode,
      existing.category,
      existing.uom ?? null,
      qty_transferred,
      outlet_name,
      "Direct outlet transfer (staff request)",
      now,
      user.userId,
      now,
      existing.expiry_date,
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
      `Outlet transfer: ${qty_transferred} unit(s) of ${existing.description} sent to ${outlet_name} by ${user.picName}`,
      now,
    ],
  );

  return NextResponse.json({
    success: true,
    new_qty,
    outlet_name,
    qty_transferred,
    fully_closed: fullyClosed,
  });
}
