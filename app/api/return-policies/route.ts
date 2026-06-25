import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export interface ReturnPolicyRow {
  id: number;
  supplier_id: string;
  supplier_name: string;
  brand: string;
  scope: string | null;
  address: string | null;
  contact_person: string | null;
  item_description: string | null;
  return_type: string;
  months_before_expiry: number | null;
  special_conditions: string | null;
  strict_supplier: boolean;
  last_updated: string | null;
  updated_by: string | null;
}

export interface ReturnPolicyStats {
  total: number;
  returnable: number;
  exchangeable: number;
  non_returnable: number;
  strict_suppliers: number;
  brand_linked: number;
  last_uploaded: string | null;
}

async function auth(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await auth(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const type = searchParams.get("type")?.trim().toUpperCase() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(1000, Math.max(1, Number(searchParams.get("limit") ?? 1000)));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];
  let p = 1;

  if (type && ["RETURNABLE", "EXCHANGEABLE", "NON_RETURNABLE", "UNKNOWN"].includes(type)) {
    conditions.push(`return_type = $${p++}`);
    bindings.push(type);
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      `(LOWER(supplier_name) LIKE LOWER($${p}) OR LOWER(supplier_id) LIKE LOWER($${p + 1}) OR LOWER(brand) LIKE LOWER($${p + 2}) OR LOWER(COALESCE(item_description,'')) LIKE LOWER($${p + 3}) OR LOWER(COALESCE(contact_person,'')) LIKE LOWER($${p + 4}))`,
    );
    bindings.push(like, like, like, like, like);
    p += 5;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const dataSql = `
    SELECT id, supplier_id, supplier_name, brand, scope, address, contact_person,
           item_description, return_type, months_before_expiry, special_conditions,
           strict_supplier, last_updated, updated_by
    FROM return_policies
    ${where}
    ORDER BY supplier_name ASC, brand ASC
    LIMIT $${p++} OFFSET $${p++}
  `;
  const rows = (await pool.query(dataSql, [...bindings, limit, offset])).rows as ReturnPolicyRow[];

  // Stats — counts from return_policies, upload timestamp from app_settings
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const [countsRes, uploadedRes] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE return_type = 'RETURNABLE')::int AS returnable,
        COUNT(*) FILTER (WHERE return_type = 'EXCHANGEABLE')::int AS exchangeable,
        COUNT(*) FILTER (WHERE return_type = 'NON_RETURNABLE')::int AS non_returnable,
        COUNT(*) FILTER (WHERE strict_supplier = true)::int AS strict_suppliers,
        COUNT(*) FILTER (WHERE COALESCE(brand,'') <> '')::int AS brand_linked
      FROM return_policies
    `),
    pool.query(
      `SELECT value FROM app_settings WHERE key = 'return_policy_last_uploaded'`,
    ),
  ]);

  const counts = countsRes.rows[0] as Omit<ReturnPolicyStats, "last_uploaded">;
  const lastUploaded = (uploadedRes.rows[0]?.value as string | undefined) ?? null;

  const statsRow: ReturnPolicyStats = { ...counts, last_uploaded: lastUploaded };

  return NextResponse.json({
    success: true,
    data: rows,
    stats: statsRow,
    pagination: { page, limit, total: rows.length },
  });
}
