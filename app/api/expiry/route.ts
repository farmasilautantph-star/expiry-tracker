import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryRow {
  id: number;
  barcode: string;
  description: string;
  category: string;
  expiry_date: string;
  pic_id: number;
  pic_name: string;
  logged_at: string;
  notes: string | null;
  stock_id: string | null;
  uom: string | null;
  quantity: number;
  return_status: string | null;
  return_by_date: string | null;
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

  const db = getDb();

  const rows =
    user.role === "manager"
      ? (db.prepare("SELECT * FROM expiry_logs ORDER BY expiry_date ASC").all() as unknown as ExpiryRow[])
      : (db
          .prepare("SELECT * FROM expiry_logs WHERE pic_id = ? ORDER BY expiry_date ASC")
          .all(user.userId) as unknown as ExpiryRow[]);

  return NextResponse.json({ success: true, data: rows });
}

export async function POST(req: NextRequest) {
  const user = await auth(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { barcode, description, category, expiry_date, notes, stock_id, uom, quantity, return_status, return_by_date } =
    body ?? {};

  if (!barcode || !description || !category || !expiry_date) {
    return NextResponse.json(
      { success: false, error: "barcode, description, category, and expiry_date are required" },
      { status: 400 }
    );
  }

  const qty = Number(quantity) > 0 ? Math.round(Number(quantity)) : 1;
  const validReturnStatus = ["pending", "non-returnable", "returned"];
  const rs = return_status && validReturnStatus.includes(return_status) ? return_status : null;

  const db = getDb();
  const logged_at = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO expiry_logs
        (barcode, description, category, expiry_date, pic_id, pic_name, logged_at, notes,
         stock_id, uom, quantity, return_status, return_by_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      barcode.trim(),
      description.trim(),
      category.trim(),
      expiry_date,
      user.userId,
      user.picName,
      logged_at,
      notes?.trim() || null,
      stock_id?.trim() || null,
      uom?.trim() || null,
      qty,
      rs,
      rs === "pending" ? (return_by_date || null) : null
    );

  const newId = Number(result.lastInsertRowid);

  db.prepare(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    "CREATE",
    "expiry",
    newId,
    user.userId,
    user.picName,
    `Logged expiry: ${description.trim()} (${expiry_date}) qty=${qty}`,
    logged_at
  );

  const entry = db
    .prepare("SELECT * FROM expiry_logs WHERE id = ?")
    .get(newId) as unknown as ExpiryRow;

  return NextResponse.json({ success: true, data: entry }, { status: 201 });
}
