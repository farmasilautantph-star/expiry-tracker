import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExistsRow {
  id: number;
  description: string;
  barcode: string;
  expiry_date: string;
  quantity: number;
  pic_name: string;
  logged_at: string;
  category: string;
  uom: string | null;
}

interface WarnRow {
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

  const body = await req.json().catch(() => null);
  const { stock_id, barcode, description, expiry_date } = body ?? {};

  if (!expiry_date || (!barcode?.trim() && !stock_id?.trim() && !description?.trim())) {
    return NextResponse.json({ success: true, data: { type: "clear" } });
  }

  const db = getDb();

  // Check for exact duplicate: same barcode/stock_id + same expiry, any PIC
  const exactConditions: string[] = [];
  const exactParams: (string | number)[] = [];

  if (barcode?.trim()) {
    exactConditions.push("barcode = ?");
    exactParams.push(barcode.trim());
  }
  if (stock_id?.trim()) {
    exactConditions.push("stock_id = ?");
    exactParams.push(stock_id.trim());
  }

  if (exactConditions.length > 0) {
    const exactRow = db
      .prepare(
        `SELECT id, description, barcode, expiry_date, quantity, pic_name, logged_at, category, uom
         FROM expiry_logs
         WHERE (${exactConditions.join(" OR ")})
           AND expiry_date LIKE ?
         ORDER BY logged_at DESC
         LIMIT 1`,
      )
      .get(...exactParams, `${expiry_date}%`) as unknown as ExistsRow | undefined;

    if (exactRow) {
      return NextResponse.json({
        success: true,
        data: {
          type: "exists",
          existing: {
            id: exactRow.id,
            description: exactRow.description,
            barcode: exactRow.barcode,
            expiry_date: exactRow.expiry_date.split("T")[0],
            current_qty: exactRow.quantity,
            pic_name: exactRow.pic_name,
            logged_at: exactRow.logged_at.split("T")[0],
            category: exactRow.category,
            uom: exactRow.uom ?? "",
          },
        },
      });
    }
  }

  // Check for same item different expiry (warning) — barcode or description match
  const warnConditions: string[] = [];
  const warnParams: (string | number)[] = [];

  if (barcode?.trim()) {
    warnConditions.push("barcode = ?");
    warnParams.push(barcode.trim());
  }
  if (stock_id?.trim()) {
    warnConditions.push("stock_id = ?");
    warnParams.push(stock_id.trim());
  }
  if (description?.trim()) {
    warnConditions.push("LOWER(description) = LOWER(?)");
    warnParams.push(description.trim());
  }

  if (warnConditions.length === 0) {
    return NextResponse.json({ success: true, data: { type: "clear" } });
  }

  const warnRows = db
    .prepare(
      `SELECT description, barcode, expiry_date, logged_at, pic_name
       FROM expiry_logs
       WHERE (${warnConditions.join(" OR ")})
         AND expiry_date NOT LIKE ?
       ORDER BY logged_at DESC
       LIMIT 5`,
    )
    .all(...warnParams, `${expiry_date}%`) as unknown as WarnRow[];

  if (warnRows.length === 0) {
    return NextResponse.json({ success: true, data: { type: "clear" } });
  }

  const warn = warnRows[0];
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
