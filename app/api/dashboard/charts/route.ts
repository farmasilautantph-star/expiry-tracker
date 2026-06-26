import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface CategoryRow {
  category: string;
  expired: number;
  critical: number;
  warning: number;
  safe: number;
}

interface TimelineRow {
  month_key: string;
  year: string;
  count: number;
}

interface ReturnStatusRow {
  pending: number;
  returned: number;
  overdue: number;
}

interface UrgentRow {
  id: number;
  description: string;
  category: string;
  expiry_date: string;
  days_left: number;
  pic_name: string;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const isManager = user.role === "manager";
  const picFilter = isManager ? "" : "AND pic_id = $1";
  const picBinding: number[] = isManager ? [] : [user.userId];

  // Category breakdown — expiry status per category
  const categoryRows = (
    await pool.query(
      `
    SELECT
      category,
      SUM(CASE WHEN (expiry_date)::date < CURRENT_DATE THEN 1 ELSE 0 END) AS expired,
      SUM(CASE WHEN (expiry_date)::date >= CURRENT_DATE
               AND ((expiry_date)::date - CURRENT_DATE) <= 7
               THEN 1 ELSE 0 END) AS critical,
      SUM(CASE WHEN ((expiry_date)::date - CURRENT_DATE) > 7
               AND ((expiry_date)::date - CURRENT_DATE) <= 30
               THEN 1 ELSE 0 END) AS warning,
      SUM(CASE WHEN ((expiry_date)::date - CURRENT_DATE) > 30
               THEN 1 ELSE 0 END) AS safe
    FROM expiry_logs
    WHERE 1=1 ${picFilter}
    GROUP BY category
    ORDER BY category ASC
  `,
      picBinding,
    )
  ).rows as unknown as CategoryRow[];

  // Expiry timeline — items expiring each month for next 6 months
  const timelineRows = (
    await pool.query(
      `
    SELECT
      to_char((expiry_date)::timestamp, 'MM') AS month_key,
      to_char((expiry_date)::timestamp, 'YYYY') AS year,
      COUNT(*) AS count
    FROM expiry_logs
    WHERE (expiry_date)::date >= CURRENT_DATE
      AND (expiry_date)::date <= (CURRENT_DATE + INTERVAL '6 months')
      ${picFilter}
    GROUP BY to_char((expiry_date)::timestamp, 'YYYY-MM'), to_char((expiry_date)::timestamp, 'MM'), to_char((expiry_date)::timestamp, 'YYYY')
    ORDER BY to_char((expiry_date)::timestamp, 'YYYY-MM') ASC
  `,
      picBinding,
    )
  ).rows as unknown as TimelineRow[];

  const expiryTimeline = timelineRows.map((r) => ({
    month: `${MONTH_NAMES[parseInt(r.month_key, 10) - 1]} ${r.year}`,
    count: Number(r.count),
  }));

  // Return status — derived from expiry_logs.return_status
  const returnStatusRow = (
    await pool.query(
      `
    SELECT
      SUM(CASE WHEN return_status = 'returned' THEN 1 ELSE 0 END) AS returned,
      SUM(CASE WHEN return_status = 'pending'
               AND item_status = 'active'
               AND (return_by_date IS NULL OR (return_by_date)::date >= CURRENT_DATE)
               THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN return_status = 'pending'
               AND item_status = 'active'
               AND return_by_date IS NOT NULL
               AND (return_by_date)::date < CURRENT_DATE
               THEN 1 ELSE 0 END) AS overdue
    FROM expiry_logs
    WHERE 1=1 ${picFilter}
  `,
      picBinding,
    )
  ).rows[0] as unknown as ReturnStatusRow;

  const returnStatus = {
    pending: Number(returnStatusRow?.pending ?? 0),
    returned: Number(returnStatusRow?.returned ?? 0),
    overdue: Number(returnStatusRow?.overdue ?? 0),
  };

  // Top urgent items — expired + critical + warning, max 10
  const urgentRows = (
    await pool.query(
      `
    SELECT
      id,
      description,
      category,
      expiry_date,
      pic_name,
      ((expiry_date)::date - CURRENT_DATE) AS days_left
    FROM expiry_logs
    WHERE (expiry_date)::date <= (CURRENT_DATE + INTERVAL '30 days')
      ${picFilter}
    ORDER BY expiry_date ASC
    LIMIT 10
  `,
      picBinding,
    )
  ).rows as unknown as UrgentRow[];

  const topUrgentItems = urgentRows.map((r) => ({
    id: r.id,
    description: r.description,
    category: r.category,
    expiry_date: r.expiry_date,
    days_left: Number(r.days_left),
    urgency:
      r.days_left <= 0 ? "expired" : r.days_left <= 7 ? "critical" : "warning",
    pic_name: r.pic_name,
  }));

  return NextResponse.json({
    success: true,
    categoryBreakdown: categoryRows,
    expiryTimeline,
    returnStatus,
    topUrgentItems,
  });
}
