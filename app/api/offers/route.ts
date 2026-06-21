import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

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
  has_alert: number;
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

  const db = getDb();
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (user.role !== "manager") {
    conditions.push(
      "expiry_log_id IN (SELECT id FROM expiry_logs WHERE pic_id = ?)",
    );
    bindings.push(user.userId);
  }

  if (expiryLogId) {
    conditions.push("expiry_log_id = ?");
    bindings.push(Number(expiryLogId));
  }

  if (category) {
    conditions.push("category = ?");
    bindings.push(category);
  }

  if (
    offerSt &&
    ["offered", "accepted", "rejected", "completed"].includes(offerSt)
  ) {
    conditions.push("offer_status = ?");
    bindings.push(offerSt);
  }

  if (hasAlert === "true" || hasAlert === "1") {
    conditions.push("has_alert = 1");
  } else if (hasAlert === "false" || hasAlert === "0") {
    conditions.push("has_alert = 0");
  }

  if (month) {
    conditions.push("strftime('%Y-%m', created_at) = ?");
    bindings.push(month);
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      "(LOWER(description) LIKE LOWER(?) OR LOWER(barcode) LIKE LOWER(?) OR LOWER(COALESCE(outlet_name,'')) LIKE LOWER(?))",
    );
    bindings.push(like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT *, CAST((julianday(expiry_date) - julianday('now')) AS INTEGER) AS days_left
       FROM offers ${where} ORDER BY created_at DESC`
    )
    .all(...bindings) as unknown as OfferRow[];

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

  const validStatus = ["offered", "accepted", "rejected", "completed"];
  const oStatus =
    offer_status && validStatus.includes(offer_status)
      ? offer_status
      : "offered";
  const qty = Number(quantity) > 0 ? Math.round(Number(quantity)) : 1;
  const now = new Date().toISOString();

  const db = getDb();

  let linkedExpiryDate: string | null = null;

  // Validate against expiry_logs.quantity when linked to a log entry
  if (expiry_log_id) {
    const logRow = db
      .prepare("SELECT quantity, expiry_date FROM expiry_logs WHERE id = ?")
      .get(expiry_log_id) as { quantity: number; expiry_date: string } | undefined;
    if (logRow) {
      const sumRow = db
        .prepare(
          "SELECT COALESCE(SUM(quantity), 0) AS total FROM offers WHERE expiry_log_id = ?",
        )
        .get(expiry_log_id) as { total: number };
      const remaining = logRow.quantity - (sumRow.total ?? 0);
      if (qty > remaining) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot offer more than ${remaining} available unit${remaining === 1 ? "" : "s"} (${logRow.quantity} logged, ${sumRow.total} already offered)`,
          },
          { status: 400 },
        );
      }
      linkedExpiryDate = logRow.expiry_date ?? null;
    }
  }
  try {
    const result = db
      .prepare(
        `INSERT INTO offers
        (expiry_log_id, stock_id, barcode, description, category, uom, quantity,
         outlet_name, offer_status, has_alert, notes, expiry_date, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        expiry_log_id ?? null,
        stock_id?.trim() || null,
        barcode.trim(),
        description.trim(),
        category?.trim() || null,
        uom?.trim() || "",
        qty,
        outlet_name.trim(),
        oStatus,
        has_alert ? 1 : 0,
        notes?.trim() || null,
        linkedExpiryDate,
        user.userId,
        now,
        now,
      );

    const newId = Number(result.lastInsertRowid);

    db.prepare(
      "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      "CREATE",
      "offers",
      newId,
      user.userId,
      user.picName,
      `Offered ${description.trim()} to ${outlet_name.trim()}`,
      now,
    );

    const entry = db.prepare("SELECT * FROM offers WHERE id = ?").get(newId);
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (err) {
    console.error("Offer insert error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create offer" },
      { status: 500 },
    );
  }
}
