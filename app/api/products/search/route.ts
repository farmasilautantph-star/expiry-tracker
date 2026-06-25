import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ProductRow {
  id: number;
  stock_id: string | null;
  barcode: string | null;
  description: string | null;
  uom: string | null;
  category_id: string | null;
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    await verifyToken(token);
  } catch {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  const like = `%${q}%`;

  const rows = (
    await pool.query(
      `SELECT id, stock_id, barcode, description, uom, category_id
       FROM products
       WHERE stock_id ILIKE $1 OR barcode ILIKE $2 OR description ILIKE $3
       LIMIT 10`,
      [like, like, like],
    )
  ).rows as unknown as ProductRow[];

  return NextResponse.json({ success: true, data: rows });
}
