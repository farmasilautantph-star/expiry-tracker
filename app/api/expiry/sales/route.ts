import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { parseLastSoldDate, computeUnitsSold } from "@/lib/salesCalc";

interface SalesRow {
  id: number;
  barcode: string;
  description: string;
  category: string;
  expiry_date: string;
  pic_id: number;
  pic_name: string;
  logged_at: string;
  notes: string | null;
  stock_id: string | null;
  uom: string | null;
  quantity: number;
  original_qty: number | null;
  item_status: string;
  sold_at: string | null;
  completed_notes: string | null;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

  const { searchParams } = new URL(req.url);
  const status    = searchParams.get("status")?.trim() ?? "all";
  const month     = searchParams.get("month")?.trim() ?? "";
  const showAll   = searchParams.get("all") === "true";
  const search    = searchParams.get("search")?.trim() ?? "";
  const pic       = searchParams.get("pic")?.trim() ?? "";
  const sortBy    = searchParams.get("sort_by")?.trim() ?? "last_sold_at";
  const sortOrder = searchParams.get("sort_order")?.trim() === "asc" ? "asc" : "desc";

  let p = 1;
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  conditions.push(
    "(original_qty IS NOT NULL OR notes LIKE '%unit(s) sold%' OR item_status = 'sold')",
  );

  if (user.role !== "manager") {
    conditions.push(`pic_id = $${p++}`);
    bindings.push(user.userId);
  } else if (pic) {
    conditions.push(`pic_name = $${p++}`);
    bindings.push(pic);
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      `(LOWER(description) LIKE LOWER($${p++}) OR LOWER(barcode) LIKE LOWER($${p++}) OR LOWER(COALESCE(stock_id,'')) LIKE LOWER($${p++}))`,
    );
    bindings.push(like, like, like);
  }

  const sqlOrder =
    sortBy === "description"
      ? `ORDER BY description ${sortOrder.toUpperCase()}`
      : "ORDER BY COALESCE(sold_at, logged_at) DESC";

  const where = `WHERE ${conditions.join(" AND ")}`;
  const rows = (
    await pool.query(
      `SELECT * FROM expiry_logs ${where} ${sqlOrder}`,
      bindings,
    )
  ).rows as unknown as SalesRow[];

  // Compute derived fields
  let data = rows.map((row) => {
    const unitsSold   = computeUnitsSold(row);
    const lastSoldAt  = parseLastSoldDate(row.sold_at, row.notes);
    const saleStatus  = row.quantity > 0 ? "partial" : "fully_sold";
    return {
      id:           row.id,
      description:  row.description,
      barcode:      row.barcode,
      stock_id:     row.stock_id,
      category:     row.category,
      uom:          row.uom,
      pic_name:     row.pic_name,
      expiry_date:  row.expiry_date,
      logged_at:    row.logged_at,
      original_qty: row.original_qty,
      current_qty:  row.quantity,
      units_sold:   unitsSold,
      sale_status:  saleStatus as "partial" | "fully_sold",
      last_sold_at: lastSoldAt,
      notes:        row.notes,
    };
  });

  // Month filter (JS — last_sold_at is computed)
  const effectiveMonth = showAll ? "" : (month || currentMonth());
  if (effectiveMonth) {
    data = data.filter((r) => !!r.last_sold_at && r.last_sold_at.startsWith(effectiveMonth));
  }

  // Status filter
  if (status === "partial") {
    data = data.filter((r) => r.sale_status === "partial");
  } else if (status === "fully_sold") {
    data = data.filter((r) => r.sale_status === "fully_sold");
  }

  // JS sort for date and units_sold
  if (sortBy === "last_sold_at") {
    const dir = sortOrder === "asc" ? 1 : -1;
    data.sort((a, b) => {
      const av = a.last_sold_at ?? "";
      const bv = b.last_sold_at ?? "";
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
  } else if (sortBy === "units_sold") {
    const dir = sortOrder === "asc" ? 1 : -1;
    data.sort((a, b) => ((a.units_sold ?? 0) - (b.units_sold ?? 0)) * dir);
  }

  const summary = {
    total_transactions: data.length,
    total_units_sold:   data.reduce((s, r) => s + (r.units_sold ?? 0), 0),
    partial_count:      data.filter((r) => r.sale_status === "partial").length,
    fully_sold_count:   data.filter((r) => r.sale_status === "fully_sold").length,
  };

  return NextResponse.json({ success: true, data, summary });
}
