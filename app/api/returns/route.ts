import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export interface ReturnRow {
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
  return_status: string;
  return_by_date: string | null;
  return_notes: string | null;
  completed_at: string | null;
  overdue: boolean;
}

async function auth(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await auth(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month")?.trim() ?? "";
  const statusFilter = searchParams.get("status")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const pic = searchParams.get("pic")?.trim() ?? "";
  const search = searchParams.get("search")?.trim() ?? "";

  const today = new Date().toISOString().split("T")[0];

  let p = 1;
  const conditions: string[] = [
    // Active pending must still be on the floor; history rows are terminal (item_status='completed').
    "((return_status = 'pending' AND item_status = 'active') OR return_status IN ('returned', 'not_approved'))",
  ];
  const bindings: (string | number)[] = [];

  if (user.role !== "manager") {
    conditions.push(`pic_id = $${p++}`);
    bindings.push(user.userId);
  } else if (pic) {
    conditions.push(`pic_name = $${p++}`);
    bindings.push(pic);
  }

  if (category) {
    conditions.push(`category = $${p++}`);
    bindings.push(category);
  }

  // Status filter — applied on top of base condition
  if (statusFilter === "pending") {
    conditions.push("return_status = 'pending'");
    conditions.push(`(return_by_date IS NULL OR return_by_date >= $${p++})`);
    bindings.push(today);
  } else if (statusFilter === "returned") {
    conditions.push("return_status = 'returned'");
  } else if (statusFilter === "not_approved") {
    conditions.push("return_status = 'not_approved'");
  } else if (statusFilter === "overdue") {
    conditions.push("return_status = 'pending'");
    conditions.push(`return_by_date < $${p++}`);
    bindings.push(today);
  } else if (statusFilter === "active") {
    conditions.push("return_status = 'pending'");
  } else if (statusFilter === "history") {
    conditions.push("return_status IN ('returned', 'not_approved')");
  }

  // Month filter: for history statuses filter by completed_at; for active by return_by_date
  if (month) {
    const isHistoryFilter =
      statusFilter === "returned" ||
      statusFilter === "not_approved" ||
      statusFilter === "history";

    if (isHistoryFilter) {
      conditions.push(
        `to_char((COALESCE(completed_at, logged_at))::timestamp, 'YYYY-MM') = $${p++}`,
      );
    } else {
      // For active items: include those with no return_by_date (don't exclude them)
      conditions.push(
        `(return_by_date IS NULL OR to_char((return_by_date)::timestamp, 'YYYY-MM') = $${p++})`,
      );
    }
    bindings.push(month);
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      `(LOWER(description) LIKE LOWER($${p++}) OR LOWER(barcode) LIKE LOWER($${p++}) OR LOWER(COALESCE(stock_id,'')) LIKE LOWER($${p++}))`,
    );
    bindings.push(like, like, like);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const sql = `SELECT * FROM expiry_logs ${where} ORDER BY return_by_date ASC NULLS LAST, logged_at DESC`;

  type ExpiryRow = Omit<ReturnRow, "overdue">;
  const rows = (await pool.query(sql, bindings)).rows as unknown as ExpiryRow[];

  const entries: ReturnRow[] = rows.map((r) => ({
    ...r,
    overdue:
      r.return_status === "pending" &&
      !!r.return_by_date &&
      r.return_by_date < today,
  }));

  const counts = {
    pending: 0,
    overdue: 0,
    returned: 0,
    not_approved: 0,
    total: entries.length,
  };
  for (const e of entries) {
    if (e.return_status === "returned") counts.returned++;
    else if (e.return_status === "not_approved") counts.not_approved++;
    else if (e.overdue) counts.overdue++;
    else counts.pending++;
  }

  return NextResponse.json({ success: true, data: entries, counts });
}
