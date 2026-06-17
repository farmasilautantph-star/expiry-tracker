import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
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

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

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

  // Category breakdown — expiry status per category
  const categoryRows = db.prepare(`
    SELECT
      category,
      SUM(CASE WHEN date(expiry_date) < date('now') THEN 1 ELSE 0 END) AS expired,
      SUM(CASE WHEN date(expiry_date) >= date('now')
               AND CAST(julianday(expiry_date) - julianday('now') AS INTEGER) <= 7
               THEN 1 ELSE 0 END) AS critical,
      SUM(CASE WHEN CAST(julianday(expiry_date) - julianday('now') AS INTEGER) > 7
               AND CAST(julianday(expiry_date) - julianday('now') AS INTEGER) <= 30
               THEN 1 ELSE 0 END) AS warning,
      SUM(CASE WHEN CAST(julianday(expiry_date) - julianday('now') AS INTEGER) > 30
               THEN 1 ELSE 0 END) AS safe
    FROM expiry_logs
    WHERE 1=1 ${picFilter}
    GROUP BY category
    ORDER BY category ASC
  `).all(...picBinding) as unknown as CategoryRow[];

  // Expiry timeline — items expiring each month for next 6 months
  const timelineRows = db.prepare(`
    SELECT
      strftime('%m', expiry_date) AS month_key,
      strftime('%Y', expiry_date) AS year,
      COUNT(*) AS count
    FROM expiry_logs
    WHERE date(expiry_date) >= date('now')
      AND date(expiry_date) <= date('now', '+6 months')
      ${picFilter}
    GROUP BY strftime('%Y-%m', expiry_date)
    ORDER BY expiry_date ASC
  `).all(...picBinding) as unknown as TimelineRow[];

  const expiryTimeline = timelineRows.map((r) => ({
    month: `${MONTH_NAMES[parseInt(r.month_key, 10) - 1]} ${r.year}`,
    count: r.count,
  }));

  // Return status — from returns table
  const returnStatusRow = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned,
      SUM(CASE WHEN status = 'pending'
               AND (return_by_date IS NULL OR date(return_by_date) >= date('now'))
               THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'pending'
               AND return_by_date IS NOT NULL
               AND date(return_by_date) < date('now')
               THEN 1 ELSE 0 END) AS overdue
    FROM returns
    WHERE 1=1 ${picFilter}
  `).get(...picBinding) as unknown as ReturnStatusRow;

  const returnStatus = {
    pending:  returnStatusRow.pending  ?? 0,
    returned: returnStatusRow.returned ?? 0,
    overdue:  returnStatusRow.overdue  ?? 0,
  };

  // Top urgent items — expired + critical + warning, max 10
  const urgentRows = db.prepare(`
    SELECT
      id,
      description,
      category,
      expiry_date,
      pic_name,
      CAST(julianday(expiry_date) - julianday('now') AS INTEGER) AS days_left
    FROM expiry_logs
    WHERE date(expiry_date) <= date('now', '+30 days')
      ${picFilter}
    ORDER BY expiry_date ASC
    LIMIT 10
  `).all(...picBinding) as unknown as UrgentRow[];

  const topUrgentItems = urgentRows.map((r) => ({
    id:          r.id,
    description: r.description,
    category:    r.category,
    expiry_date: r.expiry_date,
    days_left:   r.days_left,
    urgency:     r.days_left <= 0 ? "expired" : r.days_left <= 7 ? "critical" : "warning",
    pic_name:    r.pic_name,
  }));

  return NextResponse.json({
    success: true,
    categoryBreakdown: categoryRows,
    expiryTimeline,
    returnStatus,
    topUrgentItems,
  });
}
