import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export interface ReturnRow {
  id: number;
  logged_date: string;
  pic_id: number;
  pic_name: string;
  category: string;
  description: string;
  barcode: string;
  created_at: string;
  stock_id: string | null;
  uom: string | null;
  return_by_date: string | null;
  notes: string | null;
  status: string;
}

async function auth(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await auth(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category     = searchParams.get("category")?.trim() ?? "";
  const pic          = searchParams.get("pic")?.trim()      ?? "";
  const search       = searchParams.get("search")?.trim()   ?? "";
  const statusFilter = searchParams.get("status")?.trim()   ?? "";

  const db = getDb();

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (user.role !== "manager") {
    conditions.push("pic_id = ?");
    bindings.push(user.userId);
  } else if (pic) {
    conditions.push("pic_name = ?");
    bindings.push(pic);
  }

  if (category) {
    conditions.push("category = ?");
    bindings.push(category);
  }

  if (statusFilter && ["pending", "returned"].includes(statusFilter)) {
    conditions.push("COALESCE(status, 'pending') = ?");
    bindings.push(statusFilter);
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      "(LOWER(description) LIKE LOWER(?) OR LOWER(barcode) LIKE LOWER(?) OR LOWER(COALESCE(stock_id,'')) LIKE LOWER(?))"
    );
    bindings.push(like, like, like);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM returns ${where} ORDER BY logged_date DESC, created_at DESC`;

  const rows = db.prepare(sql).all(...bindings) as unknown as ReturnRow[];

  const counts = { pending: 0, returned: 0, total: rows.length };
  for (const r of rows) {
    const s = (r.status ?? "pending") as "pending" | "returned";
    if (s === "pending" || s === "returned") counts[s]++;
  }

  return NextResponse.json({ success: true, data: rows, counts });
}

export async function POST(req: NextRequest) {
  const user = await auth(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { logged_date, category, description, barcode, stock_id, uom, return_by_date, notes } =
    body ?? {};

  if (!logged_date || !category || !description || !barcode) {
    return NextResponse.json(
      { success: false, error: "logged_date, category, description, and barcode are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO returns
        (logged_date, pic_id, pic_name, category, description, barcode,
         stock_id, uom, return_by_date, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(
      logged_date,
      user.userId,
      user.picName,
      category.trim(),
      description.trim(),
      barcode.trim(),
      stock_id?.trim() || null,
      uom?.trim() || null,
      return_by_date || null,
      notes?.trim() || null,
      now
    );

  const newId = Number(result.lastInsertRowid);

  db.prepare(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    "CREATE",
    "returns",
    newId,
    user.userId,
    user.picName,
    `Logged return: ${description.trim()} (${logged_date})`,
    now
  );

  const entry = db.prepare("SELECT * FROM returns WHERE id = ?").get(newId) as unknown as ReturnRow;

  return NextResponse.json({ success: true, data: entry }, { status: 201 });
}
