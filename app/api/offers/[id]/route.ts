import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error, status } = await authManager(req);
  if (!user) return NextResponse.json({ success: false, error }, { status });

  const id = Number(params.id);
  if (!id) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const db = getDb();
  const existing = db.prepare("SELECT * FROM offers WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null) ?? {};
  const { description, barcode, stock_id, uom, quantity, category, notes, has_alert } = body;

  const fields: string[] = [];
  const bindings: (string | number | null)[] = [];

  if (description !== undefined) { fields.push("description = ?"); bindings.push(description.trim()); }
  if (barcode     !== undefined) { fields.push("barcode = ?");     bindings.push(barcode.trim()); }
  if (stock_id    !== undefined) { fields.push("stock_id = ?");    bindings.push(stock_id?.trim() || null); }
  if (uom         !== undefined) { fields.push("uom = ?");         bindings.push(uom.trim()); }
  if (quantity    !== undefined) { fields.push("quantity = ?");    bindings.push(Math.max(1, Number(quantity))); }
  if (category    !== undefined) { fields.push("category = ?");    bindings.push(category?.trim() || null); }
  if (notes       !== undefined) { fields.push("notes = ?");       bindings.push(notes?.trim() || null); }
  if (has_alert   !== undefined) { fields.push("has_alert = ?");   bindings.push(has_alert ? 1 : 0); }

  if (fields.length === 0) {
    return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
  }

  bindings.push(id);
  db.prepare(`UPDATE offers SET ${fields.join(", ")} WHERE id = ?`).run(...bindings);

  db.prepare(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run("UPDATE", "offers", id, user.userId, user.picName, `Updated offer id=${id}`, new Date().toISOString());

  const updated = db.prepare("SELECT * FROM offers WHERE id = ?").get(id);
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error, status } = await authManager(req);
  if (!user) return NextResponse.json({ success: false, error }, { status });

  const id = Number(params.id);
  if (!id) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const db = getDb();
  const existing = db.prepare("SELECT * FROM offers WHERE id = ?").get(id) as { description?: string } | undefined;
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  db.prepare("DELETE FROM offers WHERE id = ?").run(id);

  db.prepare(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    "DELETE",
    "offers",
    id,
    user.userId,
    user.picName,
    `Deleted offer: ${existing.description ?? ""}`,
    new Date().toISOString()
  );

  return NextResponse.json({ success: true });
}
