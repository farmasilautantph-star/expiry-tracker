import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryRow {
  expiry_date: string;
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

  const db = getDb();
  const rows = db
    .prepare("SELECT expiry_date FROM expiry_logs")
    .all() as unknown as ExpiryRow[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in7 = new Date(today);
  in7.setDate(today.getDate() + 7);

  const in30 = new Date(today);
  in30.setDate(today.getDate() + 30);

  let expired = 0;
  let critical = 0;
  let warning = 0;
  let safe = 0;

  for (const row of rows) {
    const d = new Date(row.expiry_date);
    d.setHours(0, 0, 0, 0);

    if (d < today) {
      expired++;
    } else if (d <= in7) {
      critical++;
    } else if (d <= in30) {
      warning++;
    } else {
      safe++;
    }
  }

  return NextResponse.json({
    success: true,
    data: { expired, critical, warning, safe },
  });
}
