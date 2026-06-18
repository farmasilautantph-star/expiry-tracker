import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryRow {
  id: number;
  pic_id: number;
  pic_name: string;
  description: string;
  return_status: string | null;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  returning: ["*"], // any → returning
  not_approved: ["*"], // any → not_approved
  returned: ["returning"], // only returning → returned
};

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

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
  if (isNaN(id))
    return NextResponse.json(
      { success: false, error: "Invalid ID" },
      { status: 400 },
    );

  const db = getDb();
  const existing = db
    .prepare(
      "SELECT id, pic_id, pic_name, description, return_status FROM expiry_logs WHERE id = ?",
    )
    .get(id) as unknown as ExpiryRow | undefined;

  if (!existing)
    return NextResponse.json(
      { success: false, error: "Entry not found" },
      { status: 404 },
    );

  if (user.role !== "manager" && existing.pic_id !== user.userId)
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );

  const body = (await req.json().catch(() => null)) ?? {};
  const { return_status, return_notes } = body as {
    return_status: string;
    return_notes?: string;
  };

  if (!["returning", "returned", "not_approved"].includes(return_status))
    return NextResponse.json(
      { success: false, error: "Invalid return_status" },
      { status: 400 },
    );

  // Validate transition
  const allowedFrom = VALID_TRANSITIONS[return_status];
  const currentStatus = existing.return_status ?? "pending";
  if (
    !allowedFrom.includes("*") &&
    !allowedFrom.includes(currentStatus)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot transition from '${currentStatus}' to '${return_status}'`,
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE expiry_logs SET return_status = ?, return_notes = ?, last_updated_at = ? WHERE id = ?`,
  ).run(return_status, return_notes ?? null, now, id);

  if (return_status === "returned") {
    db.prepare(
      `UPDATE expiry_logs
       SET item_status = 'completed',
           completed_via = 'returned',
           completed_at = ?,
           review_status = 'resolved'
       WHERE id = ?`,
    ).run(now, id);
  }

  if (return_status === "not_approved") {
    db.prepare(
      `UPDATE expiry_logs
       SET completed_via = 'return_not_approved',
           completed_at = ?
       WHERE id = ?`,
    ).run(now, id);
  }

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
    `Return status updated to ${return_status} by ${user.picName}`,
    now,
  );

  const entry = db.prepare("SELECT * FROM expiry_logs WHERE id = ?").get(id);
  return NextResponse.json({ success: true, data: entry });
}
