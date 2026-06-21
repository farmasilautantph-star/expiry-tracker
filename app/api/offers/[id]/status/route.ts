import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface OfferRow {
  id: number;
  expiry_log_id: number | null;
  description: string;
  offer_status: string;
  outlet_name: string;
  quantity: number;
}

interface ExpiryLogQty {
  quantity: number;
}

interface ExpiryLogPic {
  pic_id: number;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // --- Auth ---
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // --- Validate route param ---
  const id = parseInt(params.id, 10);
  if (isNaN(id))
    return NextResponse.json(
      { success: false, error: "Invalid ID" },
      { status: 400 },
    );

  const db = getDb();

  // --- Fetch offer ---
  const offer = db
    .prepare(
      `SELECT id, expiry_log_id, description, offer_status, outlet_name, quantity
       FROM offers WHERE id = ?`,
    )
    .get(id) as OfferRow | undefined;

  if (!offer)
    return NextResponse.json(
      { success: false, error: "Offer not found" },
      { status: 404 },
    );

  // --- Staff authorization ---
  if (user.role !== "manager") {
    // Staff cannot act on manually-created offers (no expiry_log_id)
    if (offer.expiry_log_id === null) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const logPic = db
      .prepare(
        `SELECT el.pic_id FROM offers o
         JOIN expiry_logs el ON el.id = o.expiry_log_id
         WHERE o.id = ?`,
      )
      .get(id) as ExpiryLogPic | undefined;

    if (!logPic || logPic.pic_id !== user.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }
  }

  // --- Guard: must still be 'offered' ---
  if (offer.offer_status !== "offered")
    return NextResponse.json(
      { success: false, error: "Offer is no longer active" },
      { status: 400 },
    );

  // --- Parse body ---
  const body = (await req.json().catch(() => null)) ?? {};
  const { offer_status, received_at, rejection_notes } = body as {
    offer_status: string;
    received_at?: string;
    rejection_notes?: string;
  };

  if (!["accepted", "rejected"].includes(offer_status))
    return NextResponse.json(
      { success: false, error: "Invalid offer_status" },
      { status: 400 },
    );

  const now = new Date().toISOString();

  // ----------------------------------------------------------------
  // ACCEPTED
  // ----------------------------------------------------------------
  if (offer_status === "accepted") {
    const at = received_at ?? now;

    let current_qty = 0;
    let new_qty = 0;

    if (offer.expiry_log_id !== null) {
      // Step 2: get current qty
      const logRow = db
        .prepare(`SELECT quantity FROM expiry_logs WHERE id = ?`)
        .get(offer.expiry_log_id) as ExpiryLogQty | undefined;

      current_qty = logRow?.quantity ?? 0;

      // Step 3: calculate new qty
      new_qty = current_qty - offer.quantity;

      // Step 4a / 4b: update expiry_logs
      if (new_qty <= 0) {
        db.prepare(
          `UPDATE expiry_logs SET
             quantity = 0,
             item_status = 'completed',
             completed_via = 'offer_received',
             completed_at = ?,
             review_status = 'resolved',
             last_updated_at = ?
           WHERE id = ?`,
        ).run(now, now, offer.expiry_log_id);
      } else {
        db.prepare(
          `UPDATE expiry_logs SET
             quantity = ?,
             last_updated_at = ?
           WHERE id = ?`,
        ).run(new_qty, now, offer.expiry_log_id);
      }
    }

    // Step 5: update offer
    db.prepare(
      `UPDATE offers SET
         offer_status = 'accepted',
         received_at = ?,
         updated_at = ?
       WHERE id = ?`,
    ).run(at, now, id);

    // Step 6: write history_log
    const historyDesc =
      offer.expiry_log_id !== null
        ? `${offer.quantity} unit(s) offered to ${offer.outlet_name} confirmed received. Item qty updated: ${current_qty} → ${Math.max(0, new_qty)}`
        : `Offer for ${offer.description} confirmed received by ${offer.outlet_name}`;

    db.prepare(
      `INSERT INTO history_log
         (action, module, record_id, pic_id, pic_name, description, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run("UPDATE", "offers", id, user.userId, user.picName, historyDesc, now);

    // Step 7: return
    const updated = db
      .prepare(`SELECT * FROM offers WHERE id = ?`)
      .get(id);

    return NextResponse.json({
      success: true,
      data: updated,
      qty_deducted: offer.quantity,
      item_completed: new_qty <= 0,
    });
  }

  // ----------------------------------------------------------------
  // REJECTED
  // ----------------------------------------------------------------

  // Step 1: update offer only
  db.prepare(
    `UPDATE offers SET
       offer_status = 'rejected',
       rejection_notes = ?,
       updated_at = ?
     WHERE id = ?`,
  ).run(rejection_notes ?? null, now, id);

  // Step 3: write history_log
  const rejectDesc = `${offer.outlet_name} rejected offer for ${offer.description}. Qty unchanged.`;

  db.prepare(
    `INSERT INTO history_log
       (action, module, record_id, pic_id, pic_name, description, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "UPDATE",
    "offers",
    id,
    user.userId,
    user.picName,
    rejectDesc,
    now,
  );

  // Step 4: return
  const updated = db.prepare(`SELECT * FROM offers WHERE id = ?`).get(id);

  return NextResponse.json({
    success: true,
    data: updated,
    qty_deducted: 0,
    item_completed: false,
  });
}
