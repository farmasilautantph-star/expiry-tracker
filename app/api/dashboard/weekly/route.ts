import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
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
  const picFilter = isManager ? "" : "AND pic_id = $1";
  const picBinding: number[] = isManager ? [] : [user.userId];

  const rows = (
    await pool.query(
      `
    SELECT
      (8 - ((CURRENT_DATE - (logged_at)::date) / 7))::int AS week_num,
      SUM(CASE WHEN (expiry_date)::date < CURRENT_DATE THEN 1 ELSE 0 END) AS expired,
      SUM(CASE WHEN (expiry_date)::date >= CURRENT_DATE
               AND ((expiry_date)::date - CURRENT_DATE) < 90
               THEN 1 ELSE 0 END) AS critical,
      SUM(CASE WHEN ((expiry_date)::date - CURRENT_DATE) >= 90
               AND ((expiry_date)::date - CURRENT_DATE) <= 240
               THEN 1 ELSE 0 END) AS warning
    FROM expiry_logs
    WHERE (logged_at)::timestamp >= (NOW() - INTERVAL '56 days')
      ${picFilter}
    GROUP BY week_num
    HAVING (8 - ((CURRENT_DATE - (logged_at)::date) / 7))::int BETWEEN 1 AND 8
    ORDER BY week_num ASC
  `,
      picBinding,
    )
  ).rows.map((r) => ({
    week_num: Number(r.week_num),
    expired: Number(r.expired),
    critical: Number(r.critical),
    warning: Number(r.warning),
  })) as WeekRow[];

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
