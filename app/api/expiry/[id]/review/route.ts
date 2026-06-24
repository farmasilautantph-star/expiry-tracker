import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryRow {
  id: number;
  pic_id: number;
  description: string;
  expiry_date: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid ID" },
      { status: 400 },
    );
  }

  const existing = (await pool.query(
    "SELECT id, pic_id, description, expiry_date FROM expiry_logs WHERE id = $1",
    [id],
  )).rows[0] as unknown as ExpiryRow | undefined;

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Entry not found" },
      { status: 404 },
    );
  }

  if (user.role !== "manager" && existing.pic_id !== user.userId) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  const now = new Date().toISOString();

  await pool.query(
    `UPDATE expiry_logs
     SET last_reviewed_at = $1,
         last_reviewed_by = $2,
         last_updated_at = $3,
         review_status = 'pending'
     WHERE id = $4`,
    [now, user.picName, now, id],
  );

  await pool.query(
    `INSERT INTO history_log
       (action, module, record_id, pic_id, pic_name, description, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      "UPDATE",
      "expiry",
      id,
      user.userId,
      user.picName,
      `Marked as reviewed by ${user.picName}`,
      now,
    ],
  );

  const last_reviewed_display = new Date(now).toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return NextResponse.json({ success: true, last_reviewed_at: now, last_reviewed_display });
}
