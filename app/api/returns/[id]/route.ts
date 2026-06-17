import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import type { ReturnRow } from "@/app/api/returns/route";

type ExpiryRow = Omit<ReturnRow, "overdue">;

async function authAny(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await authAny(req);
  if (!user) {
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
    .prepare("SELECT * FROM expiry_logs WHERE id = ?")
    .get(id) as unknown as ExpiryRow | undefined;

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Entry not found" },
      { status: 404 },
    );
  }

  if (
    existing.return_status !== "pending" &&
    existing.return_status !== "returned"
  ) {
    return NextResponse.json(
      { success: false, error: "Entry is not in the return list" },
      { status: 400 },
    );
  }

  // Staff may only update their own entries
  if (user.role !== "manager" && existing.pic_id !== user.userId) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const { return_status, return_by_date, notes } = body ?? {};

  // Staff can only mark as returned — cannot change return_by_date or notes
  if (user.role !== "manager") {
    if (return_status !== "returned") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE expiry_logs SET return_status = 'returned' WHERE id = ?",
    ).run(id);
    db.prepare(
      "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      "UPDATE",
      "returns",
      id,
      user.userId,
      user.picName,
      `Marked returned: ${existing.description}`,
      now,
    );
    const updated = db
      .prepare("SELECT * FROM expiry_logs WHERE id = ?")
      .get(id) as unknown as ExpiryRow;
    const today = now.split("T")[0];
    return NextResponse.json({
      success: true,
      data: { ...updated, overdue: false },
    });
  }

  // Manager: can update return_by_date, notes, and/or return_status
  const validStatus = ["pending", "returned", "non-returnable"];
  const newStatus =
    return_status && validStatus.includes(return_status)
      ? return_status
      : existing.return_status;

  const newReturnByDate =
    return_by_date !== undefined
      ? return_by_date || null
      : existing.return_by_date;
  const newNotes = notes !== undefined ? notes?.trim() || null : existing.notes;

  const now = new Date().toISOString();

  db.prepare(
    "UPDATE expiry_logs SET return_status=?, return_by_date=?, notes=? WHERE id=?",
  ).run(newStatus, newReturnByDate, newNotes, id);

  db.prepare(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    "UPDATE",
    "returns",
    id,
    user.userId,
    user.picName,
    `Updated return for: ${existing.description} — status: ${newStatus}`,
    now,
  );

  const updated = db
    .prepare("SELECT * FROM expiry_logs WHERE id = ?")
    .get(id) as unknown as ExpiryRow;
  const today = now.split("T")[0];
  const overdue =
    updated.return_status === "pending" &&
    !!updated.return_by_date &&
    updated.return_by_date < today;

  return NextResponse.json({ success: true, data: { ...updated, overdue } });
}
