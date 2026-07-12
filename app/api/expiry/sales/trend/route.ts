import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { parseLastSoldDate, computeUnitsSold } from "@/lib/salesCalc";

interface Row {
  original_qty: number | null;
  quantity: number;
  sold_at: string | null;
  notes: string | null;
  completed_notes: string | null;
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const conditions = [
    "(original_qty IS NOT NULL OR notes LIKE '%unit(s) sold%' OR item_status = 'sold')",
  ];
  const bindings: number[] = [];
  if (user.role !== "manager") {
    conditions.push("pic_id = $1");
    bindings.push(user.userId);
  }

  const rows = (
    await pool.query(
      `SELECT original_qty, quantity, sold_at, notes, completed_notes
         FROM expiry_logs WHERE ${conditions.join(" AND ")}`,
      bindings,
    )
  ).rows as unknown as Row[];

  // Fixed rolling 10-month window ending at the current calendar month —
  // intentionally independent of any page filter (unlike /api/expiry/sales).
  const now = new Date();
  const months: { key: string; label: string; longLabel: string }[] = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-MY", { month: "short" }),
      longLabel: d.toLocaleString("en-MY", { month: "long", year: "numeric" }),
    });
  }

  const totals = new Map(months.map((m) => [m.key, 0]));
  for (const row of rows) {
    const lastSold = parseLastSoldDate(row.sold_at, row.notes);
    if (!lastSold) continue;
    const key = lastSold.slice(0, 7);
    if (!totals.has(key)) continue;
    totals.set(key, (totals.get(key) ?? 0) + (computeUnitsSold(row) ?? 0));
  }

  const data = months.map((m) => ({
    month: m.key,
    label: m.label,
    longLabel: m.longLabel,
    units: totals.get(m.key) ?? 0,
  }));

  return NextResponse.json({ success: true, data });
}
