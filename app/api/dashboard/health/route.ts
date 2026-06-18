import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface ExpiryRow {
  id: number;
  description: string;
  barcode: string;
  category: string;
  pic_name: string;
  pic_id: number;
  logged_at: string;
  quantity: number;
  return_status: string | null;
  last_reviewed_at: string | null;
}

function calcDaysSince(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ref = new Date(isoDate);
  ref.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - ref.getTime()) / 86_400_000);
}

function computeReviewStatus(
  row: ExpiryRow,
): { status: string; days_since_review: number } {
  if (row.return_status === "returned" || row.quantity === 0) {
    return { status: "resolved", days_since_review: 0 };
  }
  const ref = row.last_reviewed_at ?? row.logged_at;
  const days = calcDaysSince(ref);

  let status: string;
  if (days <= 7) status = "pending";
  else if (days <= 14) status = "needs_review";
  else status = "critical_stale";

  return { status, days_since_review: days };
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

  const db = getDb();

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  // Only consider active items for health scoring
  conditions.push("item_status = 'active'");

  if (user.role !== "manager") {
    conditions.push("pic_id = ?");
    bindings.push(user.userId);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const rows = db
    .prepare(
      `SELECT id, description, barcode, category, pic_name, pic_id,
              logged_at, quantity, return_status, last_reviewed_at
       FROM expiry_logs
       ${where}
       ORDER BY logged_at DESC`,
    )
    .all(...bindings) as unknown as ExpiryRow[];

  const annotated = rows.map((row) => {
    const { status, days_since_review } = computeReviewStatus(row);
    return { ...row, computed_status: status, days_since_review };
  });

  const totalActive = annotated.filter(
    (r) => r.computed_status !== "resolved",
  ).length;
  const upToDate = annotated.filter(
    (r) => r.computed_status === "pending",
  ).length;
  const needsReview = annotated.filter(
    (r) => r.computed_status === "needs_review",
  ).length;
  const criticalStale = annotated.filter(
    (r) => r.computed_status === "critical_stale",
  ).length;
  const resolved = annotated.filter(
    (r) => r.computed_status === "resolved",
  ).length;
  const score =
    totalActive === 0 ? 100 : Math.round((upToDate / totalActive) * 100);

  const staleItems = annotated
    .filter(
      (r) =>
        r.computed_status === "needs_review" ||
        r.computed_status === "critical_stale",
    )
    .sort((a, b) => b.days_since_review - a.days_since_review)
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      description: r.description,
      barcode: r.barcode,
      category: r.category,
      pic_name: r.pic_name,
      last_reviewed_at: r.last_reviewed_at,
      days_since_review: r.days_since_review,
      review_status: r.computed_status,
    }));

  const picMap = new Map<
    string,
    {
      total: number;
      reviewed_on_time: number;
      needs_review: number;
      critical_stale: number;
    }
  >();

  for (const r of annotated) {
    if (r.computed_status === "resolved") continue;
    if (!picMap.has(r.pic_name)) {
      picMap.set(r.pic_name, {
        total: 0,
        reviewed_on_time: 0,
        needs_review: 0,
        critical_stale: 0,
      });
    }
    const pic = picMap.get(r.pic_name)!;
    pic.total++;
    if (r.computed_status === "pending") pic.reviewed_on_time++;
    else if (r.computed_status === "needs_review") pic.needs_review++;
    else if (r.computed_status === "critical_stale") pic.critical_stale++;
  }

  const completionRates = Array.from(picMap.entries())
    .map(([pic_name, stats]) => ({
      pic_name,
      total: stats.total,
      reviewed_on_time: stats.reviewed_on_time,
      needs_review: stats.needs_review,
      critical_stale: stats.critical_stale,
      completion_rate:
        stats.total === 0
          ? 100
          : Math.round((stats.reviewed_on_time / stats.total) * 100),
    }))
    .sort((a, b) => a.pic_name.localeCompare(b.pic_name));

  // Completion stats
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);

  interface CountRow { cnt: number }

  const completedTodayRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM expiry_logs
       WHERE item_status IN ('sold','completed')
         AND DATE(completed_at) = ?`,
    )
    .get(today) as unknown as CountRow;

  const soldThisMonthRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM expiry_logs
       WHERE completed_via = 'sold'
         AND strftime('%Y-%m', completed_at) = ?`,
    )
    .get(currentMonth) as unknown as CountRow;

  const returnedThisMonthRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM expiry_logs
       WHERE completed_via = 'returned'
         AND strftime('%Y-%m', completed_at) = ?`,
    )
    .get(currentMonth) as unknown as CountRow;

  return NextResponse.json({
    success: true,
    data: {
      systemHealth: {
        score,
        totalActive,
        upToDate,
        needsReview,
        criticalStale,
        resolved,
      },
      staleItems,
      completionRates,
      completedToday: completedTodayRow?.cnt ?? 0,
      soldThisMonth: soldThisMonthRow?.cnt ?? 0,
      returnedThisMonth: returnedThisMonthRow?.cnt ?? 0,
    },
  });
}
