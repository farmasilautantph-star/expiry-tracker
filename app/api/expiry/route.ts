import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
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
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const rows =
    user.role === "manager"
      ? ((await pool.query(
          "SELECT * FROM expiry_logs ORDER BY expiry_date ASC",
        )).rows as unknown as ExpiryRow[])
      : ((await pool.query(
          "SELECT * FROM expiry_logs WHERE pic_id = $1 ORDER BY expiry_date ASC",
          [user.userId],
        )).rows as unknown as ExpiryRow[]);

  return NextResponse.json({ success: true, data: rows });
}

export async function POST(req: NextRequest) {
  const user = await auth(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const {
    barcode,
    description,
    category,
    expiry_date,
    notes,
    stock_id,
    uom,
    quantity,
    return_status,
    return_by_date,
  } = body ?? {};

  if (!barcode || !description || !category || !expiry_date) {
    return NextResponse.json(
      {
        success: false,
        error: "barcode, description, category, and expiry_date are required",
      },
      { status: 400 },
    );
  }

  const qty = Number(quantity) > 0 ? Math.round(Number(quantity)) : 1;
  const validReturnStatus = ["pending", "non-returnable", "returned"];
  const rs =
    return_status && validReturnStatus.includes(return_status)
      ? return_status
      : null;

  const logged_at = new Date().toISOString();

  const result = await pool.query(
    `INSERT INTO expiry_logs
        (barcode, description, category, expiry_date, pic_id, pic_name, logged_at, notes,
         stock_id, uom, quantity, return_status, return_by_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
    [
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
      rs === "pending" ? return_by_date || null : null,
    ],
  );

  const newId = result.rows[0].id as number;

  await pool.query(
    "INSERT INTO history_log (action, module, record_id, pic_id, pic_name, description, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      "CREATE",
      "expiry",
      newId,
      user.userId,
      user.picName,
      `Logged expiry: ${description.trim()} (${expiry_date}) qty=${qty}`,
      logged_at,
    ],
  );

  const entry = (await pool.query(
    "SELECT * FROM expiry_logs WHERE id = $1",
    [newId],
  )).rows[0] as unknown as ExpiryRow;

  return NextResponse.json({ success: true, data: entry }, { status: 201 });
}
