import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

const VALID_TYPES = new Set(["RETURNABLE", "EXCHANGEABLE", "NON_RETURNABLE", "UNKNOWN"]);

function s(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const str = String(v).trim();
  return str === "" ? null : str;
}

function normalizeType(v: unknown): string | null {
  const raw = s(v);
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/[\s-]+/g, "_");
  return VALID_TYPES.has(upper) ? upper : null;
}

function parseMonths(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function parseStrict(v: unknown): boolean {
  const str = s(v)?.toUpperCase();
  return str === "YES" || str === "TRUE" || str === "Y" || str === "1";
}

function parseDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().split("T")[0];
  }
  const str = String(v).trim();
  if (!str) return null;
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mo = String(m[1]).padStart(2, "0");
    const da = String(m[2]).padStart(2, "0");
    return `${m[3]}-${mo}-${da}`;
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}

interface RawRow {
  "Supplier ID"?: string;
  "Supplier Name"?: string;
  Brand?: string;
  Scope?: string;
  Address?: string;
  "Contact Person"?: string;
  "Item Description"?: string;
  "Return Type"?: string;
  "Months Before Expiry"?: number | string | null;
  "Special Conditions"?: string;
  "Strict Supplier"?: string;
  "Last Updated"?: string | number | null;
  "Updated By"?: string | number;
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "manager") {
    return NextResponse.json({ success: false, error: "Manager access required" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return NextResponse.json({ success: false, error: "File must be .xlsx" }, { status: 400 });
  }

  let wb;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    wb = xlsx.read(buf, { type: "buffer", cellDates: false });
  } catch (parseErr) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    console.error("[return-policies/upload] Excel parse error:", msg);
    return NextResponse.json(
      { success: false, error: `Failed to read Excel file: ${msg}` },
      { status: 400 },
    );
  }

  const sheetNames = wb.SheetNames;
  const sheetName = sheetNames.find(
    (n) => n.trim().toLowerCase() === "return policy",
  );
  if (!sheetName) {
    return NextResponse.json(
      {
        success: false,
        error: `Sheet "Return Policy" not found. Available sheets: ${sheetNames.join(", ")}`,
      },
      { status: 400 },
    );
  }
  const sheet = wb.Sheets[sheetName];

  const rows = xlsx.utils.sheet_to_json<RawRow>(sheet, { defval: null });
  const valid: Array<{
    supplier_id: string;
    supplier_name: string;
    brand: string;
    scope: string;
    address: string | null;
    contact_person: string | null;
    item_description: string | null;
    return_type: string;
    months_before_expiry: number | null;
    special_conditions: string | null;
    strict_supplier: boolean;
    last_updated: string | null;
    updated_by: string | null;
  }> = [];
  let skipped = 0;

  for (const raw of rows) {
    const supplier_id = s(raw["Supplier ID"]);
    const supplier_name = s(raw["Supplier Name"]);
    const return_type = normalizeType(raw["Return Type"]);
    if (!supplier_id || !supplier_name || !return_type) {
      skipped++;
      continue;
    }
    valid.push({
      supplier_id,
      supplier_name,
      brand: s(raw.Brand) ?? "",
      scope: s(raw.Scope) ?? "BRAND",
      address: s(raw.Address),
      contact_person: s(raw["Contact Person"]),
      item_description: s(raw["Item Description"]),
      return_type,
      months_before_expiry: parseMonths(raw["Months Before Expiry"]),
      special_conditions: s(raw["Special Conditions"]),
      strict_supplier: parseStrict(raw["Strict Supplier"]),
      last_updated: parseDate(raw["Last Updated"]),
      updated_by: s(raw["Updated By"]),
    });
  }

  if (valid.length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid rows found in file" },
      { status: 400 },
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure settings table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query("TRUNCATE TABLE return_policies RESTART IDENTITY");
    for (const r of valid) {
      await client.query(
        `INSERT INTO return_policies (
          supplier_id, supplier_name, brand, scope, address, contact_person,
          item_description, return_type, months_before_expiry, special_conditions,
          strict_supplier, last_updated, updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          r.supplier_id, r.supplier_name, r.brand, r.scope, r.address, r.contact_person,
          r.item_description, r.return_type, r.months_before_expiry, r.special_conditions,
          r.strict_supplier, r.last_updated, r.updated_by,
        ],
      );
    }

    // Record the upload timestamp
    await client.query(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('return_policy_last_uploaded', NOW()::TEXT, NOW())
      ON CONFLICT (key) DO UPDATE
        SET value = NOW()::TEXT, updated_at = NOW()
    `);

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Insert failed" },
      { status: 500 },
    );
  } finally {
    client.release();
  }

  return NextResponse.json({
    success: true,
    inserted: valid.length,
    skipped,
    total: rows.length,
  });
}
