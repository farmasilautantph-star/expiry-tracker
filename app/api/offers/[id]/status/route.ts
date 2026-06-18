import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface OfferRow {
  id: number;
  expiry_log_id: number | null;
  description: string;
  offer_status: string;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

  if (user.role !== "manager")
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );

  const id = parseInt(params.id, 10);
  if (isNaN(id))
    return NextResponse.json(
      { success: false, error: "Invalid ID" },
      { status: 400 },
    );

  const db = getDb();
  const offer = db
    .prepare(
      "SELECT id, expiry_log_id, description, offer_status FROM offers WHERE id = ?",
    )
    .get(id) as unknown as OfferRow | undefined;

  if (!offer)
    return NextResponse.json(
      { success: false, error: "Offer not found" },
      { status: 404 },
    );

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

  if (offer_status === "accepted") {
    const at = received_at ?? now;
    db.prepare(
      "UPDATE offers SET offer_status = 'accepted', received_at = ?, updated_at = ? WHERE id = ?",
    ).run(at, now, id);

    if (offer.expiry_log_id) {
      db.prepare(
        `UPDATE expiry_logs
         SET item_status = 'completed',
             completed_via = 'offer_received',
             completed_at = ?,
             review_status = 'resolved',
             last_updated_at = ?
         WHERE id = ?`,
      ).run(now, now, offer.expiry_log_id);
    }

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
      "Offer accepted — outlet received item",
      now,
    );
  } else {
    db.prepare(
      "UPDATE offers SET offer_status = 'rejected', rejection_notes = ?, updated_at = ? WHERE id = ?",
    ).run(rejection_notes ?? null, now, id);

    if (offer.expiry_log_id) {
      db.prepare(
        `UPDATE expiry_logs
         SET completed_via = 'offer_rejected',
             completed_at = ?,
             last_updated_at = ?
         WHERE id = ?`,
      ).run(now, now, offer.expiry_log_id);
    }

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
      "Offer rejected",
      now,
    );
  }

  const updated = db.prepare("SELECT * FROM offers WHERE id = ?").get(id);
  return NextResponse.json({ success: true, data: updated });
}
