import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryRow {
  id: number;
  pic_id: number;
  pic_name: string;
  description: string;
  barcode: string;
  is_locked: boolean;
}

/**
 * Manager-only early unlock for a locked (near-expiry) item. Requires a reason
 * (min 10 chars) which is persisted and written to the history log. Once
 * unlocked here, the daily auto-lock sweep will not re-lock the item (it skips
 * rows with unlocked_by set), so the release is permanent until the item is
 * re-logged or leaves the active pool.
 */
export async function POST(
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

  if (user.role !== "manager")
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );

  const id = parseInt(params.id, 10);
  if (isNaN(id))
    return NextResponse.json(
      { success: false, error: "Invalid ID" },
      { status: 400 },
    );

  const body = (await req.json().catch(() => null)) ?? {};
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 10)
    return NextResponse.json(
      { success: false, error: "Reason must be at least 10 characters" },
      { status: 400 },
    );

  const existing = (
    await pool.query(
      "SELECT id, pic_id, pic_name, description, barcode, is_locked FROM expiry_logs WHERE id = $1",
      [id],
    )
  ).rows[0] as unknown as ExpiryRow | undefined;

  if (!existing)
    return NextResponse.json(
      { success: false, error: "Entry not found" },
      { status: 404 },
    );

  if (!existing.is_locked)
    return NextResponse.json(
      { success: false, error: "Item is not locked" },
      { status: 400 },
    );

  const now = new Date().toISOString();

  await pool.query(
    `UPDATE expiry_logs
        SET is_locked       = FALSE,
            locked_at       = NULL,
            unlocked_reason = $1,
            unlocked_by     = $2,
            last_updated_at = $3
      WHERE id = $4`,
    [reason, user.userId, now, id],
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
      `Item unlocked early. Reason: ${reason}. By: ${user.picName}.`,
      now,
    ],
  );

  const entry = (
    await pool.query("SELECT * FROM expiry_logs WHERE id = $1", [id])
  ).rows[0];

  return NextResponse.json({ success: true, data: entry });
}
