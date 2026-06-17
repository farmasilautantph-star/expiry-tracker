import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

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
  return_status: string | null;
  return_by_date: string | null;
}

interface RawRow extends ExpiryRow {
  offer_status: string | null;
  offer_id: number | null;
}

export interface ShortListEntry extends ExpiryRow {
  days_left: number;
  urgency: Urgency;
  offer_status: "not-offered" | "offered" | "accepted" | "rejected" | "completed";
  offer_id: number | null;
}

function calcUrgency(expiryDate: string): { days_left: number; urgency: Urgency } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(expiryDate);
  d.setHours(0, 0, 0, 0);
  const days_left = Math.round((d.getTime() - today.getTime()) / 86_400_000);

  let urgency: Urgency;
  if (days_left < 0) urgency = "expired";
  else if (days_left <= 7) urgency = "critical";
  else if (days_left <= 30) urgency = "warning";
  else urgency = "safe";

  return { days_left, urgency };
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category     = searchParams.get("category")?.trim() ?? "";
  const pic          = searchParams.get("pic")?.trim()      ?? "";
  const statusFilter = searchParams.get("status")?.trim()   ?? "";
  const search       = searchParams.get("search")?.trim()   ?? "";

  const db = getDb();

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (user.role !== "manager") {
    conditions.push("el.pic_id = ?");
    bindings.push(user.userId);
  } else if (pic) {
    conditions.push("el.pic_name = ?");
    bindings.push(pic);
  }

  if (category) {
    conditions.push("el.category = ?");
    bindings.push(category);
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      "(LOWER(el.description) LIKE LOWER(?) OR LOWER(el.barcode) LIKE LOWER(?) OR LOWER(COALESCE(el.stock_id,'')) LIKE LOWER(?))"
    );
    bindings.push(like, like, like);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Subquery gets latest offer for each expiry_log_id
  const sql = `
    SELECT el.*,
      (SELECT offer_status FROM offers WHERE expiry_log_id = el.id ORDER BY created_at DESC LIMIT 1) AS offer_status,
      (SELECT id FROM offers WHERE expiry_log_id = el.id ORDER BY created_at DESC LIMIT 1) AS offer_id
    FROM expiry_logs el
    ${where}
    ORDER BY el.expiry_date ASC
  `;

  const rows = db.prepare(sql).all(...bindings) as unknown as RawRow[];

  let entries: ShortListEntry[] = rows.map((row) => ({
    ...row,
    ...calcUrgency(row.expiry_date),
    offer_status: (row.offer_status as ShortListEntry["offer_status"]) ?? "not-offered",
    offer_id: row.offer_id ?? null,
  }));

  if (statusFilter && ["expired", "critical", "warning", "safe"].includes(statusFilter)) {
    entries = entries.filter((e) => e.urgency === statusFilter);
  }

  const counts = { expired: 0, critical: 0, warning: 0, safe: 0, total: entries.length };
  for (const e of entries) counts[e.urgency]++;

  return NextResponse.json({ success: true, data: entries, counts });
}
