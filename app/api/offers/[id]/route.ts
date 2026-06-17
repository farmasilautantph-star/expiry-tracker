import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

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
  if (!user) return NextResponse.json({ success: false, error }, { status });

  const id = Number(params.id);
  if (!id)
    return NextResponse.json(
      { success: false, error: "Invalid id" },
      { status: 400 },
    );

  const db = getDb();
  const existing = db.prepare("SELECT * FROM offers WHERE id = ?").get(id);
  if (!existing)
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );

  const body = (await req.json().catch(() => null)) ?? {};
  const { offer_status, quantity, outlet_name, has_alert, notes } = body;

  const validStatus = ["offered", "accepted", "rejected", "completed"];
  const fields: string[] = [];
  const bindings: (string | number | null)[] = [];

  if (offer_status !== undefined && validStatus.includes(offer_status)) {
    fields.push("offer_status = ?");
    bindings.push(offer_status);
  }
  if (quantity !== undefined) {
    fields.push("quantity = ?");
    bindings.push(Math.max(1, Number(quantity)));
  }
  if (outlet_name !== undefined) {
    fields.push("outlet_name = ?");
    bindings.push(outlet_name?.trim() || "");
  }
  if (has_alert !== undefined) {
    fields.push("has_alert = ?");
    bindings.push(has_alert ? 1 : 0);
  }
  if (notes !== undefined) {
    fields.push("notes = ?");
    bindings.push(notes?.trim() || null);
  }

  if (fields.length === 0) {
    return NextResponse.json(
      { success: false, error: "No fields to update" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  fields.push("updated_at = ?");
  bindings.push(now);
  bindings.push(id);

  db.prepare(`UPDATE offers SET ${fields.join(", ")} WHERE id = ?`).run(
    ...bindings,
  );

  db.prepare(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    "UPDATE",
    "offers",
    id,
    user.userId,
    user.picName,
    `Updated offer id=${id}`,
    now,
  );

  const updated = db.prepare("SELECT * FROM offers WHERE id = ?").get(id);
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, error, status } = await authManager(req);
  if (!user) return NextResponse.json({ success: false, error }, { status });

  const id = Number(params.id);
  if (!id)
    return NextResponse.json(
      { success: false, error: "Invalid id" },
      { status: 400 },
    );

  const db = getDb();
  const existing = db.prepare("SELECT * FROM offers WHERE id = ?").get(id) as
    | { description?: string; outlet_name?: string }
    | undefined;
  if (!existing)
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );

  db.prepare("DELETE FROM offers WHERE id = ?").run(id);

  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    "DELETE",
    "offers",
    id,
    user.userId,
    user.picName,
    `Deleted offer: ${existing.description ?? ""} → ${existing.outlet_name ?? ""}`,
    now,
  );

  return NextResponse.json({ success: true });
}
