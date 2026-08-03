import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
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

  const existing = (
    await pool.query(
      "SELECT id, pic_id, pic_name, description, barcode, return_status FROM expiry_logs WHERE id = $1",
      [id],
    )
  ).rows[0] as unknown as ExpiryRow | undefined;

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
  const { return_status, return_notes, exception_reason } = body as {
    return_status: string;
    return_notes?: string;
    exception_reason?: string;
  };

  if (!["returned", "not_approved"].includes(return_status))
    return NextResponse.json(
      { success: false, error: "Invalid status. Use returned or not_approved" },
      { status: 400 },
    );

  // Items normally flagged Non-Return can only be recorded as an exception
  // return, and require a reason explaining the exception.
  const isExceptionReturn = existing.return_status === "non-returnable";
  let exceptionReason: string | null = null;
  if (isExceptionReturn) {
    if (return_status !== "returned")
      return NextResponse.json(
        { success: false, error: "Non-Return items can only be recorded as an exception return" },
        { status: 400 },
      );
    exceptionReason = (exception_reason ?? "").trim();
    if (exceptionReason.length < 10)
      return NextResponse.json(
        { success: false, error: "Exception reason must be at least 10 characters" },
        { status: 400 },
      );
  }

  const now = new Date().toISOString();

  if (return_status === "returned") {
    await pool.query(
      `UPDATE expiry_logs
       SET return_status = 'returned',
           return_notes = $1,
           return_exception_reason = $2,
           item_status = 'completed',
           completed_via = 'returned',
           completed_at = $3,
           review_status = 'resolved',
           last_reviewed_at = $4,
           last_updated_at = $5,
           is_push_item         = FALSE,
           push_item_marked_at  = NULL,
           push_item_marked_by  = NULL,
           is_locked            = FALSE,
           locked_at            = NULL
       WHERE id = $6`,
      [return_notes ?? null, exceptionReason, now, now, now, id],
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
        isExceptionReturn
          ? `Exception return — normally Non-Return item returned to warehouse. Reason: ${exceptionReason}. By: ${user.picName}.`
          : `Return completed for ${existing.description} (Barcode: ${existing.barcode}) by ${existing.pic_name}`,
        now,
      ],
    );
  } else {
    await pool.query(
      `UPDATE expiry_logs
       SET return_status = 'not_approved',
           return_notes = $1,
           item_status = 'completed',
           completed_via = 'not_approved',
           completed_at = $2,
           review_status = 'resolved',
           last_reviewed_at = $3,
           last_updated_at = $4,
           is_push_item         = FALSE,
           push_item_marked_at  = NULL,
           push_item_marked_by  = NULL,
           is_locked            = FALSE,
           locked_at            = NULL
       WHERE id = $5`,
      [return_notes ?? null, now, now, now, id],
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
        `Return not approved for ${existing.description} by ${existing.pic_name}${return_notes ? `. Notes: ${return_notes}` : ""}`,
        now,
      ],
    );
  }

  const entry = (
    await pool.query("SELECT * FROM expiry_logs WHERE id = $1", [id])
  ).rows[0];
  return NextResponse.json({ success: true, data: entry });
}
