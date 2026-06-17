import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export interface HistoryRow {
  id: number;
  action: "CREATE" | "UPDATE" | "DELETE";
  module: string;
  record_id: number | null;
  pic_id: number | null;
  pic_name: string | null;
  description: string | null;
  timestamp: string;
}

export interface HistoryEntry extends HistoryRow {
  date: string;
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "manager") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const modFilter = searchParams.get("module")?.trim()  ?? "";
  const action    = searchParams.get("action")?.trim()  ?? "";
  const pic       = searchParams.get("pic")?.trim()     ?? "";
  const month     = searchParams.get("month")?.trim()   ?? "";
  const search    = searchParams.get("search")?.trim()  ?? "";
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit     = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const offset    = (page - 1) * limit;

  const db = getDb();
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  const validModules = ["expiry", "offers", "returns", "users"];
  if (modFilter && validModules.includes(modFilter)) {
    conditions.push("module = ?"); bindings.push(modFilter);
  }

  const validActions = ["CREATE", "UPDATE", "DELETE"];
  if (action && validActions.includes(action.toUpperCase())) {
    conditions.push("action = ?"); bindings.push(action.toUpperCase());
  }

  if (pic) {
    conditions.push("pic_name = ?"); bindings.push(pic);
  }

  if (month) {
    conditions.push("strftime('%Y-%m', timestamp) = ?"); bindings.push(month);
  }

  if (search) {
    conditions.push("LOWER(COALESCE(description,'')) LIKE LOWER(?)");
    bindings.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = (db.prepare(`SELECT COUNT(*) AS n FROM history_log ${where}`)
    .get(...bindings) as { n: number }).n;

  const rows = db.prepare(
    `SELECT * FROM history_log ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
  ).all(...bindings, limit, offset) as unknown as HistoryRow[];

  const entries: HistoryEntry[] = rows.map((r) => ({
    ...r,
    date: r.timestamp.split("T")[0],
  }));

  // Summary counts (for the filtered set — run a separate aggregation)
  const countsRow = db.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN action = 'CREATE' THEN 1 ELSE 0 END) AS creates,
       SUM(CASE WHEN action = 'UPDATE' THEN 1 ELSE 0 END) AS updates,
       SUM(CASE WHEN action = 'DELETE' THEN 1 ELSE 0 END) AS deletes
     FROM history_log ${where}`
  ).get(...bindings) as { total: number; creates: number; updates: number; deletes: number };

  // Available PICs for filter dropdown
  const picNames = (db.prepare(
    "SELECT DISTINCT pic_name FROM history_log WHERE pic_name IS NOT NULL ORDER BY pic_name"
  ).all() as { pic_name: string }[]).map((r) => r.pic_name);

  return NextResponse.json({
    success: true,
    data: entries,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    counts: countsRow,
    picNames,
  });
}
