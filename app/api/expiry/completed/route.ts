import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface CompletedRow {
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
  original_qty: number | null;
  item_status: string;
  completed_via: string | null;
  completed_at: string | null;
  completed_notes: string | null;
  sold_at: string | null;
  sold_by: string | null;
  return_notes: string | null;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const ALLOWED_SORT: Record<string, string> = {
  completed_at: "completed_at",
  description: "description",
  units_sold: "completed_at", // JS sort fallback
};

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const completedVia = searchParams.get("completed_via")?.trim() ?? "";
  const pic        = searchParams.get("pic")?.trim() ?? "";
  const month      = searchParams.get("month")?.trim() ?? "";
  const showAll    = searchParams.get("all") === "true";
  const sortBy     = searchParams.get("sort_by")?.trim() ?? "completed_at";
  const sortOrder  = searchParams.get("sort_order")?.trim() === "asc" ? "ASC" : "DESC";
  const search     = searchParams.get("search")?.trim() ?? "";

  let p = 1;
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  conditions.push("item_status IN ('sold', 'completed')");

  if (user.role !== "manager") {
    conditions.push(`pic_id = $${p++}`);
    bindings.push(user.userId);
  } else if (pic) {
    conditions.push(`pic_name = $${p++}`);
    bindings.push(pic);
  }

  if (completedVia) {
    conditions.push(`completed_via = $${p++}`);
    bindings.push(completedVia);
  }

  // Default: current month unless showAll=true or explicit month passed
  const effectiveMonth = showAll ? "" : (month || currentMonth());
  if (effectiveMonth) {
    conditions.push(`to_char((completed_at)::timestamp, 'YYYY-MM') = $${p++}`);
    bindings.push(effectiveMonth);
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      `(LOWER(description) LIKE LOWER($${p++}) OR LOWER(barcode) LIKE LOWER($${p++}) OR LOWER(COALESCE(stock_id,'')) LIKE LOWER($${p++}))`,
    );
    bindings.push(like, like, like);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const sqlSortCol = ALLOWED_SORT[sortBy] ?? "completed_at";

  const rows = (
    await pool.query(
      `SELECT * FROM expiry_logs ${where} ORDER BY ${sqlSortCol} ${sortOrder}`,
      bindings,
    )
  ).rows as unknown as CompletedRow[];

  // Attach computed fields
  const data = rows.map((row) => {
    const unitsSold =
      row.original_qty != null ? row.original_qty - row.quantity : null;
    return {
      ...row,
      units_sold: unitsSold,
      remaining_qty: row.quantity,
    };
  });

  // JS sort for units_sold (value lives in parsed text)
  if (sortBy === "units_sold") {
    const dir = sortOrder === "ASC" ? 1 : -1;
    data.sort((a, b) => ((a.units_sold ?? 0) - (b.units_sold ?? 0)) * dir);
  }

  const summary = {
    total:                data.length,
    sold_count:           data.filter((r) => r.completed_via === "sold").length,
    sold_units:           data.reduce((s, r) => s + (r.units_sold ?? 0), 0),
    returned_count:       data.filter((r) => r.completed_via === "returned").length,
    not_approved_count:   data.filter((r) => r.completed_via === "return_not_approved").length,
    offer_received_count: data.filter((r) => r.completed_via === "offer_received").length,
    offer_rejected_count: data.filter((r) => r.completed_via === "offer_rejected").length,
  };

  return NextResponse.json({ success: true, data, summary });
}
