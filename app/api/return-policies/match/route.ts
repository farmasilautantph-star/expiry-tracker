import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

/**
 * Brand-match a product description against the return_policies table so the
 * Log New Expiry form can auto-prefill Return Status / Return By Date.
 *
 * Matching (case-insensitive):
 *   - Find every policy whose non-empty `brand` appears as a substring anywhere
 *     in the product description.
 *   - Rank: a brand that equals the FIRST WORD of the description wins; otherwise
 *     the longest brand (most specific) wins.
 *
 * Returns the single best match, or { data: null } when nothing matches (the
 * form then leaves Return Status at its existing default — no behaviour change).
 */
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

  let description = "";
  try {
    const body = await req.json();
    description = String(body?.description ?? "").trim();
  } catch {
    /* ignore — handled below */
  }

  if (!description) {
    return NextResponse.json({ success: true, data: null });
  }

  // Candidate policies whose brand is a substring of the description.
  const rows = (
    await pool.query(
      `SELECT brand, supplier_name, return_type, months_before_expiry, special_conditions
         FROM return_policies
        WHERE COALESCE(brand, '') <> ''
          AND POSITION(UPPER(brand) IN UPPER($1)) > 0`,
      [description],
    )
  ).rows as Array<{
    brand: string;
    supplier_name: string;
    return_type: string;
    months_before_expiry: number | null;
    special_conditions: string | null;
  }>;

  if (rows.length === 0) {
    return NextResponse.json({ success: true, data: null });
  }

  const firstWord = description.split(/\s+/)[0]?.toUpperCase() ?? "";

  const best = rows
    .map((r) => ({
      row: r,
      isFirstWord: r.brand.toUpperCase() === firstWord,
      len: r.brand.length,
    }))
    .sort((a, b) => {
      if (a.isFirstWord !== b.isFirstWord) return a.isFirstWord ? -1 : 1;
      return b.len - a.len;
    })[0].row;

  return NextResponse.json({ success: true, data: best });
}
