import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { getSundayReviewStatus } from "@/lib/sunday-deadline";

export type Urgency = "expired" | "critical" | "warning" | "safe";

interface ExpiryRow {
  id: number;
  barcode: string;
  description: string;
  category: string;
  expiry_date: string;
  pic_id: number;
  pic_name: string;
  logged_at: string;
  notes: string | null;
  stock_id: string | null;
  uom: string | null;
  quantity: number;
  return_status: string | null;
  return_by_date: string | null;
  original_qty: number | null;
  sold_at: string | null;
  sold_by: string | null;
  item_status: "active" | "sold" | "completed";
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  is_push_item: boolean;
  push_item_marked_at: string | null;
  push_item_marked_by: number | null;
  is_locked: boolean;
  locked_at: string | null;
}

interface RawRow extends ExpiryRow {
  offer_status: string | null;
  offer_id: number | null;
  total_offered: number;
  offered_qty: number;
}

export interface ShortListEntry extends ExpiryRow {
  days_left: number;
  urgency: Urgency;
  review_status: "pending" | "early_alert" | "last_chance" | "needs_review" | "critical_stale" | "resolved";
  last_reviewed_display: string | null;
  offer_status:
    | "not-offered"
    | "offered"
    | "accepted"
    | "rejected"
    | "completed";
  offer_id: number | null;
  total_offered: number;
  offered_qty: number;
  has_active_offer: boolean;
  is_locked: boolean;
  locked_at: string | null;
}

function formatReviewedAt(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function calcUrgency(expiryDate: string): {
  days_left: number;
  urgency: Urgency;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(expiryDate);
  d.setHours(0, 0, 0, 0);
  const days_left = Math.round((d.getTime() - today.getTime()) / 86_400_000);

  let urgency: Urgency;
  if (days_left < 0) urgency = "expired";
  else if (days_left < 90) urgency = "critical";   // 0–89 days
  else if (days_left <= 240) urgency = "warning";  // 90–240 days
  else urgency = "safe";                            // >240 days

  return { days_left, urgency };
}

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category")?.trim() ?? "";
  const pic = searchParams.get("pic")?.trim() ?? "";
  const statusFilter = searchParams.get("status")?.trim() ?? "";
  const search = searchParams.get("search")?.trim() ?? "";
  const pushOnly = searchParams.get("push_only") === "true";
  const lockedOnly = searchParams.get("locked_only") === "true";

  let p = 1;
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  // Always filter to active items only
  conditions.push("el.item_status = 'active'");

  if (pushOnly) {
    // Push Item tab is outlet-wide — no user scoping, filter by flag only
    conditions.push("el.is_push_item = TRUE");
  } else if (lockedOnly) {
    // Locked Items page is outlet-wide — no user scoping, filter by flag only
    conditions.push("el.is_locked = TRUE");
  } else {
    if (user.role !== "manager") {
      conditions.push(`el.pic_id = $${p++}`);
      bindings.push(user.userId);
    } else if (pic) {
      conditions.push(`el.pic_name = $${p++}`);
      bindings.push(pic);
    }
  }

  if (category) {
    conditions.push(`el.category = $${p++}`);
    bindings.push(category);
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      `(LOWER(el.description) LIKE LOWER($${p++}) OR LOWER(el.barcode) LIKE LOWER($${p++}) OR LOWER(COALESCE(el.stock_id,'')) LIKE LOWER($${p++}))`,
    );
    bindings.push(like, like, like);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Subquery gets latest offer status and total offered quantity per row
  const sql = `
    SELECT el.*,
      (SELECT offer_status FROM offers WHERE expiry_log_id = el.id ORDER BY created_at DESC LIMIT 1) AS offer_status,
      (SELECT id FROM offers WHERE expiry_log_id = el.id ORDER BY created_at DESC LIMIT 1) AS offer_id,
      COALESCE((SELECT SUM(quantity) FROM offers WHERE expiry_log_id = el.id), 0) AS total_offered,
      COALESCE((SELECT SUM(quantity) FROM offers WHERE expiry_log_id = el.id AND offer_status = 'offered'), 0) AS offered_qty
    FROM expiry_logs el
    ${where}
    ORDER BY el.expiry_date ASC
  `;

  const rows = (await pool.query(sql, bindings)).rows as unknown as RawRow[];

  let entries: ShortListEntry[] = rows.map((row) => ({
    ...row,
    ...calcUrgency(row.expiry_date),
    review_status: getSundayReviewStatus(row.last_reviewed_at, row.logged_at, row.item_status) as ShortListEntry["review_status"],
    last_reviewed_display: formatReviewedAt(row.last_reviewed_at),
    offer_status:
      (row.offer_status as ShortListEntry["offer_status"]) ?? "not-offered",
    offer_id: row.offer_id ?? null,
    total_offered: row.total_offered ?? 0,
    offered_qty: row.offered_qty ?? 0,
    has_active_offer: (row.offered_qty ?? 0) > 0,
  }));

  if (
    statusFilter &&
    ["expired", "critical", "warning", "safe"].includes(statusFilter)
  ) {
    entries = entries.filter((e) => e.urgency === statusFilter);
  }

  const counts = {
    expired: 0,
    critical: 0,
    warning: 0,
    safe: 0,
    push: 0,
    locked: 0,
    total: entries.length,
  };
  for (const e of entries) {
    counts[e.urgency]++;
    if (e.is_push_item) counts.push++;
    if (e.is_locked) counts.locked++;
  }

  return NextResponse.json({ success: true, data: entries, counts });
}
