import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { sendPushNotification } from "@/lib/sendPushNotification";

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

  const existing = (
    await pool.query("SELECT * FROM offers WHERE id = $1", [id])
  ).rows[0] as
    | {
        offer_status: string;
        description: string;
        outlet_name: string;
      }
    | undefined;
  if (!existing)
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );

  const body = (await req.json().catch(() => null)) ?? {};
  const { offer_status, quantity, outlet_name, has_alert, notes } = body;

  const validStatus = ["offered", "accepted", "rejected", "completed"];
  const fields: string[] = [];
  const bindings: (string | number | boolean | null)[] = [];
  let p = 1;

  if (offer_status !== undefined && validStatus.includes(offer_status)) {
    fields.push(`offer_status = $${p++}`);
    bindings.push(offer_status);
  }
  if (quantity !== undefined) {
    fields.push(`quantity = $${p++}`);
    bindings.push(Math.max(1, Number(quantity)));
  }
  if (outlet_name !== undefined) {
    fields.push(`outlet_name = $${p++}`);
    bindings.push(outlet_name?.trim() || "");
  }
  if (has_alert !== undefined) {
    fields.push(`has_alert = $${p++}`);
    bindings.push(Boolean(has_alert));
  }
  if (notes !== undefined) {
    fields.push(`notes = $${p++}`);
    bindings.push(notes?.trim() || null);
  }

  if (fields.length === 0) {
    return NextResponse.json(
      { success: false, error: "No fields to update" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  fields.push(`updated_at = $${p++}`);
  bindings.push(now);
  bindings.push(id);

  await pool.query(
    `UPDATE offers SET ${fields.join(", ")} WHERE id = $${p}`,
    bindings,
  );

  await pool.query(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      "UPDATE",
      "offers",
      id,
      user.userId,
      user.picName,
      `Updated offer id=${id}`,
      now,
    ],
  );

  const updated = (
    await pool.query("SELECT * FROM offers WHERE id = $1", [id])
  ).rows[0];

  // Notify other managers when status actually transitioned
  if (
    offer_status !== undefined &&
    validStatus.includes(offer_status) &&
    offer_status !== existing.offer_status
  ) {
    try {
      const managers = (
        await pool.query(
          `SELECT id FROM users WHERE role = 'manager' AND id <> $1`,
          [user.userId],
        )
      ).rows as { id: number }[];

      await Promise.all(
        managers.map((m) =>
          sendPushNotification({
            userId: m.id,
            title: "Outlet Offer Update",
            body: `${existing.description} → ${existing.outlet_name}: ${offer_status} by ${user.picName}`,
            url: "/dashboard/offers",
            type: "offer_status",
            tag: `offer-status-${id}`,
          }),
        ),
      );
    } catch (err) {
      console.warn("[push] manager status notify failed:", err);
    }
  }

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

  const existing = (
    await pool.query("SELECT * FROM offers WHERE id = $1", [id])
  ).rows[0] as { description?: string; outlet_name?: string } | undefined;
  if (!existing)
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );

  await pool.query("DELETE FROM offers WHERE id = $1", [id]);

  const now = new Date().toISOString();
  await pool.query(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      "DELETE",
      "offers",
      id,
      user.userId,
      user.picName,
      `Deleted offer: ${existing.description ?? ""} → ${existing.outlet_name ?? ""}`,
      now,
    ],
  );

  return NextResponse.json({ success: true });
}
