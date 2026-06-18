import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface DuplicateRow {
  description: string;
  barcode: string;
  expiry_date: string;
  logged_at: string;
  pic_name: string;
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

export async function POST(req: NextRequest) {
  const user = await auth(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // Managers bypass duplicate check entirely
  if (user.role === "manager") {
    return NextResponse.json({ success: true, data: { type: "clear" } });
  }

  const body = await req.json().catch(() => null);
  const { stock_id, barcode, description, expiry_date } = body ?? {};

  if (!expiry_date || (!barcode?.trim() && !stock_id?.trim() && !description?.trim())) {
    return NextResponse.json({ success: true, data: { type: "clear" } });
  }

  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (barcode?.trim()) {
    conditions.push("(barcode = ? AND pic_id = ?)");
    params.push(barcode.trim(), user.userId);
  }
  if (stock_id?.trim()) {
    conditions.push("(stock_id = ? AND pic_id = ?)");
    params.push(stock_id.trim(), user.userId);
  }
  if (description?.trim()) {
    conditions.push("(LOWER(description) = LOWER(?) AND pic_id = ?)");
    params.push(description.trim(), user.userId);
  }

  const rows = db
    .prepare(
      `SELECT description, barcode, expiry_date, logged_at, pic_name
       FROM expiry_logs
       WHERE ${conditions.join(" OR ")}
       ORDER BY logged_at DESC
       LIMIT 5`,
    )
    .all(...params) as unknown as DuplicateRow[];

  if (rows.length === 0) {
    return NextResponse.json({ success: true, data: { type: "clear" } });
  }

  // Exact date match → block
  const exact = rows.find((r) => r.expiry_date.startsWith(expiry_date));
  if (exact) {
    return NextResponse.json({
      success: true,
      data: {
        type: "exact",
        message: "Duplicate detected",
        existing: {
          description: exact.description,
          barcode: exact.barcode,
          expiry_date: exact.expiry_date.split("T")[0],
          logged_at: exact.logged_at.split("T")[0],
          pic_name: exact.pic_name,
        },
      },
    });
  }

  // Different date → warn
  const warn = rows[0];
  return NextResponse.json({
    success: true,
    data: {
      type: "warning",
      message: "Item logged before with different date",
      existing: {
        description: warn.description,
        barcode: warn.barcode,
        expiry_date: warn.expiry_date.split("T")[0],
        logged_at: warn.logged_at.split("T")[0],
        pic_name: warn.pic_name,
      },
    },
  });
}
