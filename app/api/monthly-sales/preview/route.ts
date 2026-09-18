import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { excelSerialToISODate } from "@/lib/excelDate";

interface RawRow {
  "Document Date"?: unknown;
  "Stock Barcode"?: string;
  "Salesman ID"?: string | number;
  "Salesman Name"?: string;
}

function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

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

  let rows: RawRow[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = xlsx.read(buf, { type: "buffer", cellDates: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = xlsx.utils.sheet_to_json<RawRow>(sheet, { defval: null });
  } catch (parseErr) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    return NextResponse.json({ success: false, error: `Failed to read Excel file: ${msg}` }, { status: 400 });
  }

  const barcodes = Array.from(new Set(rows.map((r) => s(r["Stock Barcode"])).filter(Boolean)));
  const trackedRows = barcodes.length
    ? ((await pool.query(`SELECT DISTINCT barcode FROM expiry_logs WHERE barcode = ANY($1)`, [barcodes])).rows as { barcode: string }[])
    : [];
  const trackedSet = new Set(trackedRows.map((r) => r.barcode));

  let matchedCount = 0;
  let excludedCount = 0;
  const months = new Set<string>();
  const salesmen = new Map<string, { pos_name: string; row_count: number }>();

  for (const raw of rows) {
    const barcode = s(raw["Stock Barcode"]);
    if (!barcode || !trackedSet.has(barcode)) {
      excludedCount++;
      continue;
    }
    matchedCount++;

    const dateIso = excelSerialToISODate(raw["Document Date"]);
    if (dateIso) months.add(dateIso.slice(0, 7));

    const ic = s(raw["Salesman ID"]);
    if (ic) {
      const entry = salesmen.get(ic) ?? { pos_name: s(raw["Salesman Name"]), row_count: 0 };
      entry.row_count++;
      salesmen.set(ic, entry);
    }
  }

  const icList = Array.from(salesmen.keys());
  const mappedRows = icList.length
    ? ((await pool.query(`SELECT ic_number FROM users WHERE ic_number = ANY($1)`, [icList])).rows as { ic_number: string }[])
    : [];
  const mappedSet = new Set(mappedRows.map((r) => r.ic_number));

  const unmapped = icList
    .filter((ic) => !mappedSet.has(ic))
    .map((ic) => ({ ic_number: ic, pos_name: salesmen.get(ic)!.pos_name, row_count: salesmen.get(ic)!.row_count }));

  return NextResponse.json({
    success: true,
    months: Array.from(months).sort(),
    matchedCount,
    excludedCount,
    unmapped,
  });
}
