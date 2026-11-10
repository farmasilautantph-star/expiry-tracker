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

/**
 * Applies a quantity delta back onto the linked expiry_logs row when an
 * 'accepted' offer is deleted or its quantity is edited. +delta restores
 * stock (offer qty decreased/deleted), -delta deducts more (offer qty
 * increased). Only reopens the item if THIS offer was what closed it
 * (completed_via = 'offer_received') — never touches completions caused
 * by other flows (direct sell, returns, etc).
 */
async function rebalanceExpiryLogQty(
  expiryLogId: number,
  delta: number,
  now: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const entry = (
    await pool.query(
      "SELECT quantity, item_status, completed_via FROM expiry_logs WHERE id = $1",
      [expiryLogId],
    )
  ).rows[0] as
    | { quantity: number; item_status: string; completed_via: string | null }
    | undefined;
  if (!entry) return { ok: true }; // linked log no longer exists — nothing to rebalance

  const newQty = entry.quantity + delta;
  if (newQty < 0) {
    return {
      ok: false,
      error: `Not enough stock to rebalance (${entry.quantity} currently logged)`,
    };
  }

  const wasOfferCompleted =
    entry.item_status === "completed" && entry.completed_via === "offer_received";

  if (newQty <= 0) {
    await pool.query(
      `UPDATE expiry_logs SET
         quantity = 0,
         item_status = 'completed',
         completed_via = 'offer_received',
         completed_at = $1,
         review_status = 'resolved',
         last_reviewed_at = $1,
         last_updated_at = $1
       WHERE id = $2`,
      [now, expiryLogId],
    );
  } else if (wasOfferCompleted) {
    await pool.query(
      `UPDATE expiry_logs SET
         quantity = $1,
         item_status = 'active',
         completed_via = NULL,
         completed_at = NULL,
         review_status = 'pending',
         last_updated_at = $2
       WHERE id = $3`,
      [newQty, now, expiryLogId],
    );
  } else {
    await pool.query(
      "UPDATE expiry_logs SET quantity = $1, last_updated_at = $2 WHERE id = $3",
      [newQty, now, expiryLogId],
    );
  }

  return { ok: true };
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
        quantity: number;
        expiry_log_id: number | null;
      }
    | undefined;
  if (!existing)
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );

  const body = (await req.json().catch(() => null)) ?? {};
  const { offer_status, quantity, outlet_name, has_alert, notes } = body;

  // Editing quantity requires rebalancing stock — this never changes the
  // offer's status, only how much it reserves/deducts.
  let newQty: number | undefined;
  if (quantity !== undefined) {
    newQty = Math.max(1, Math.round(Number(quantity)));
    const qtyDelta = existing.quantity - newQty; // + if lowered (restore stock), - if raised (deduct more)

    if (qtyDelta !== 0 && existing.expiry_log_id !== null) {
      const now0 = new Date().toISOString();
      if (existing.offer_status === "accepted") {
        const result = await rebalanceExpiryLogQty(existing.expiry_log_id, qtyDelta, now0);
        if (!result.ok) {
          return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }
      } else if (existing.offer_status === "offered") {
        const logRow = (
          await pool.query(
            "SELECT quantity FROM expiry_logs WHERE id = $1",
            [existing.expiry_log_id],
          )
        ).rows[0] as { quantity: number } | undefined;
        const sumRow = (
          await pool.query(
            "SELECT COALESCE(SUM(quantity), 0) AS total FROM offers WHERE expiry_log_id = $1 AND offer_status = 'offered' AND id <> $2",
            [existing.expiry_log_id, id],
          )
        ).rows[0] as { total: number };
        const remaining = (logRow?.quantity ?? 0) - Number(sumRow.total ?? 0);
        if (newQty > remaining) {
          return NextResponse.json(
            {
              success: false,
              error: `Cannot set quantity above ${remaining} available unit${remaining === 1 ? "" : "s"}`,
            },
            { status: 400 },
          );
        }
      }
    }
  }

  const validStatus = ["offered", "accepted", "rejected", "completed"];
  const fields: string[] = [];
  const bindings: (string | number | boolean | null)[] = [];
  let p = 1;

  if (offer_status !== undefined && validStatus.includes(offer_status)) {
    fields.push(`offer_status = $${p++}`);
    bindings.push(offer_status);
  }
  if (newQty !== undefined) {
    fields.push(`quantity = $${p++}`);
    bindings.push(newQty);
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
  ).rows[0] as
    | {
        description?: string;
        outlet_name?: string;
        offer_status: string;
        quantity: number;
        expiry_log_id: number | null;
      }
    | undefined;
  if (!existing)
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );

  const now = new Date().toISOString();

  // An 'accepted' offer already deducted its quantity from the linked
  // expiry_logs row — deleting it (e.g. a mistaken duplicate entry) must
  // give that stock back. 'offered'/'rejected' offers never deducted
  // anything, so no rebalance is needed for those.
  let qtyRestored = 0;
  if (existing.offer_status === "accepted" && existing.expiry_log_id !== null) {
    const result = await rebalanceExpiryLogQty(existing.expiry_log_id, existing.quantity, now);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    qtyRestored = existing.quantity;
  }

  await pool.query("DELETE FROM offers WHERE id = $1", [id]);

  const rebalanceNote = qtyRestored > 0 ? ` (${qtyRestored} unit(s) restored to stock)` : "";
  await pool.query(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      "DELETE",
      "offers",
      id,
      user.userId,
      user.picName,
      `Deleted offer: ${existing.description ?? ""} → ${existing.outlet_name ?? ""}${rebalanceNote}`,
      now,
    ],
  );

  return NextResponse.json({ success: true, qty_restored: qtyRestored });
}
