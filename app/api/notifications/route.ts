import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

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

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(1, parseInt(limitParam ?? "20", 10) || 20), 50);

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, title, body, url, type, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [user.userId, limit],
    );

    const unreadResult = await client.query(
      `SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [user.userId],
    );

    const data = result.rows.map((r) => ({
      id: r.id as number,
      title: r.title as string,
      body: r.body as string,
      url: (r.url as string | null) ?? null,
      type: (r.type as string | null) ?? null,
      is_read: r.is_read as boolean,
      created_at: r.created_at as string,
      time_ago: timeAgo(r.created_at as string),
    }));

    return NextResponse.json({
      success: true,
      data,
      unread: unreadResult.rows[0]?.unread ?? 0,
    });
  } finally {
    client.release();
  }
}

export async function PATCH(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const ids: number[] | undefined = Array.isArray(body?.ids)
    ? body.ids.filter((n: any) => Number.isInteger(n))
    : undefined;

  const client = await pool.connect();
  try {
    if (ids && ids.length > 0) {
      await client.query(
        `UPDATE notifications SET is_read = TRUE
         WHERE user_id = $1 AND id = ANY($2::int[])`,
        [user.userId, ids],
      );
    } else {
      await client.query(
        `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
        [user.userId],
      );
    }
    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
}
