import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

// ── Row types ──────────────────────────────────────────────────────────────

interface ExpiryLogRow {
  category: string;
  expiry_date: string; // ISO string stored in DB
}

interface ResolutionGroupRow {
  item_status: string | null;
  completed_via: string | null;
  cnt: number;
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

interface ResolutionRate {
  total: number;
  sold: number;
  returned: number;
  offered: number;
  active: number;
  soldPct: number;
  returnedPct: number;
  offeredPct: number;
  activePct: number;
}

interface MonthlyTrendEntry {
  month: string; // "Jun 2026"
  logged: number;
  sold: number;
  returned: number;
  offered: number;
}

// ── Helper ─────────────────────────────────────────────────────────────────

function buildMonthMap(rows: MonthCountRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.mo) map.set(row.mo, Number(row.cnt));
  }
  return map;
}

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

  const categoryHeatmap: CategoryHeatmapEntry[] = Array.from(
    categoryMap.entries(),
  )
    .map(([category, counts]) => {
      const { expired, critical, warning, safe } = counts;
      const total = expired + critical + warning + safe;
      const riskScore = expired * 10 + critical * 5 + warning * 1;
      const riskLevel: RiskLevel =
        riskScore >= 20 ? "high" : riskScore >= 10 ? "medium" : "low";
      return { category, expired, critical, warning, safe, total, riskScore, riskLevel };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  // ── 2. resolutionRate ─────────────────────────────────────────────────────

  const resolutionRows = (
    await pool.query(
      `SELECT item_status, completed_via, COUNT(*) as cnt
       FROM expiry_logs
       GROUP BY item_status, completed_via`,
    )
  ).rows as unknown as ResolutionGroupRow[];

  let total = 0;
  let sold = 0;
  let returned = 0;
  let offered = 0;
  let active = 0;

  for (const row of resolutionRows) {
    const cnt = Number(row.cnt);
    total += cnt;
    if (row.item_status === "sold") sold += cnt;
    if (row.completed_via === "returned") returned += cnt;
    if (row.completed_via === "offer_received") offered += cnt;
    if (row.item_status === "active") active += cnt;
  }

  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  const resolutionRate: ResolutionRate = {
    total,
    sold,
    returned,
    offered,
    active,
    soldPct: pct(sold),
    returnedPct: pct(returned),
    offeredPct: pct(offered),
    activePct: pct(active),
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
      resolutionRate,
      monthlyTrend,
    },
  });
}
