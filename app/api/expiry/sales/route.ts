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
  sold_by: string | null;
  completed_notes: string | null;
  unit_price: string | null;
}

interface MonthlySalesRow {
  id: number;
  sale_date: string;
  sale_month: string;
  barcode: string;
  stock_id: string | null;
  description: string | null;
  category: string | null;
  quantity: number;
  uom: string | null;
  document_number: string | null;
  pic_name: string;
  unit_price: string | null;
  amount: string | null;
}

// POS-sourced ids are offset well clear of any real expiry_logs id so the two
// sources can be merged into one list without collisions.
const MONTHLY_SALES_ID_OFFSET = 1_000_000_000;

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
    "(el.original_qty IS NOT NULL OR el.notes LIKE '%unit(s) sold%' OR el.item_status = 'sold')",
  );

  if (user.role !== "manager") {
    conditions.push(`el.pic_id = $${p++}`);
    bindings.push(user.userId);
  } else if (pic) {
    // PIC here means the actual seller, not the original logger — fall back
    // to pic_name only for legacy rows sold before sold_by was tracked.
    conditions.push(`COALESCE(el.sold_by, el.pic_name) = $${p++}`);
    bindings.push(pic);
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      `(LOWER(el.description) LIKE LOWER($${p++}) OR LOWER(el.barcode) LIKE LOWER($${p++}) OR LOWER(COALESCE(el.stock_id,'')) LIKE LOWER($${p++}))`,
    );
    bindings.push(like, like, like);
  }

  const sqlOrder =
    sortBy === "description"
      ? `ORDER BY el.description ${sortOrder.toUpperCase()}`
      : "ORDER BY COALESCE(el.sold_at, el.logged_at) DESC";

  // Uploaded POS reports (monthly_sales) replace the derived expiry_logs
  // numbers for any month they cover — build that filter set, the POS rows
  // themselves, and the expiry_logs rows all up front.
  let mp = 1;
  const msConditions: string[] = [];
  const msBindings: (string | number)[] = [];

  if (user.role !== "manager") {
    msConditions.push(`pic_name = $${mp++}`);
    msBindings.push(user.picName);
  } else if (pic) {
    msConditions.push(`pic_name = $${mp++}`);
    msBindings.push(pic);
  }

  if (search) {
    const like = `%${search}%`;
    msConditions.push(
      `(LOWER(COALESCE(description,'')) LIKE LOWER($${mp++}) OR LOWER(barcode) LIKE LOWER($${mp++}) OR LOWER(COALESCE(stock_id,'')) LIKE LOWER($${mp++}))`,
    );
    msBindings.push(like, like, like);
  }
  const msWhere = msConditions.length ? `WHERE ${msConditions.join(" AND ")}` : "";

  const where = `WHERE ${conditions.join(" AND ")}`;

  const [expiryResult, monthlySalesResult, coveredMonthsResult] = await Promise.all([
    pool.query(
      `SELECT el.*, ip.price AS unit_price
       FROM expiry_logs el
       LEFT JOIN item_prices ip ON ip.barcode = el.barcode
       ${where} ${sqlOrder}`,
      bindings,
    ),
    pool.query(`SELECT * FROM monthly_sales ${msWhere}`, msBindings),
    pool.query(`SELECT DISTINCT sale_month FROM monthly_sales`),
  ]);

  const rows = expiryResult.rows as unknown as SalesRow[];
  const monthlySalesRows = monthlySalesResult.rows as unknown as MonthlySalesRow[];
  const coveredMonths = new Set(
    (coveredMonthsResult.rows as { sale_month: string }[]).map((r) => r.sale_month),
  );

  // Compute derived fields
  let data = rows
    .map((row) => {
      const unitsSold   = computeUnitsSold(row);
      const lastSoldAt  = parseLastSoldDate(row.sold_at, row.notes);
      const saleStatus  = row.quantity > 0 ? "partial" : "fully_sold";
      const unitPrice   = row.unit_price != null ? Number(row.unit_price) : null;
      const amount      = unitsSold != null && unitPrice != null
        ? +(unitPrice * unitsSold).toFixed(2)
        : null;
      return {
        id:           row.id,
        description:  row.description,
        barcode:      row.barcode,
        stock_id:     row.stock_id,
        category:     row.category,
        uom:          row.uom,
        // Actual seller when known, falling back to the original logger for
        // legacy rows sold before sold_by was tracked on partial sales.
        pic_name:     row.sold_by ?? row.pic_name,
        expiry_date:  row.expiry_date,
        logged_at:    row.logged_at,
        original_qty: row.original_qty,
        current_qty:  row.quantity,
        units_sold:   unitsSold,
        sale_status:  saleStatus as "partial" | "fully_sold",
        last_sold_at: lastSoldAt,
        notes:        row.notes,
        unit_price:   unitPrice,
        amount,
        document_number: null as string | null,
      };
    })
    // A month with an uploaded POS report is authoritative for that month —
    // drop the derived rows so it isn't double-counted alongside monthly_sales.
    .filter((r) => !(r.last_sold_at && coveredMonths.has(r.last_sold_at.slice(0, 7))));

  const posData = monthlySalesRows.map((row) => {
    const unitPrice = row.unit_price != null ? Number(row.unit_price) : null;
    const amount = row.amount != null ? Number(row.amount) : null;
    return {
      id:           MONTHLY_SALES_ID_OFFSET + row.id,
      description:  row.description ?? "",
      barcode:      row.barcode,
      stock_id:     row.stock_id,
      category:     row.category ?? "",
      uom:          row.uom,
      pic_name:     row.pic_name,
      expiry_date:  "",
      logged_at:    row.sale_date,
      original_qty: null,
      current_qty:  0,
      units_sold:   row.quantity,
      sale_status:  "fully_sold" as const,
      last_sold_at: row.sale_date,
      notes:        null,
      unit_price:   unitPrice,
      amount,
      document_number: row.document_number,
    };
  });

  data = [...data, ...posData];

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
    total_sales_rm:     +data.reduce((s, r) => s + (r.amount ?? 0), 0).toFixed(2),
  };

  return NextResponse.json({ success: true, data, summary });
}
