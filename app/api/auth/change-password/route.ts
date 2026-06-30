import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json() as { currentPassword?: string; newPassword?: string };
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword)
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });

    if (newPassword.length < 6)
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters" },
        { status: 400 },
      );

    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [user.userId],
    );
    if (result.rows.length === 0)
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const storedHash = (result.rows[0] as { password_hash: string }).password_hash;
    const matches = await bcrypt.compare(currentPassword, storedHash);
    if (!matches)
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 },
      );

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [newHash, user.userId],
    );

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
