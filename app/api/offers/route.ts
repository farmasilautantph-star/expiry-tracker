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
}

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

export async function GET(req: NextRequest) {
  const { user, error, status } = await authManager(req);
  if (!user) return NextResponse.json({ success: false, error }, { status });

  const { searchParams } = new URL(req.url);
  const search    = searchParams.get("search")?.trim()    ?? "";
  const category  = searchParams.get("category")?.trim()  ?? "";
  const offerSt   = searchParams.get("status")?.trim()    ?? "";
  const hasAlert  = searchParams.get("has_alert")?.trim() ?? "";
  const month     = searchParams.get("month")?.trim()     ?? "";

  const db = getDb();
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (category) { conditions.push("category = ?"); bindings.push(category); }

  if (offerSt && ["offered", "accepted", "rejected", "completed"].includes(offerSt)) {
    conditions.push("offer_status = ?"); bindings.push(offerSt);
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
      "(LOWER(description) LIKE LOWER(?) OR LOWER(barcode) LIKE LOWER(?) OR LOWER(COALESCE(outlet_name,'')) LIKE LOWER(?))"
    );
    bindings.push(like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM offers ${where} ORDER BY created_at DESC`)
    .all(...bindings) as unknown as OfferRow[];

  // Counts by status
  const counts = { offered: 0, accepted: 0, rejected: 0, completed: 0, total: rows.length };
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
    expiry_log_id, stock_id, barcode, description, category, uom,
    quantity, outlet_name, offer_status, has_alert, notes,
  } = body ?? {};

  if (!barcode || !description || !outlet_name) {
    return NextResponse.json(
      { success: false, error: "barcode, description, and outlet_name are required" },
      { status: 400 }
    );
  }

  const validStatus = ["offered", "accepted", "rejected", "completed"];
  const oStatus = offer_status && validStatus.includes(offer_status) ? offer_status : "offered";
  const qty = Number(quantity) > 0 ? Number(quantity) : 1;
  const now = new Date().toISOString();

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO offers
      (expiry_log_id, stock_id, barcode, description, category, uom, quantity,
       outlet_name, offer_status, has_alert, notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    expiry_log_id ?? null,
    stock_id?.trim() || null,
    barcode.trim(),
    description.trim(),
    category?.trim() || null,
    uom?.trim() || null,
    qty,
    outlet_name.trim(),
    oStatus,
    has_alert ? 1 : 0,
    notes?.trim() || null,
    user.userId,
    now,
    now,
  );

  const newId = Number(result.lastInsertRowid);

  db.prepare(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run("CREATE", "offers", newId, user.userId, user.picName,
    `Offered ${description.trim()} to ${outlet_name.trim()}`, now);

  const entry = db.prepare("SELECT * FROM offers WHERE id = ?").get(newId);
  return NextResponse.json({ success: true, data: entry }, { status: 201 });
}
