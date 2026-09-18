import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

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
  if (user.role !== "manager") {
    return NextResponse.json({ success: false, error: "Manager access required" }, { status: 403 });
  }

  // Includes managers too — a manager can also be the actual seller (e.g. in
  // the POS report or by using the in-app Sell button themselves).
  const rows = (
    await pool.query(`SELECT pic_name FROM users ORDER BY pic_name`)
  ).rows as { pic_name: string }[];

  return NextResponse.json({ success: true, data: rows.map((r) => r.pic_name) });
}
