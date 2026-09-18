// A barcode's logged Original Qty represents one specific flagged short-expiry
// batch. POS sales for that barcode can exceed it once regular (non-flagged)
// restocked units share the same barcode — those extra units aren't really
// "short-expiry sold". Cap each barcode's counted total at its Original Qty so
// aggregate figures (page totals, group totals) don't get inflated by that,
// while leaving individual transaction records untouched for audit purposes.

export interface CapSourceEntry {
  barcode: string;
  units_sold: number | null;
  amount: number | null;
  original_qty: number | null;
}

export interface BarcodeCapInfo {
  actualUnits: number;
  actualAmount: number;
  cap: number | null;
  capped: boolean;
  ratio: number; // 1 when not capped
}

export function computeBarcodeCaps<T extends CapSourceEntry>(entries: T[]): Map<string, BarcodeCapInfo> {
  const map = new Map<string, BarcodeCapInfo>();

  for (const e of entries) {
    let info = map.get(e.barcode);
    if (!info) {
      info = { actualUnits: 0, actualAmount: 0, cap: null, capped: false, ratio: 1 };
      map.set(e.barcode, info);
    }
    info.actualUnits += e.units_sold ?? 0;
    info.actualAmount += e.amount ?? 0;
    if (info.cap == null && e.original_qty != null) info.cap = e.original_qty;
  }

  for (const info of Array.from(map.values())) {
    if (info.cap != null && info.actualUnits > info.cap) {
      info.capped = true;
      info.ratio = info.actualUnits > 0 ? info.cap / info.actualUnits : 1;
    }
  }

  return map;
}

export function scaleByCap(value: number, info: BarcodeCapInfo | undefined): number {
  if (!info || !info.capped) return value;
  return value * info.ratio;
}
