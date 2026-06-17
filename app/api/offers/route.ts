import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export interface OfferRow {
  id: number;
  description: string;
  barcode: string;
  stock_id: string | null;
  uom: string;
  quantity: number;
  category: string | null;
  notes: string | null;
  has_alert: number;
  created_at: string;
  created_by: number;
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
  const search   = searchParams.get("search")?.trim()   ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const alert    = searchParams.get("alert")?.trim()    ?? "";

  const db = getDb();
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (category) {
    conditions.push("category = ?");
    bindings.push(category);
  }

  if (alert === "1") {
    conditions.push("has_alert = 1");
  } else if (alert === "0") {
    conditions.push("has_alert = 0");
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      "(LOWER(description) LIKE LOWER(?) OR LOWER(barcode) LIKE LOWER(?) OR LOWER(COALESCE(stock_id,'')) LIKE LOWER(?))"
    );
    bindings.push(like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM offers ${where} ORDER BY created_at DESC`;

  const rows = db.prepare(sql).all(...bindings) as unknown as OfferRow[];

  const totalOffers = rows.length;
  const withAlert = rows.filter((r) => r.has_alert === 1).length;

  return NextResponse.json({ success: true, data: rows, summary: { totalOffers, withAlert } });
}

export async function POST(req: NextRequest) {
  const { user, error, status } = await authManager(req);
  if (!user) return NextResponse.json({ success: false, error }, { status });

  const body = await req.json().catch(() => null);
  const { description, barcode, stock_id, uom, quantity, category, notes, has_alert } = body ?? {};

  if (!description || !barcode || !uom) {
    return NextResponse.json(
      { success: false, error: "description, barcode, and uom are required" },
      { status: 400 }
    );
  }

  const qty = Number(quantity) > 0 ? Number(quantity) : 1;
  const alertVal = has_alert ? 1 : 0;
  const created_at = new Date().toISOString();

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO offers (description, barcode, stock_id, uom, quantity, category, notes, has_alert, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      description.trim(),
      barcode.trim(),
      stock_id?.trim() || null,
      uom.trim(),
      qty,
      category?.trim() || null,
      notes?.trim() || null,
      alertVal,
      created_at,
      user.userId
    );

  const newId = Number(result.lastInsertRowid);

  db.prepare(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run("CREATE", "offers", newId, user.userId, user.picName, `Added offer: ${description.trim()}`, created_at);

  const entry = db.prepare("SELECT * FROM offers WHERE id = ?").get(newId) as unknown as OfferRow;
  return NextResponse.json({ success: true, data: entry }, { status: 201 });
}
