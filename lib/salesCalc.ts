// Shared "units sold" derivation logic used by both /api/expiry/sales (table)
// and /api/expiry/sales/trend (rolling 10-month analytics) — kept in one place
// so the two views can never drift out of sync on how a sale is detected/dated.

export function parseLastSoldDate(soldAt: string | null, notes: string | null): string | null {
  if (soldAt) return soldAt;
  if (!notes) return null;
  const re = /\[(\d{2})\/(\d{2})\/(\d{4})\]/g;
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(notes)) !== null) last = m;
  if (!last) return null;
  return `${last[3]}-${last[2]}-${last[1]}`;
}

export interface UnitsSoldRow {
  original_qty: number | null;
  quantity: number;
  completed_notes: string | null;
}

export function computeUnitsSold(row: UnitsSoldRow): number | null {
  if (row.original_qty != null) return row.original_qty - row.quantity;
  if (row.completed_notes) {
    const m = row.completed_notes.match(/All (\d+) unit\(s\) sold/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}
