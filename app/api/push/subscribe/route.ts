import { NextRequest, NextResponse } from "next/server";
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint: string | undefined = body?.subscription?.endpoint;
  const p256dh: string | undefined = body?.subscription?.keys?.p256dh;
  const auth: string | undefined = body?.subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { success: false, error: "Missing subscription fields" },
      { status: 400 },
    );
  }

  const userAgent = req.headers.get("user-agent") ?? null;

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         p256dh  = EXCLUDED.p256dh,
         auth    = EXCLUDED.auth,
         user_agent = EXCLUDED.user_agent`,
      [user.userId, endpoint, p256dh, auth, userAgent],
    );
    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
}
