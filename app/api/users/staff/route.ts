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

  // Includes managers too — POS sales are sometimes processed by a manager,
  // not just staff, so the upload's salesman-mapping dropdown needs everyone.
  const rows = (
    await pool.query(`SELECT id, pic_name, ic_number FROM users ORDER BY pic_name`)
  ).rows as { id: number; pic_name: string; ic_number: string | null }[];

  return NextResponse.json({ success: true, data: rows });
}
