import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface WeekRow {
  week_num: number;
  expired: number;
  critical: number;
  warning: number;
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

  const isManager = user.role === "manager";
  const picFilter = isManager ? "" : "AND pic_id = ?";
  const picBinding: number[] = isManager ? [] : [user.userId];

  const db = getDb();

  const rows = db
    .prepare(
      `
    SELECT
      (8 - CAST((julianday('now') - julianday(logged_at)) / 7 AS INTEGER)) AS week_num,
      SUM(CASE WHEN date(expiry_date) < date('now') THEN 1 ELSE 0 END) AS expired,
      SUM(CASE WHEN date(expiry_date) >= date('now')
               AND CAST(julianday(expiry_date) - julianday('now') AS INTEGER) <= 7
               THEN 1 ELSE 0 END) AS critical,
      SUM(CASE WHEN CAST(julianday(expiry_date) - julianday('now') AS INTEGER) > 7
               AND CAST(julianday(expiry_date) - julianday('now') AS INTEGER) <= 30
               THEN 1 ELSE 0 END) AS warning
    FROM expiry_logs
    WHERE logged_at >= datetime('now', '-56 days')
      ${picFilter}
    GROUP BY week_num
    HAVING week_num BETWEEN 1 AND 8
    ORDER BY week_num ASC
  `,
    )
    .all(...picBinding) as unknown as WeekRow[];

  const weekMap = new Map(rows.map((r) => [r.week_num, r]));
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const weekNum = i + 1;
    const row = weekMap.get(weekNum);
    return {
      week: `W${weekNum}`,
      expired: row?.expired ?? 0,
      critical: row?.critical ?? 0,
      warning: row?.warning ?? 0,
    };
  });

  const curr = weekMap.get(8) ?? { expired: 0, critical: 0, warning: 0 };
  const prev = weekMap.get(7) ?? { expired: 0, critical: 0, warning: 0 };

  function pct(c: number, p: number) {
    if (p === 0) return c > 0 ? 100 : 0;
    return Math.round(((c - p) / p) * 100);
  }

  const trend = {
    expired: pct(curr.expired, prev.expired),
    critical: pct(curr.critical, prev.critical),
    warning: pct(curr.warning, prev.warning),
  };

  return NextResponse.json({ success: true, weeks, trend });
}
