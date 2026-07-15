import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { matchReturnPolicy } from "@/lib/return-policy-match";

/**
 * Matches a product description against return_policies so the Log New
 * Expiry form can auto-prefill Return Status / Return By Date.
 *
 * Matching logic lives in lib/return-policy-match.ts — shared with the
 * standalone Quick Return Policy Check tool (app/api/return-policy/check).
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

  const match = await matchReturnPolicy(description);
  return NextResponse.json({ success: true, data: match });
}
