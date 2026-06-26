import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryRow {
  id: number;
  barcode: string;
  description: string;
  category: string;
  expiry_date: string;
  pic_id: number;
  pic_name: string;
  logged_at: string;
  notes: string | null;
  stock_id: string | null;
  uom: string | null;
  quantity: number;
  return_status: string | null;
  return_by_date: string | null;
}

async function authManager(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return { user: null, error: "Unauthorized", status: 401 };
  try {
    const user = await verifyToken(token);
    if (user.role !== "manager")
      return { user: null, error: "Forbidden", status: 403 };
    return { user, error: null, status: 200 };
  } catch {
    return { user: null, error: "Unauthorized", status: 401 };
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, error, status } = await authManager(req);
  if (!user) {
    return NextResponse.json({ success: false, error }, { status });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid ID" },
      { status: 400 },
    );
  }

  const existing = (
    await pool.query("SELECT * FROM expiry_logs WHERE id = $1", [id])
  ).rows[0] as unknown as ExpiryRow | undefined;

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Entry not found" },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => null);
  const {
    barcode,
    description,
    category,
    expiry_date,
    notes,
    stock_id,
    uom,
    quantity,
    return_status,
    return_by_date,
  } = body ?? {};

  const validReturnStatus = ["pending", "non-returnable", "returned"];
  const rs =
    return_status !== undefined
      ? validReturnStatus.includes(return_status)
        ? return_status
        : null
      : existing.return_status;

  const updated = {
    barcode: barcode?.trim() ?? existing.barcode,
    description: description?.trim() ?? existing.description,
    category: category?.trim() ?? existing.category,
    expiry_date: expiry_date ?? existing.expiry_date,
    notes: notes !== undefined ? notes?.trim() || null : existing.notes,
    stock_id:
      stock_id !== undefined ? stock_id?.trim() || null : existing.stock_id,
    uom: uom !== undefined ? uom?.trim() || null : existing.uom,
    quantity:
      quantity !== undefined
        ? Math.max(1, Math.round(Number(quantity)))
        : existing.quantity,
    return_status: rs,
    return_by_date:
      rs === "pending"
        ? return_by_date !== undefined
          ? return_by_date || null
          : existing.return_by_date
        : null,
  };

  if (
    !updated.barcode ||
    !updated.description ||
    !updated.category ||
    !updated.expiry_date
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "barcode, description, category, and expiry_date are required",
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  await pool.query(
    `UPDATE expiry_logs
     SET barcode=$1, description=$2, category=$3, expiry_date=$4, notes=$5,
         stock_id=$6, uom=$7, quantity=$8, return_status=$9, return_by_date=$10
     WHERE id=$11`,
    [
      updated.barcode,
      updated.description,
      updated.category,
      updated.expiry_date,
      updated.notes,
      updated.stock_id,
      updated.uom,
      updated.quantity,
      updated.return_status,
      updated.return_by_date,
      id,
    ],
  );

  await pool.query(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      "UPDATE",
      "expiry",
      id,
      user.userId,
      user.picName,
      `Updated expiry log #${id}: ${updated.description} (${updated.expiry_date})`,
      now,
    ],
  );

  const entry = (
    await pool.query("SELECT * FROM expiry_logs WHERE id = $1", [id])
  ).rows[0] as unknown as ExpiryRow;

  return NextResponse.json({ success: true, data: entry });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, error, status } = await authManager(req);
  if (!user) {
    return NextResponse.json({ success: false, error }, { status });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid ID" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const reason: string = body?.reason?.trim() ?? "";
  if (!reason) {
    return NextResponse.json(
      { success: false, error: "Reason is required" },
      { status: 400 },
    );
  }

  const existing = (
    await pool.query("SELECT * FROM expiry_logs WHERE id = $1", [id])
  ).rows[0] as unknown as ExpiryRow | undefined;

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Entry not found" },
      { status: 404 },
    );
  }

  const now = new Date().toISOString();

  await pool.query("DELETE FROM expiry_logs WHERE id = $1", [id]);

  await pool.query(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      "DELETE",
      "expiry",
      id,
      user.userId,
      user.picName,
      `Deleted by ${user.picName}. Reason: ${reason} | Entry: ${existing.description} (${existing.barcode}, ${existing.expiry_date})`,
      now,
    ],
  );

  return NextResponse.json({ success: true, data: { id } });
}
