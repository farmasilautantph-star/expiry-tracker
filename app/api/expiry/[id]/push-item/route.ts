import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { sendPushNotification } from "@/lib/sendPushNotification";

interface ExpiryRow {
  id: number;
  pic_id: number;
  pic_name: string;
  description: string;
  barcode: string;
  expiry_date: string;
  quantity: number;
  is_push_item: boolean;
}

export async function POST(
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

  const body = (await req.json().catch(() => null)) ?? {};
  const mark = Boolean(body.mark);

  const existing = (
    await pool.query(
      "SELECT id, pic_id, pic_name, description, barcode, expiry_date, quantity, is_push_item FROM expiry_logs WHERE id = $1",
      [id],
    )
  ).rows[0] as unknown as ExpiryRow | undefined;

  if (!existing)
    return NextResponse.json(
      { success: false, error: "Entry not found" },
      { status: 404 },
    );

  const now = new Date().toISOString();

  if (mark) {
    await pool.query(
      `UPDATE expiry_logs
       SET is_push_item         = TRUE,
           push_item_marked_at  = $1,
           push_item_marked_by  = $2,
           last_updated_at      = $3
       WHERE id = $4`,
      [now, user.userId, now, id],
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
        `Marked as Push Item by ${user.picName}: ${existing.description} (${existing.barcode})`,
        now,
      ],
    );

    if (existing.pic_id && existing.pic_id !== user.userId) {
      try {
        await sendPushNotification({
          userId: existing.pic_id,
          title: "Push Item — Action Required",
          body: `${existing.description} marked as Push Item. Please prioritize sales.`,
          url: "/dashboard/push-items",
          type: "push_item",
          tag: `push-item-${id}`,
          requireInteraction: true,
        });
      } catch (notifyErr) {
        console.warn("[push-item] notification dispatch failed:", notifyErr);
      }
    }
  } else {
    await pool.query(
      `UPDATE expiry_logs
       SET is_push_item         = FALSE,
           push_item_marked_at  = NULL,
           push_item_marked_by  = NULL,
           last_updated_at      = $1
       WHERE id = $2`,
      [now, id],
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
        `Unmarked as Push Item by ${user.picName}: ${existing.description} (${existing.barcode})`,
        now,
      ],
    );
  }

  const entry = (
    await pool.query("SELECT * FROM expiry_logs WHERE id = $1", [id])
  ).rows[0];

  return NextResponse.json({ success: true, data: entry });
}
