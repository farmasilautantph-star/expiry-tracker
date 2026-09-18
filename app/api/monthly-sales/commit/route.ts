import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import pool from "@/lib/db-postgres";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { excelSerialToISODate } from "@/lib/excelDate";

interface RawRow {
  "Document Date"?: unknown;
  "Stock"?: string;
  "Stock Barcode"?: string;
  "Description"?: string;
  "Quantity"?: number | string;
  "UOM ID"?: string;
  "Document Number"?: string;
  "Salesman ID"?: string | number;
}

type MappingAction = { action: "map"; userId: number } | { action: "skip" };

interface ValidRow {
  sale_date: string;
  sale_month: string;
  barcode: string;
  stock_id: string | null;
  description: string | null;
  category: string | null;
  quantity: number;
  uom: string | null;
  document_number: string | null;
  ic_number: string | null;
  pic_name: string;
  unit_price: number | null;
  amount: number | null;
  expiry_date: string | null;
  original_qty: number | null;
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

  let mappings: Record<string, MappingAction> = {};
  const mappingsRaw = form.get("mappings");
  if (typeof mappingsRaw === "string" && mappingsRaw.trim()) {
    try {
      mappings = JSON.parse(mappingsRaw);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid mappings payload" }, { status: 400 });
    }
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
  const matchedBarcodes = Array.from(
    new Set(rows.filter((r) => trackedSet.has(s(r["Stock Barcode"]))).map((r) => s(r["Stock Barcode"]))),
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [ic, m] of Object.entries(mappings)) {
      if (m.action === "map") {
        await client.query(`UPDATE users SET ic_number = $1 WHERE id = $2`, [ic, m.userId]);
      }
    }

    const icInFile = Array.from(new Set(rows.map((r) => s(r["Salesman ID"])).filter(Boolean)));
    const userRows = icInFile.length
      ? ((await client.query(`SELECT ic_number, pic_name FROM users WHERE ic_number = ANY($1)`, [icInFile])).rows as { ic_number: string; pic_name: string }[])
      : [];
    const picByIc = new Map(userRows.map((r) => [r.ic_number, r.pic_name]));

    const priceRows = matchedBarcodes.length
      ? ((await client.query(`SELECT barcode, price FROM item_prices WHERE barcode = ANY($1)`, [matchedBarcodes])).rows as { barcode: string; price: string }[])
      : [];
    const priceByBarcode = new Map(priceRows.map((r) => [r.barcode, Number(r.price)]));

    const categoryRows = matchedBarcodes.length
      ? ((await client.query(
          `SELECT DISTINCT ON (barcode) barcode, category FROM expiry_logs WHERE barcode = ANY($1) ORDER BY barcode, id DESC`,
          [matchedBarcodes],
        )).rows as { barcode: string; category: string }[])
      : [];
    const categoryByBarcode = new Map(categoryRows.map((r) => [r.barcode, r.category]));

    // A barcode can match multiple logged batches — use the soonest-expiring
    // one, since that's the most actionable for a short-expiry tracker.
    const expiryRows = matchedBarcodes.length
      ? ((await client.query(
          `SELECT DISTINCT ON (barcode) barcode, expiry_date, COALESCE(original_qty, quantity) AS original_qty
           FROM expiry_logs WHERE barcode = ANY($1) ORDER BY barcode, expiry_date ASC`,
          [matchedBarcodes],
        )).rows as { barcode: string; expiry_date: string; original_qty: number }[])
      : [];
    const expiryByBarcode = new Map(expiryRows.map((r) => [r.barcode, { expiry_date: r.expiry_date, original_qty: r.original_qty }]));

    const valid: ValidRow[] = [];
    const monthsTouched = new Set<string>();
    let skipped = 0;

    for (const raw of rows) {
      const barcode = s(raw["Stock Barcode"]);
      if (!barcode || !trackedSet.has(barcode)) {
        skipped++;
        continue;
      }
      const ic = s(raw["Salesman ID"]);
      if (mappings[ic]?.action === "skip") {
        skipped++;
        continue;
      }
      const picName = ic ? picByIc.get(ic) : undefined;
      if (!picName) {
        skipped++;
        continue;
      }
      const dateIso = excelSerialToISODate(raw["Document Date"]);
      if (!dateIso) {
        skipped++;
        continue;
      }
      const qty = Number(raw["Quantity"]);
      if (!Number.isFinite(qty) || qty <= 0) {
        skipped++;
        continue;
      }

      const saleMonth = dateIso.slice(0, 7);
      monthsTouched.add(saleMonth);
      const price = priceByBarcode.get(barcode) ?? null;
      const expiryInfo = expiryByBarcode.get(barcode);

      valid.push({
        sale_date: dateIso,
        sale_month: saleMonth,
        barcode,
        stock_id: s(raw["Stock"]) || null,
        description: s(raw["Description"]) || null,
        category: categoryByBarcode.get(barcode) ?? null,
        quantity: qty,
        uom: s(raw["UOM ID"]) || null,
        document_number: s(raw["Document Number"]) || null,
        ic_number: ic || null,
        pic_name: picName,
        unit_price: price,
        amount: price != null ? +(price * qty).toFixed(2) : null,
        expiry_date: expiryInfo?.expiry_date ?? null,
        original_qty: expiryInfo?.original_qty ?? null,
      });
    }

    if (valid.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, error: "No valid rows to import — check that salesmen are mapped and the file has tracked items." },
        { status: 400 },
      );
    }

    for (const month of Array.from(monthsTouched)) {
      await client.query(`DELETE FROM monthly_sales WHERE sale_month = $1`, [month]);
    }

    const CHUNK = 500;
    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK);
      const values: unknown[] = [];
      const placeholders = chunk
        .map((r, idx) => {
          const base = idx * 15;
          values.push(
            r.sale_date, r.sale_month, r.barcode, r.stock_id, r.description, r.category,
            r.quantity, r.uom, r.document_number, r.ic_number, r.pic_name, r.unit_price, r.amount,
            r.expiry_date, r.original_qty,
          );
          return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12},$${base + 13},$${base + 14},$${base + 15})`;
        })
        .join(",");
      await client.query(
        `INSERT INTO monthly_sales
           (sale_date, sale_month, barcode, stock_id, description, category, quantity, uom, document_number, ic_number, pic_name, unit_price, amount, expiry_date, original_qty)
         VALUES ${placeholders}`,
        values,
      );
    }

    await client.query("COMMIT");

    const totalRM = valid.reduce((sum, r) => sum + (r.amount ?? 0), 0);

    return NextResponse.json({
      success: true,
      imported: valid.length,
      skipped,
      totalRM: +totalRM.toFixed(2),
      months: Array.from(monthsTouched).sort(),
    });
  } catch (e) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
