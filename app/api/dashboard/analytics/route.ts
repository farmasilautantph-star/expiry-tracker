import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

// ── Row types ──────────────────────────────────────────────────────────────

interface ExpiryLogRow {
  category: string;
  expiry_date: string; // ISO string stored in DB
}

interface MonthCountRow {
  mo: string; // "YYYY-MM"
  cnt: number;
}

// ── Output types ───────────────────────────────────────────────────────────

type RiskLevel = "high" | "medium" | "low";

interface CategoryHeatmapEntry {
  category: string;
  expired: number;
  critical: number;
  warning: number;
  safe: number;
  total: number;
  riskScore: number;
  riskLevel: RiskLevel;
}

interface MonthlyTrendEntry {
  month: string; // "Jun 2026"
  logged: number;
  sold: number;
  returned: number;
  offered: number;
}

interface MonthAvgRow {
  mo: string;
  avg_days: number | string | null;
  cnt: number | string;
}

interface SystemImpact {
  resolutionRate: {
    resolved: number;
    expiredUnresolved: number;
    ratePct: number;
    trend: { month: string; rate: number | null }[];
    deltaPct: number;
    sinceLabel: string;
  };
  timeToResolution: {
    avgDays: number | null;
    prevAvgDays: number | null;
    deltaDays: number | null; // prev − current; positive = faster (improvement)
    trend: { month: string; days: number | null }[];
    firstLabel: string;
    firstValue: number | null;
    lastLabel: string;
    lastValue: number | null;
  };
  complianceTrend: {
    trend: { month: string; pct: number | null }[];
    deltaPct: number;
    latestLabel: string;
    latestPct: number | null;
    oldestLabel: string;
    oldestPct: number | null;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildMonthMap(rows: MonthCountRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.mo) map.set(row.mo, Number(row.cnt));
  }
  return map;
}

interface MonthWindow {
  key: string; // "YYYY-MM"
  label: string; // "Feb"
  start: string; // "YYYY-MM-01"
  end: string; // "YYYY-MM-DD" (last day)
}

// The most recent N fully-completed calendar months (excludes the current,
// still-in-progress month so trend points are never misleadingly low).
// Returned oldest → newest.
function lastNCompletedMonths(n: number): MonthWindow[] {
  const now = new Date();
  const out: MonthWindow[] = [];
  for (let i = n; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth(); // 0-based
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    out.push({
      key,
      label: d.toLocaleString("en-GB", { month: "short" }),
      start: `${key}-01`,
      end: `${key}-${String(lastDay).padStart(2, "0")}`,
    });
  }
  return out;
}

// Weighted mean of per-month averages, weighting each month by its item count.
// Equivalent to the true average over the combined period.
function weightedAvg(
  items: { avg: number | null; cnt: number }[],
): number | null {
  let sum = 0;
  let total = 0;
  for (const it of items) {
    if (it.avg != null && it.cnt > 0) {
      sum += it.avg * it.cnt;
      total += it.cnt;
    }
  }
  return total > 0 ? sum / total : null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// ── Route ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth
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

  if (user.role !== "manager") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  const todayMs = new Date().setHours(0, 0, 0, 0);

  // ── 1. categoryHeatmap ────────────────────────────────────────────────────

  const allRows = (
    await pool.query(`SELECT category, expiry_date FROM expiry_logs`)
  ).rows as unknown as ExpiryLogRow[];

  // Group by category
  const categoryMap = new Map<
    string,
    { expired: number; critical: number; warning: number; safe: number }
  >();

  for (const row of allRows) {
    const cat = row.category ?? "Unknown";
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { expired: 0, critical: 0, warning: 0, safe: 0 });
    }
    const bucket = categoryMap.get(cat)!;

    const expiryMs = new Date(row.expiry_date).getTime();
    const daysLeft = Math.ceil((expiryMs - todayMs) / 86_400_000);

    if (daysLeft < 0) {
      bucket.expired++;
    } else if (daysLeft < 90) {
      bucket.critical++;
    } else if (daysLeft <= 240) {
      bucket.warning++;
    } else {
      bucket.safe++;
    }
  }

  // Compute raw risk scores per category, sorted highest-risk first.
  const scoredCategories = Array.from(categoryMap.entries())
    .map(([category, counts]) => {
      const { expired, critical, warning, safe } = counts;
      const total = expired + critical + warning + safe;
      const riskScore = expired * 10 + critical * 5 + warning * 1;
      return { category, expired, critical, warning, safe, total, riskScore };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  // Relative tiering: rank categories against each other rather than against
  // fixed thresholds (which never fit a constantly-changing dataset). The top
  // third by risk score becomes HIGH, the middle third MEDIUM, the rest LOW.
  // Categories with zero risk are always LOW regardless of position.
  const n = scoredCategories.length;
  const highCutoff = Math.ceil(n / 3);
  const mediumCutoff = Math.ceil((2 * n) / 3);
  const categoryHeatmap: CategoryHeatmapEntry[] = scoredCategories.map(
    (entry, index) => {
      let riskLevel: RiskLevel;
      if (entry.riskScore === 0) {
        riskLevel = "low";
      } else if (index < highCutoff) {
        riskLevel = "high";
      } else if (index < mediumCutoff) {
        riskLevel = "medium";
      } else {
        riskLevel = "low";
      }
      return { ...entry, riskLevel };
    },
  );

  // ── 2. systemImpact ───────────────────────────────────────────────────────
  // "Resolved" = items saved from expiry loss (sold in full / returned /
  // offer received). "Expired unresolved" = genuine losses (expiry date passed,
  // stock still on hand, never resolved). Items still active-but-not-yet-expired
  // are undecided and excluded from every ratio below.

  const RESOLVED_SQL = "completed_via IN ('sold','returned','offer_received')";
  const EXPIRED_UNRESOLVED_SQL =
    "(expiry_date)::date < CURRENT_DATE AND quantity > 0 AND (completed_via IS NULL OR completed_via NOT IN ('sold','returned','offer_received'))";

  const months = lastNCompletedMonths(6);

  // ── 2a. Resolution snapshot (overall, all-time decided outcomes) ──
  const snapshotRow = (
    await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE ${RESOLVED_SQL}) AS resolved,
         COUNT(*) FILTER (WHERE ${EXPIRED_UNRESOLVED_SQL}) AS expired_unresolved
       FROM expiry_logs`,
    )
  ).rows[0] as unknown as { resolved: string | number; expired_unresolved: string | number };

  const resolvedTotal = Number(snapshotRow?.resolved ?? 0);
  const expiredUnresolvedTotal = Number(snapshotRow?.expired_unresolved ?? 0);
  const decidedTotal = resolvedTotal + expiredUnresolvedTotal;
  const ratePct =
    decidedTotal === 0 ? 0 : Math.round((resolvedTotal / decidedTotal) * 100);

  // ── 2b. Resolution rate — month by month (decided within each month) ──
  const monthlyResolvedRows = (
    await pool.query(
      `SELECT to_char((completed_at)::timestamp, 'YYYY-MM') AS mo, COUNT(*) AS cnt
       FROM expiry_logs
       WHERE ${RESOLVED_SQL} AND completed_at IS NOT NULL
       GROUP BY mo`,
    )
  ).rows as unknown as MonthCountRow[];

  const monthlyExpiredRows = (
    await pool.query(
      `SELECT to_char((expiry_date)::timestamp, 'YYYY-MM') AS mo, COUNT(*) AS cnt
       FROM expiry_logs
       WHERE ${EXPIRED_UNRESOLVED_SQL}
       GROUP BY mo`,
    )
  ).rows as unknown as MonthCountRow[];

  const monthlyResolvedMap = buildMonthMap(monthlyResolvedRows);
  const monthlyExpiredMap = buildMonthMap(monthlyExpiredRows);

  const resolutionTrend = months.map((mw) => {
    const r = monthlyResolvedMap.get(mw.key) ?? 0;
    const e = monthlyExpiredMap.get(mw.key) ?? 0;
    const denom = r + e;
    return {
      month: mw.label,
      rate: denom === 0 ? null : Math.round((r / denom) * 100),
    };
  });

  const firstRate = resolutionTrend[0]?.rate;
  const lastRate = resolutionTrend[resolutionTrend.length - 1]?.rate;
  const resolutionDelta =
    firstRate != null && lastRate != null ? lastRate - firstRate : 0;

  // ── 2c. Avg time to resolution (days from logged to resolved) ──
  const monthlyAvgRows = (
    await pool.query(
      `SELECT to_char((completed_at)::timestamp, 'YYYY-MM') AS mo,
              AVG(EXTRACT(EPOCH FROM ((completed_at)::timestamp - (logged_at)::timestamp)) / 86400.0) AS avg_days,
              COUNT(*) AS cnt
       FROM expiry_logs
       WHERE ${RESOLVED_SQL} AND completed_at IS NOT NULL AND logged_at IS NOT NULL
       GROUP BY mo`,
    )
  ).rows as unknown as MonthAvgRow[];

  const avgByMonth = new Map<string, { avg: number | null; cnt: number }>();
  for (const row of monthlyAvgRows) {
    if (!row.mo) continue;
    avgByMonth.set(row.mo, {
      avg: row.avg_days == null ? null : Number(row.avg_days),
      cnt: Number(row.cnt),
    });
  }

  const ttrTrend = months.map((mw) => {
    const rec = avgByMonth.get(mw.key);
    return {
      month: mw.label,
      days: rec?.avg != null ? round1(rec.avg) : null,
    };
  });

  // Current quarter = newest 3 completed months; previous = the 3 before them.
  const quarterStats = (slice: MonthWindow[]) =>
    slice.map((mw) => avgByMonth.get(mw.key) ?? { avg: null, cnt: 0 });
  const currentQuarterAvg = weightedAvg(quarterStats(months.slice(3, 6)));
  const prevQuarterAvg = weightedAvg(quarterStats(months.slice(0, 3)));
  const ttrDelta =
    currentQuarterAvg != null && prevQuarterAvg != null
      ? round1(prevQuarterAvg - currentQuarterAvg)
      : null;

  // ── 2d. Team-wide review compliance — month by month ──
  // Numerator: distinct items that received a "Marked as reviewed" action that
  // month. Denominator: items that existed and were still active at some point
  // during that month (i.e. subject to the weekly Sunday review that month).
  // last_reviewed_at only holds the latest review, so history_log is the only
  // faithful source of historical review activity.
  const reviewEventRows = (
    await pool.query(
      `SELECT to_char((timestamp)::timestamp, 'YYYY-MM') AS mo, COUNT(DISTINCT record_id) AS cnt
       FROM history_log
       WHERE module = 'expiry' AND description LIKE 'Marked as reviewed%'
       GROUP BY mo`,
    )
  ).rows as unknown as MonthCountRow[];

  const reviewedByMonth = buildMonthMap(reviewEventRows);

  const complianceTrendPoints: { month: string; pct: number | null }[] = [];
  for (const mw of months) {
    const denomRow = (
      await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM expiry_logs
         WHERE (logged_at)::date <= $1::date
           AND (completed_at IS NULL OR (completed_at)::date >= $2::date)`,
        [mw.end, mw.start],
      )
    ).rows[0] as unknown as MonthCountRow;

    const denom = Number(denomRow?.cnt ?? 0);
    const reviewed = reviewedByMonth.get(mw.key) ?? 0;
    complianceTrendPoints.push({
      month: mw.label,
      pct: denom === 0 ? null : Math.min(100, Math.round((reviewed / denom) * 100)),
    });
  }

  const oldestCompliance = complianceTrendPoints[0]?.pct ?? null;
  const latestCompliance =
    complianceTrendPoints[complianceTrendPoints.length - 1]?.pct ?? null;
  const complianceDelta =
    oldestCompliance != null && latestCompliance != null
      ? latestCompliance - oldestCompliance
      : 0;

  const systemImpact: SystemImpact = {
    resolutionRate: {
      resolved: resolvedTotal,
      expiredUnresolved: expiredUnresolvedTotal,
      ratePct,
      trend: resolutionTrend,
      deltaPct: resolutionDelta,
      sinceLabel: months[0]?.label ?? "",
    },
    timeToResolution: {
      avgDays: currentQuarterAvg != null ? round1(currentQuarterAvg) : null,
      prevAvgDays: prevQuarterAvg != null ? round1(prevQuarterAvg) : null,
      deltaDays: ttrDelta,
      trend: ttrTrend,
      firstLabel: months[0]?.label ?? "",
      firstValue: ttrTrend[0]?.days ?? null,
      lastLabel: months[months.length - 1]?.label ?? "",
      lastValue: ttrTrend[ttrTrend.length - 1]?.days ?? null,
    },
    complianceTrend: {
      trend: complianceTrendPoints,
      deltaPct: complianceDelta,
      latestLabel: months[months.length - 1]?.label ?? "",
      latestPct: latestCompliance,
      oldestLabel: months[0]?.label ?? "",
      oldestPct: oldestCompliance,
    },
  };

  // ── 3. monthlyTrend ───────────────────────────────────────────────────────

  const loggedRows = (
    await pool.query(
      `SELECT to_char((logged_at)::timestamp, 'YYYY-MM') as mo, COUNT(*) as cnt
       FROM expiry_logs
       GROUP BY mo`,
    )
  ).rows as unknown as MonthCountRow[];

  const soldRows = (
    await pool.query(
      `SELECT to_char((sold_at)::timestamp, 'YYYY-MM') as mo, COUNT(*) as cnt
       FROM expiry_logs
       WHERE item_status = 'sold'
       GROUP BY mo`,
    )
  ).rows as unknown as MonthCountRow[];

  const returnedRows = (
    await pool.query(
      `SELECT to_char((completed_at)::timestamp, 'YYYY-MM') as mo, COUNT(*) as cnt
       FROM expiry_logs
       WHERE completed_via = 'returned'
       GROUP BY mo`,
    )
  ).rows as unknown as MonthCountRow[];

  const offeredRows = (
    await pool.query(
      `SELECT to_char((completed_at)::timestamp, 'YYYY-MM') as mo, COUNT(*) as cnt
       FROM expiry_logs
       WHERE completed_via = 'offer_received'
       GROUP BY mo`,
    )
  ).rows as unknown as MonthCountRow[];

  const loggedMap = buildMonthMap(loggedRows);
  const soldMap = buildMonthMap(soldRows);
  const returnedMap = buildMonthMap(returnedRows);
  const offeredMap = buildMonthMap(offeredRows);

  // Generate last 12 calendar months starting from the current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  const monthlyTrend: MonthlyTrendEntry[] = [];

  for (let i = 11; i >= 0; i--) {
    // Go back i months from current
    let year = currentYear;
    let month = currentMonth - i; // 0-based
    if (month < 0) {
      month += 12;
      year -= 1;
    }

    const mo = `${year}-${String(month + 1).padStart(2, "0")}`;
    const label = new Date(year, month).toLocaleString("en-GB", {
      month: "short",
      year: "numeric",
    });

    monthlyTrend.push({
      month: label,
      logged: loggedMap.get(mo) ?? 0,
      sold: soldMap.get(mo) ?? 0,
      returned: returnedMap.get(mo) ?? 0,
      offered: offeredMap.get(mo) ?? 0,
    });
  }

  // ── Response ──────────────────────────────────────────────────────────────

  return NextResponse.json({
    success: true,
    data: {
      categoryHeatmap,
      systemImpact,
      monthlyTrend,
    },
  });
}
