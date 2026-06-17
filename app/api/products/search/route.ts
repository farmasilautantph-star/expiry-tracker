import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
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
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT id, stock_id, barcode, description, uom, category_id
       FROM products
       WHERE stock_id LIKE ? OR barcode LIKE ? OR description LIKE ?
       LIMIT 10`,
    )
    .all(like, like, like) as unknown as ProductRow[];

  return NextResponse.json({ success: true, data: rows });
}
