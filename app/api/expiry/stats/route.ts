import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
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

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const whereClause =
    user.role !== "manager"
      ? "WHERE item_status = 'active' AND pic_id = $1"
      : "WHERE item_status = 'active'";
  const params: (string | number)[] =
    user.role !== "manager" ? [user.userId] : [];

  const [urgencyResult, pushResult] = await Promise.all([
    pool.query(
      `SELECT expiry_date FROM expiry_logs ${whereClause}`,
      params,
    ),
    // Push count is always outlet-wide regardless of role
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM expiry_logs WHERE item_status = 'active' AND is_push_item = TRUE`,
    ),
  ]);

  const rows = urgencyResult.rows as unknown as Pick<ExpiryRow, "expiry_date">[];
  const push: number = (pushResult.rows[0] as { cnt: number }).cnt;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let expired = 0;
  let critical = 0;
  let warning = 0;
  let safe = 0;

  for (const row of rows) {
    const d = new Date(row.expiry_date);
    d.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((d.getTime() - today.getTime()) / 86_400_000);

    if (daysLeft < 0)          expired++;
    else if (daysLeft < 90)    critical++;
    else if (daysLeft <= 240)  warning++;
    else                       safe++;
  }

  return NextResponse.json({
    success: true,
    data: { expired, critical, warning, safe, push },
  });
}
