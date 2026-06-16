import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { comparePassword } from "@/lib/password";
import { signToken } from "@/lib/auth";

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: "manager" | "staff";
  pic_name: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password } = body ?? {};

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, username, password_hash, role, pic_name FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;

  if (!user || !comparePassword(password, user.password_hash)) {
    return NextResponse.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const token = await signToken({
    userId: Number(user.id),
    username: user.username,
    role: user.role,
    picName: user.pic_name,
  });

  const res = NextResponse.json({
    success: true,
    data: { role: user.role, picName: user.pic_name, username: user.username },
  });

  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return res;
}
