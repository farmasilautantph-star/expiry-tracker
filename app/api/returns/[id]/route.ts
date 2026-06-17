import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import type { ReturnRow } from "@/app/api/returns/route";

async function authManager(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return { user: null, error: "Unauthorized", status: 401 };
  try {
    const user = await verifyToken(token);
    if (user.role !== "manager") return { user: null, error: "Forbidden", status: 403 };
    return { user, error: null, status: 200 };
  } catch {
    return { user: null, error: "Unauthorized", status: 401 };
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error, status } = await authManager(req);
  if (!user) {
    return NextResponse.json({ success: false, error }, { status });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT * FROM returns WHERE id = ?").get(id) as unknown as ReturnRow | undefined;

  if (!existing) {
    return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const {
    logged_date, category, description, barcode,
    stock_id, uom, return_by_date, notes, status: newStatus,
  } = body ?? {};

  const validStatus = ["pending", "returned"];
  const updated = {
    logged_date:    logged_date          ?? existing.logged_date,
    category:       category?.trim()     ?? existing.category,
    description:    description?.trim()  ?? existing.description,
    barcode:        barcode?.trim()      ?? existing.barcode,
    stock_id:       stock_id    !== undefined ? (stock_id?.trim()    || null) : existing.stock_id,
    uom:            uom         !== undefined ? (uom?.trim()         || null) : existing.uom,
    return_by_date: return_by_date !== undefined ? (return_by_date  || null) : existing.return_by_date,
    notes:          notes       !== undefined ? (notes?.trim()       || null) : existing.notes,
    status:         (newStatus && validStatus.includes(newStatus)) ? newStatus : (existing.status ?? "pending"),
  };

  if (!updated.logged_date || !updated.category || !updated.description || !updated.barcode) {
    return NextResponse.json(
      { success: false, error: "logged_date, category, description, and barcode are required" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE returns
     SET logged_date=?, category=?, description=?, barcode=?,
         stock_id=?, uom=?, return_by_date=?, notes=?, status=?
     WHERE id=?`
  ).run(
    updated.logged_date, updated.category, updated.description, updated.barcode,
    updated.stock_id, updated.uom, updated.return_by_date, updated.notes, updated.status,
    id
  );

  db.prepare(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    "UPDATE",
    "returns",
    id,
    user.userId,
    user.picName,
    `Updated return #${id}: ${updated.description} — status: ${updated.status}`,
    now
  );

  const entry = db.prepare("SELECT * FROM returns WHERE id = ?").get(id) as unknown as ReturnRow;

  return NextResponse.json({ success: true, data: entry });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error, status } = await authManager(req);
  if (!user) {
    return NextResponse.json({ success: false, error }, { status });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT * FROM returns WHERE id = ?").get(id) as unknown as ReturnRow | undefined;

  if (!existing) {
    return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  db.prepare("DELETE FROM returns WHERE id = ?").run(id);

  db.prepare(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    "DELETE",
    "returns",
    id,
    user.userId,
    user.picName,
    `Deleted return #${id}: ${existing.description} (${existing.logged_date})`,
    now
  );

  return NextResponse.json({ success: true, data: { id } });
}
