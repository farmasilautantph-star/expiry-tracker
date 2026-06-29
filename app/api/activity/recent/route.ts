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
  const limit = Math.min(Math.max(1, parseInt(limitParam ?? "10", 10) || 10), 20);

  const client = await pool.connect();
  try {
    let rows;
    if (user.role === "manager") {
      const result = await client.query(
        `SELECT id, action, description, timestamp, pic_name
         FROM history_log
         ORDER BY timestamp DESC
         LIMIT $1`,
        [limit],
      );
      rows = result.rows;
    } else {
      const result = await client.query(
        `SELECT id, action, description, timestamp, pic_name
         FROM history_log
         WHERE pic_name = $1
         ORDER BY timestamp DESC
         LIMIT $2`,
        [user.picName || user.username, limit],
      );
      rows = result.rows;
    }

    const data = rows.map((r) => ({
      id: r.id,
      action: r.action as string,
      description: r.description as string | null,
      timestamp: r.timestamp as string,
      pic_name: r.pic_name as string | null,
      time_ago: timeAgo(r.timestamp as string),
    }));

    return NextResponse.json({ success: true, data });
  } finally {
    client.release();
  }
}
