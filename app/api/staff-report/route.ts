import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

interface StaffRow {
  pic_name: string;
  items_logged: number;
  items_reviewed: number;
  review_rate: number;
  items_sold: number;
  units_sold: number;
  items_returned: number;
  items_offered: number;
  items_active: number;
  missed_sundays: number;
}

interface ExpiryLogRow {
  pic_name: string;
  item_status: string;
  completed_via: string | null;
  quantity: number;
  original_qty: number | null;
  last_reviewed_at: string | null;
  review_status: string | null;
}

interface ActiveRow {
  pic_name: string;
  item_status: string;
  review_status: string | null;
}

function formatMonthLabel(month: string): string {
  const [year, mon] = month.split("-");
  const date = new Date(Number(year), Number(mon) - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
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

  if (user.role !== "manager") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month")?.trim() ?? "";
  const allParam = searchParams.get("all")?.trim() ?? "";

  // Determine period
  let month: string;
  let period: string;

  if (allParam === "true") {
    month = "all";
    period = "All Time";
  } else if (monthParam) {
    month = monthParam;
    period = formatMonthLabel(monthParam);
  } else {
    // Default: current month
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    month = `${y}-${m}`;
    period = formatMonthLabel(month);
  }

  // Build WHERE clause for main query
  const conditions: string[] = [];
  const bindings: string[] = [];

  if (month !== "all") {
    conditions.push("to_char((logged_at)::timestamp, 'YYYY-MM') = $1");
    bindings.push(month);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Fetch all matching rows for period-scoped metrics
  const rows = (
    await pool.query(
      `SELECT pic_name, item_status, completed_via, quantity, original_qty, last_reviewed_at, review_status
       FROM expiry_logs
       ${where}
       ORDER BY pic_name`,
      bindings,
    )
  ).rows as unknown as ExpiryLogRow[];

  // Fetch active rows (always unfiltered by date)
  const activeRows = (
    await pool.query(
      `SELECT pic_name, item_status, review_status
       FROM expiry_logs
       WHERE item_status = 'active'`,
    )
  ).rows as unknown as ActiveRow[];

  // Group active rows by pic_name
  const activeMap = new Map<
    string,
    { items_active: number; missed_sundays: number }
  >();
  for (const row of activeRows) {
    const entry = activeMap.get(row.pic_name) ?? {
      items_active: 0,
      missed_sundays: 0,
    };
    entry.items_active += 1;
    if (
      row.review_status === "needs_review" ||
      row.review_status === "critical_stale"
    ) {
      entry.missed_sundays += 1;
    }
    activeMap.set(row.pic_name, entry);
  }

  // Group period rows by pic_name and compute metrics
  const staffMap = new Map<
    string,
    {
      items_logged: number;
      items_reviewed: number;
      items_sold: number;
      units_sold: number;
      items_returned: number;
      items_offered: number;
    }
  >();

  for (const row of rows) {
    const entry = staffMap.get(row.pic_name) ?? {
      items_logged: 0,
      items_reviewed: 0,
      items_sold: 0,
      units_sold: 0,
      items_returned: 0,
      items_offered: 0,
    };

    entry.items_logged += 1;

    if (row.last_reviewed_at !== null) {
      entry.items_reviewed += 1;
    }

    if (row.item_status === "sold") {
      entry.items_sold += 1;
      entry.units_sold += row.original_qty ?? row.quantity ?? 0;
    }

    if (row.completed_via === "returned") {
      entry.items_returned += 1;
    }

    if (row.completed_via === "offer_received") {
      entry.items_offered += 1;
    }

    staffMap.set(row.pic_name, entry);
  }

  // Collect all unique pic_names from both queries
  const allPicNames = new Set<string>(
    Array.from(staffMap.keys()).concat(Array.from(activeMap.keys()))
  );

  // Build final report, sorted by pic_name ASC
  const staffReport: StaffRow[] = Array.from(allPicNames)
    .sort((a, b) => a.localeCompare(b))
    .map((pic_name) => {
      const periodData = staffMap.get(pic_name) ?? {
        items_logged: 0,
        items_reviewed: 0,
        items_sold: 0,
        units_sold: 0,
        items_returned: 0,
        items_offered: 0,
      };
      const activeData = activeMap.get(pic_name) ?? {
        items_active: 0,
        missed_sundays: 0,
      };

      const review_rate =
        periodData.items_logged > 0
          ? Math.round(
              (periodData.items_reviewed / periodData.items_logged) * 100,
            )
          : 0;

      return {
        pic_name,
        items_logged: periodData.items_logged,
        items_reviewed: periodData.items_reviewed,
        review_rate,
        items_sold: periodData.items_sold,
        units_sold: periodData.units_sold,
        items_returned: periodData.items_returned,
        items_offered: periodData.items_offered,
        items_active: activeData.items_active,
        missed_sundays: activeData.missed_sundays,
      };
    });

  return NextResponse.json({
    success: true,
    data: {
      staffReport,
      period,
      month,
    },
  });
}
