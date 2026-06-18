import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
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

  const db = getDb();
  const existing = db
    .prepare("SELECT id, pic_id, description, expiry_date FROM expiry_logs WHERE id = ?")
    .get(id) as unknown as ExpiryRow | undefined;

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

  db.prepare(
    `UPDATE expiry_logs
     SET last_reviewed_at = ?,
         last_reviewed_by = ?,
         last_updated_at = ?,
         review_status = 'pending'
     WHERE id = ?`,
  ).run(now, user.picName, now, id);

  db.prepare(
    `INSERT INTO history_log
       (action, module, record_id, pic_id, pic_name, description, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "UPDATE",
    "expiry",
    id,
    user.userId,
    user.picName,
    `Marked as reviewed by ${user.picName}`,
    now,
  );

  const entry = db
    .prepare("SELECT * FROM expiry_logs WHERE id = ?")
    .get(id);

  return NextResponse.json({ success: true, data: entry });
}
