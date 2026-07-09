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

  // Optional push-item details (only used when marking)
  const str = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t === "" ? null : t;
  };
  const activeIngredient = str(body.activeIngredient);
  const sellingPoints = str(body.sellingPoints);
  let productImage = str(body.productImage);
  if (productImage) {
    // Stored as a base64 data URL — validate format and cap size (~1.5MB binary)
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(productImage)) {
      return NextResponse.json(
        { success: false, error: "Invalid image format — must be JPG or PNG" },
        { status: 400 },
      );
    }
    if (productImage.length > 2_000_000) {
      return NextResponse.json(
        { success: false, error: "Image too large — please use a smaller photo" },
        { status: 400 },
      );
    }
  } else {
    productImage = null;
  }

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
       SET is_push_item           = TRUE,
           push_item_marked_at    = $1,
           push_item_marked_by    = $2,
           push_product_image     = $3,
           push_active_ingredient = $4,
           push_selling_points    = $5,
           last_updated_at        = $6
       WHERE id = $7`,
      [now, user.userId, productImage, activeIngredient, sellingPoints, now, id],
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
       SET is_push_item           = FALSE,
           push_item_marked_at    = NULL,
           push_item_marked_by    = NULL,
           push_product_image     = NULL,
           push_active_ingredient = NULL,
           push_selling_points    = NULL,
           last_updated_at        = $1
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
