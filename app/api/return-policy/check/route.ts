import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { matchReturnPolicy } from "@/lib/return-policy-match";

/**
 * Quick Return Policy Check — read-only barcode/product lookup.
 *
 * Accepts a barcode OR product description search term, resolves it against
 * the products table (same table used by Log New Expiry's product search),
 * then runs the shared return-policy matching logic against the resolved
 * product's description. Never writes anything — purely informational.
 */
interface ProductRow {
  barcode: string | null;
  description: string | null;
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let query = "";
  try {
    const body = await req.json();
    query = String(body?.query ?? "").trim();
  } catch {
    /* ignore — handled below */
  }

  if (!query) {
    return NextResponse.json({ success: true, data: { product: null, policy: null } });
  }

  const like = `%${query}%`;
  const product = (
    await pool.query(
      `SELECT barcode, description
         FROM products
        WHERE barcode = $1 OR barcode ILIKE $2 OR stock_id ILIKE $2 OR description ILIKE $2
        ORDER BY (barcode = $1) DESC, LENGTH(description) ASC
        LIMIT 1`,
      [query, like],
    )
  ).rows[0] as ProductRow | undefined;

  if (!product?.description) {
    return NextResponse.json({ success: true, data: { product: null, policy: null } });
  }

  const policy = await matchReturnPolicy(product.description);

  return NextResponse.json({
    success: true,
    data: {
      product: { barcode: product.barcode, description: product.description },
      policy,
    },
  });
}
