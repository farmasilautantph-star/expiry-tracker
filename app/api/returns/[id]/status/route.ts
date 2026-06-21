import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryRow {
  id: number;
  pic_id: number;
  pic_name: string;
  description: string;
  barcode: string;
  return_status: string | null;
}

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
      "SELECT id, pic_id, pic_name, description, barcode, return_status FROM expiry_logs WHERE id = ?",
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

  if (!["returned", "not_approved"].includes(return_status))
    return NextResponse.json(
      { success: false, error: "Invalid status. Use returned or not_approved" },
      { status: 400 },
    );

  const now = new Date().toISOString();

  if (return_status === "returned") {
    db.prepare(
      `UPDATE expiry_logs
       SET return_status = 'returned',
           return_notes = ?,
           item_status = 'completed',
           completed_via = 'returned',
           completed_at = ?,
           review_status = 'resolved',
           last_updated_at = ?
       WHERE id = ?`,
    ).run(return_notes ?? null, now, now, id);

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
      `Return completed for ${existing.description} (Barcode: ${existing.barcode}) by ${existing.pic_name}`,
      now,
    );
  } else {
    db.prepare(
      `UPDATE expiry_logs
       SET return_status = 'not_approved',
           return_notes = ?,
           completed_via = 'return_not_approved',
           completed_at = ?,
           review_status = 'resolved',
           last_updated_at = ?
       WHERE id = ?`,
    ).run(return_notes ?? null, now, now, id);

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
      `Return not approved for ${existing.description} by ${existing.pic_name}${return_notes ? `. Notes: ${return_notes}` : ""}`,
      now,
    );
  }

  const entry = db.prepare("SELECT * FROM expiry_logs WHERE id = ?").get(id);
  return NextResponse.json({ success: true, data: entry });
}
