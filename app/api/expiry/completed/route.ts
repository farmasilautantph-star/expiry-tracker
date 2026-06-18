import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

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
  const completedVia = searchParams.get("completed_via")?.trim() ?? "";
  const pic = searchParams.get("pic")?.trim() ?? "";
  const month = searchParams.get("month")?.trim() ?? "";
  const search = searchParams.get("search")?.trim() ?? "";

  const db = getDb();
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  // Base filter: only completed/sold items
  conditions.push("item_status IN ('sold', 'completed')");

  // Role-based filter
  if (user.role !== "manager") {
    conditions.push("pic_id = ?");
    bindings.push(user.userId);
  } else if (pic) {
    conditions.push("pic_name = ?");
    bindings.push(pic);
  }

  if (completedVia) {
    conditions.push("completed_via = ?");
    bindings.push(completedVia);
  }

  if (month) {
    conditions.push("strftime('%Y-%m', completed_at) = ?");
    bindings.push(month);
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      "(LOWER(description) LIKE LOWER(?) OR LOWER(barcode) LIKE LOWER(?) OR LOWER(COALESCE(stock_id,'')) LIKE LOWER(?))",
    );
    bindings.push(like, like, like);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const sql = `
    SELECT *
    FROM expiry_logs
    ${where}
    ORDER BY completed_at DESC
  `;

  const rows = db.prepare(sql).all(...bindings);
  return NextResponse.json({ success: true, data: rows });
}
