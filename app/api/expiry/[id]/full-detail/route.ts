import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { getSundayReviewStatus } from "@/lib/sunday-deadline";

const TZ = "Asia/Kuala_Lumpur";

interface ExpiryRow {
  id: number;
  barcode: string;
  description: string;
  category: string;
  expiry_date: string;
  pic_id: number;
  pic_name: string;
  logged_at: string;
  stock_id: string | null;
  uom: string | null;
  quantity: number;
  original_qty: number | null;
  return_status: string | null;
  return_by_date: string | null;
  return_notes: string | null;
  item_status: string;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  remarks: string | null;
  is_push_item: boolean;
  push_item_marked_at: string | null;
  push_item_marked_by: number | null;
  push_product_image: string | null;
  push_active_ingredient: string | null;
  push_selling_points: string | null;
}

interface OfferRow {
  id: number;
  outlet_name: string | null;
  quantity: number;
  offer_status: string;
  created_at: string;
  received_at: string | null;
  rejection_notes: string | null;
}

function formatReviewedAt(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-MY", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function calcDaysLeft(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(expiryDate);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function calcUrgency(daysLeft: number): string {
  if (daysLeft < 0) return "expired";
  if (daysLeft < 90) return "critical";
  if (daysLeft <= 240) return "warning";
  return "safe";
}

export async function GET(
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

  const row = (await pool.query(
    "SELECT * FROM expiry_logs WHERE id = $1",
    [id],
  )).rows[0] as unknown as ExpiryRow | undefined;

  if (!row)
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  if (user.role !== "manager" && row.pic_id !== user.userId)
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const offers = (await pool.query(
    `SELECT id, outlet_name, quantity, offer_status, created_at, received_at, rejection_notes
     FROM offers WHERE expiry_log_id = $1 ORDER BY created_at ASC`,
    [id],
  )).rows as unknown as OfferRow[];

  const daysLeft = calcDaysLeft(row.expiry_date);
  const reviewStatus = getSundayReviewStatus(
    row.last_reviewed_at,
    row.logged_at,
    row.item_status,
  );

  return NextResponse.json({
    success: true,
    data: {
      id: row.id,
      description: row.description,
      barcode: row.barcode,
      stock_id: row.stock_id,
      category: row.category,
      uom: row.uom,
      qty: row.quantity,
      original_qty: row.original_qty,
      expiry_date: row.expiry_date,
      days_left: daysLeft,
      urgency: calcUrgency(daysLeft),
      item_status: row.item_status,
      logged_at: row.logged_at,
      pic_name: row.pic_name,
      return_status: row.return_status,
      return_by_date: row.return_by_date,
      return_notes: row.return_notes,
      active_offers: offers.map((o) => ({
        id: o.id,
        outlet_name: o.outlet_name,
        quantity_offered: o.quantity,
        offer_status: o.offer_status,
        created_at: o.created_at,
        received_at: o.received_at,
        rejection_notes: o.rejection_notes,
      })),
      last_reviewed_at: row.last_reviewed_at,
      last_reviewed_by: row.last_reviewed_by,
      review_status: reviewStatus,
      last_reviewed_display: formatReviewedAt(row.last_reviewed_at),
      remarks: row.remarks ?? null,
      is_push_item: !!row.is_push_item,
      push_item_marked_at: row.push_item_marked_at,
      push_item_marked_by: row.push_item_marked_by,
      push_product_image: row.push_product_image ?? null,
      push_active_ingredient: row.push_active_ingredient ?? null,
      push_selling_points: row.push_selling_points ?? null,
    },
  });
}
