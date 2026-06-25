import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function PATCH(
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

  const body = await req.json().catch(() => null);
  if (body === null || !("remarks" in body)) {
    return NextResponse.json(
      { success: false, error: "remarks field is required" },
      { status: 400 },
    );
  }

  const remarks = body.remarks === null ? null : String(body.remarks).trim() || null;

  // Any authenticated user can update remarks on their own item; managers can update any
  const existing = (
    await pool.query("SELECT pic_id FROM expiry_logs WHERE id = $1", [id])
  ).rows[0] as { pic_id: number } | undefined;

  if (!existing)
    return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });

  if (user.role !== "manager" && existing.pic_id !== user.userId)
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  await pool.query(
    "UPDATE expiry_logs SET remarks = $1 WHERE id = $2",
    [remarks, id],
  );

  return NextResponse.json({ success: true, remarks });
}
