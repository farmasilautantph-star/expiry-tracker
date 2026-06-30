import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { sendPushNotification } from "@/lib/sendPushNotification";

export interface OfferRow {
  id: number;
  expiry_log_id: number | null;
  stock_id: string | null;
  barcode: string;
  description: string;
  category: string | null;
  uom: string | null;
  quantity: number;
  outlet_name: string;
  offer_status: "offered" | "accepted" | "rejected" | "completed";
  has_alert: boolean;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  expiry_date: string | null;
  days_left: number | null;
}

async function authUser(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return { user: null, error: "Unauthorized", status: 401 };
  try {
    const user = await verifyToken(token);
    return { user, error: null, status: 200 };
  } catch {
    return { user: null, error: "Unauthorized", status: 401 };
  }
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

export async function GET(req: NextRequest) {
  const { user, error, status } = await authUser(req);
  if (!user) return NextResponse.json({ success: false, error }, { status });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const offerSt = searchParams.get("status")?.trim() ?? "";
  const hasAlert = searchParams.get("has_alert")?.trim() ?? "";
  const month = searchParams.get("month")?.trim() ?? "";
  const expiryLogId = searchParams.get("expiry_log_id")?.trim() ?? "";

  let p = 1;
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (user.role !== "manager") {
    conditions.push(`el.pic_id = $${p++}`);
    bindings.push(user.userId);
  }

  if (expiryLogId) {
    conditions.push(`o.expiry_log_id = $${p++}`);
    bindings.push(Number(expiryLogId));
  }

  if (category) {
    conditions.push(`o.category = $${p++}`);
    bindings.push(category);
  }

  if (
    offerSt &&
    ["offered", "accepted", "rejected", "completed"].includes(offerSt)
  ) {
    conditions.push(`o.offer_status = $${p++}`);
    bindings.push(offerSt);
  }

  if (hasAlert === "true" || hasAlert === "1") {
    conditions.push("o.has_alert = TRUE");
  } else if (hasAlert === "false" || hasAlert === "0") {
    conditions.push("o.has_alert = FALSE");
  }

  if (month) {
    conditions.push(`to_char((o.created_at)::timestamp, 'YYYY-MM') = $${p++}`);
    bindings.push(month);
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      `(LOWER(o.description) LIKE LOWER($${p++}) OR LOWER(o.barcode) LIKE LOWER($${p++}) OR LOWER(COALESCE(o.outlet_name,'')) LIKE LOWER($${p++}))`,
    );
    bindings.push(like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  // INNER JOIN expiry_logs guarantees orphaned offers (no matching expiry log) never surface.
  const rows = (
    await pool.query(
      `SELECT o.*, ((o.expiry_date)::date - CURRENT_DATE) AS days_left
         FROM offers o
         JOIN expiry_logs el ON o.expiry_log_id = el.id
       ${where}
       ORDER BY o.created_at DESC`,
      bindings,
    )
  ).rows as unknown as OfferRow[];

  // Counts by status
  const counts = {
    offered: 0,
    accepted: 0,
    rejected: 0,
    completed: 0,
    total: rows.length,
  };
  for (const r of rows) {
    if (r.offer_status in counts) (counts[r.offer_status] as number)++;
  }

  return NextResponse.json({ success: true, data: rows, counts });
}

export async function POST(req: NextRequest) {
  const { user, error, status } = await authManager(req);
  if (!user) return NextResponse.json({ success: false, error }, { status });

  const body = await req.json().catch(() => null);
  const {
    expiry_log_id,
    stock_id,
    barcode,
    description,
    category,
    uom,
    quantity,
    outlet_name,
    offer_status,
    has_alert,
    notes,
  } = body ?? {};

  if (!barcode || !description || !outlet_name) {
    return NextResponse.json(
      {
        success: false,
        error: "barcode, description, and outlet_name are required",
      },
      { status: 400 },
    );
  }

  // Offers MUST link to an expiry_logs row — keeps Outlet Offers 100% synced with Expiry Monitor.
  const linkedId = Number(expiry_log_id);
  if (!Number.isInteger(linkedId) || linkedId <= 0) {
    return NextResponse.json(
      { success: false, error: "expiry_log_id is required" },
      { status: 400 },
    );
  }

  const validStatus = ["offered", "accepted", "rejected", "completed"];
  const oStatus =
    offer_status && validStatus.includes(offer_status)
      ? offer_status
      : "offered";
  const qty = Number(quantity) > 0 ? Math.round(Number(quantity)) : 1;
  const now = new Date().toISOString();

  const logRow = (
    await pool.query(
      "SELECT quantity, expiry_date, pic_id FROM expiry_logs WHERE id = $1",
      [linkedId],
    )
  ).rows[0] as { quantity: number; expiry_date: string; pic_id: number } | undefined;

  if (!logRow) {
    return NextResponse.json(
      { success: false, error: "Linked expiry log not found" },
      { status: 400 },
    );
  }

  const sumRow = (
    await pool.query(
      "SELECT COALESCE(SUM(quantity), 0) AS total FROM offers WHERE expiry_log_id = $1 AND offer_status = 'offered'",
      [linkedId],
    )
  ).rows[0] as { total: number };
  const remaining = logRow.quantity - (Number(sumRow.total) ?? 0);
  if (qty > remaining) {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot offer more than ${remaining} available unit${remaining === 1 ? "" : "s"} (${logRow.quantity} logged, ${sumRow.total} already offered)`,
      },
      { status: 400 },
    );
  }
  const linkedExpiryDate: string | null = logRow.expiry_date ?? null;
  try {
    const result = await pool.query(
      `INSERT INTO offers
        (expiry_log_id, stock_id, barcode, description, category, uom, quantity,
         outlet_name, offer_status, has_alert, notes, expiry_date, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [
        linkedId,
        stock_id?.trim() || null,
        barcode.trim(),
        description.trim(),
        category?.trim() || null,
        uom?.trim() || "",
        qty,
        outlet_name.trim(),
        oStatus,
        Boolean(has_alert),
        notes?.trim() || null,
        linkedExpiryDate,
        user.userId,
        now,
        now,
      ],
    );

    const newId = result.rows[0].id as number;

    await pool.query(
      "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        "CREATE",
        "offers",
        newId,
        user.userId,
        user.picName,
        `Offered ${description.trim()} to ${outlet_name.trim()}`,
        now,
      ],
    );

    const entry = (
      await pool.query("SELECT * FROM offers WHERE id = $1", [newId])
    ).rows[0];

    // Fire push notifications (best-effort, non-blocking on errors).
    try {
      const picId = logRow.pic_id;
      const itemLabel = description.trim();
      const outletLabel = outlet_name.trim();

      const tasks: Promise<void>[] = [];

      if (picId && picId !== user.userId) {
        tasks.push(
          sendPushNotification({
            userId: picId,
            title: "Outlet Offer — Action Required",
            body: `${itemLabel} offered to ${outletLabel}. Please review.`,
            url: "/dashboard/offers",
            type: "offer_pic",
            tag: `offer-${newId}`,
            requireInteraction: true,
          }),
        );
      }

      await Promise.allSettled(tasks);
    } catch (notifyErr) {
      console.warn("[offers] notification dispatch failed:", notifyErr);
    }

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (err) {
    console.error("Offer insert error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create offer" },
      { status: 500 },
    );
  }
}
