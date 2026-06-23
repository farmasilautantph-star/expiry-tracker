import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import {
  getSundayReviewStatus,
  getNextSundayDisplay,
  getLastSundayDisplay,
  getPreviousSundayDisplay,
} from "@/lib/sunday-deadline";

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
  expiry_date: string;
}

interface UrgentItem {
  id: number;
  description: string;
  barcode: string;
  category: string;
  pic_name: string;
  expiry_date: string;
  days_left: number;
  urgency: "expired" | "critical";
  return_status: string | null;
  days_left_display: string;
}

function daysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / 86_400_000);
}

function calcDaysSince(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ref = new Date(isoDate);
  ref.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - ref.getTime()) / 86_400_000);
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Good",      color: "#16a34a" };
  if (score >= 60) return { label: "Monitor",   color: "#ca8a04" };
  if (score >= 40) return { label: "Attention", color: "#ea580c" };
  return               { label: "Critical",  color: "#dc2626" };
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const conditions: string[] = ["item_status = 'active'"];
  const bindings: (string | number)[] = [];

  if (user.role !== "manager") {
    conditions.push("pic_id = ?");
    bindings.push(user.userId);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const rows = db
    .prepare(
      `SELECT id, description, barcode, category, pic_name, pic_id,
              logged_at, quantity, return_status, last_reviewed_at, expiry_date
       FROM expiry_logs ${where} ORDER BY logged_at DESC`,
    )
    .all(...bindings) as unknown as ExpiryRow[];

  // ── Urgency-based health score ─────────────────────────────────────────────
  let expiredCount  = 0;
  let criticalCount = 0;
  let warningCount  = 0;
  let safeCount     = 0;

  for (const row of rows) {
    const daysLeft = daysUntilExpiry(row.expiry_date);
    if (daysLeft < 0)         expiredCount++;
    else if (daysLeft < 90)   criticalCount++;
    else if (daysLeft <= 240) warningCount++;
    else                      safeCount++;
  }

  const totalActive  = rows.length;
  const totalPenalty = expiredCount * 10 + criticalCount * 5 + warningCount * 1;
  const score        = Math.max(0, Math.round(100 - totalPenalty));
  const { label, color } = scoreLabel(score);

  // ── Sunday-rule review compliance ─────────────────────────────────────────
  const lastSundayStr = getLastSundayDisplay();
  const prevSundayStr = getPreviousSundayDisplay();
  const nextSundayStr = getNextSundayDisplay();

  type ReviewStatus = "pending" | "early_alert" | "last_chance" | "needs_review" | "critical_stale" | "resolved";

  const SORT_ORDER: Record<ReviewStatus, number> = {
    critical_stale: 0, needs_review: 1, last_chance: 2, early_alert: 3, pending: 4, resolved: 5,
  };

  const URGENCY_MAP: Record<ReviewStatus, string> = {
    critical_stale: "critical", needs_review: "missed", last_chance: "urgent", early_alert: "warn",
    pending: "ok", resolved: "ok",
  };

  interface Annotated extends ExpiryRow {
    computed_status: ReviewStatus;
    days_since_review: number;
    sunday_label: string;
  }

  const annotated: Annotated[] = rows.map((row) => {
    const status = getSundayReviewStatus(row.last_reviewed_at, row.logged_at, "active") as ReviewStatus;
    const ref = row.last_reviewed_at ?? row.logged_at;
    const days_since_review = calcDaysSince(ref);
    const sunday_label =
      status === "critical_stale" ? prevSundayStr :
      status === "needs_review"   ? lastSundayStr :
      nextSundayStr; // early_alert, last_chance → show upcoming deadline
    return { ...row, computed_status: status, days_since_review, sunday_label };
  });

  const staleItems = annotated
    .filter((r) => ["early_alert", "last_chance", "needs_review", "critical_stale"].includes(r.computed_status))
    .sort((a, b) => SORT_ORDER[a.computed_status] - SORT_ORDER[b.computed_status] || b.days_since_review - a.days_since_review)
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
      urgency: URGENCY_MAP[r.computed_status],
      sunday_label: r.sunday_label,
    }));

  // ── Manager: urgent items (expired + critical, sorted most urgent first) ────
  let urgentItems: UrgentItem[] | undefined;
  if (user.role === "manager") {
    urgentItems = rows
      .map((row) => {
        const daysLeft = daysUntilExpiry(row.expiry_date);
        if (daysLeft >= 90) return null;
        return {
          id: row.id,
          description: row.description,
          barcode: row.barcode,
          category: row.category,
          pic_name: row.pic_name,
          expiry_date: row.expiry_date,
          days_left: daysLeft,
          urgency: (daysLeft < 0 ? "expired" : "critical") as "expired" | "critical",
          return_status: row.return_status,
          days_left_display: daysLeft < 0 ? "Expired" : `${daysLeft}d left`,
        };
      })
      .filter((x): x is UrgentItem => x !== null)
      .sort((a, b) => a.days_left - b.days_left)
      .slice(0, 10);
  }

  // ── Per-PIC completion rates ───────────────────────────────────────────────
  const picMap = new Map<
    string,
    { total: number; reviewed_on_time: number; needs_review: number; critical_stale: number }
  >();

  for (const r of annotated) {
    if (!picMap.has(r.pic_name)) {
      picMap.set(r.pic_name, { total: 0, reviewed_on_time: 0, needs_review: 0, critical_stale: 0 });
    }
    const pic = picMap.get(r.pic_name)!;
    pic.total++;
    if (r.computed_status === "pending") pic.reviewed_on_time++;
    else if (r.computed_status === "critical_stale") pic.critical_stale++;
    else pic.needs_review++; // early_alert, last_chance, needs_review all count as not-yet-reviewed
  }

  const completionRates = Array.from(picMap.entries())
    .map(([pic_name, stats]) => ({
      pic_name,
      total: stats.total,
      reviewed_on_time: stats.reviewed_on_time,
      needs_review: stats.needs_review,
      critical_stale: stats.critical_stale,
      completion_rate:
        stats.total === 0 ? 100 : Math.round((stats.reviewed_on_time / stats.total) * 100),
    }))
    .sort((a, b) => a.pic_name.localeCompare(b.pic_name));

  // ── Completion activity stats ──────────────────────────────────────────────
  const today       = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);
  interface CountRow { cnt: number }

  const completedTodayRow = db
    .prepare(`SELECT COUNT(*) AS cnt FROM expiry_logs WHERE item_status IN ('sold','completed') AND DATE(completed_at) = ?`)
    .get(today) as unknown as CountRow;

  const soldThisMonthRow = db
    .prepare(`SELECT COUNT(*) AS cnt FROM expiry_logs WHERE completed_via = 'sold' AND strftime('%Y-%m', completed_at) = ?`)
    .get(currentMonth) as unknown as CountRow;

  const returnedThisMonthRow = db
    .prepare(`SELECT COUNT(*) AS cnt FROM expiry_logs WHERE completed_via = 'returned' AND strftime('%Y-%m', completed_at) = ?`)
    .get(currentMonth) as unknown as CountRow;

  return NextResponse.json({
    success: true,
    data: {
      systemHealth: {
        score,
        label,
        color,
        totalActive,
        expired:  { count: expiredCount,  penalty: expiredCount  * 10 },
        critical: { count: criticalCount, penalty: criticalCount * 5  },
        warning:  { count: warningCount,  penalty: warningCount  * 1  },
        safe:     { count: safeCount,     penalty: 0                  },
        totalPenalty,
      },
      reviewDeadline: {
        lastSunday:  lastSundayStr,
        nextSunday:  getNextSundayDisplay(),
        prevSunday:  prevSundayStr,
        timezone:    "Malaysia Time (GMT+8)",
      },
      staleItems,
      urgentItems,
      completionRates,
      completedToday:    completedTodayRow?.cnt    ?? 0,
      soldThisMonth:     soldThisMonthRow?.cnt     ?? 0,
      returnedThisMonth: returnedThisMonthRow?.cnt ?? 0,
    },
  });
}
