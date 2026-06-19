"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ShortListEntry } from "@/hooks/useShortList";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import SortableHeader from "@/components/ui/SortableHeader";
import {
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
  DocumentTextIcon,
  BanknotesIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import Toast from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";

type Urgency = "expired" | "critical" | "warning" | "safe";
type ReviewStatus = "pending" | "needs_review" | "critical_stale" | "resolved";

const BADGE_STYLE: Record<Urgency, { bg: string; color: string; dotColor: string; fontWeight: number }> = {
  expired:  { bg: "#fee2e2", color: "#dc2626", dotColor: "#dc2626", fontWeight: 600 },
  critical: { bg: "#ffedd5", color: "#ea580c", dotColor: "#ea580c", fontWeight: 600 },
  warning:  { bg: "#fef9c3", color: "#ca8a04", dotColor: "#ca8a04", fontWeight: 600 },
  safe:     { bg: "#dcfce7", color: "#16a34a", dotColor: "#16a34a", fontWeight: 600 },
};

const COLUMN_LABELS: Record<string, string> = {
  logged_at: "Date Logged",
  pic_name: "PIC",
  stock_id: "Stock ID",
  barcode: "Barcode",
  description: "Description",
  category: "Category",
  uom: "UOM",
  quantity: "Qty",
  expiry_date: "Expiry Date",
  days_left: "Days Left",
  return_label: "Return",
};

function getReturnLabel(status: string | null): string {
  if (!status) return "—";
  if (status === "pending") return "Return";
  return "Non-Return";
}

function getRowStatus(entry: ShortListEntry, justReviewed: boolean): ReviewStatus {
  if (justReviewed) return "pending";
  if (entry.return_status === "returned" || entry.quantity === 0) return "resolved";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ref = entry.last_reviewed_at ?? entry.logged_at;
  const refDate = new Date(ref);
  refDate.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - refDate.getTime()) / 86_400_000);
  if (days <= 7) return "pending";
  if (days <= 14) return "needs_review";
  return "critical_stale";
}

function getFirstCellBorderStyle(status: ReviewStatus): React.CSSProperties {
  switch (status) {
    case "pending":        return { borderLeft: "3px solid #22c55e" };
    case "needs_review":   return { borderLeft: "3px solid #eab308" };
    case "critical_stale": return { borderLeft: "3px solid #ef4444" };
    default:               return { borderLeft: "3px solid #e2e8f0" };
  }
}

function getRowBgStyle(status: ReviewStatus): React.CSSProperties {
  if (status === "needs_review")   return { background: "rgba(254,252,232,0.5)" };
  if (status === "critical_stale") return { background: "rgba(255,245,245,0.5)" };
  return {};
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

function DaysLeftBadge({
  entry,
  onClick,
}: {
  entry: ShortListEntry;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const u = entry.urgency as Urgency;
  const style = BADGE_STYLE[u] ?? BADGE_STYLE.safe;
  const label =
    entry.days_left < 0 ? "Expired" :
    entry.days_left === 0 ? "Today" :
    entry.days_left <= 30 ? `${entry.days_left}d left` :
    `${Math.round(entry.days_left / 30)}m left`;
  return (
    <span
      className="badge"
      style={{ background: style.bg, color: style.color, fontWeight: style.fontWeight }}
      onClick={onClick}
    >
      <Dot color={style.dotColor} />
      {label}
    </span>
  );
}

function ReturnBadge({
  status,
  onClick,
}: {
  status: string | null;
  onClick?: (e: React.MouseEvent) => void;
}) {
  if (!status) return <span className="text-[#cbd5e1] text-xs">—</span>;
  const isPending = status === "pending";
  return (
    <span
      className="badge"
      style={{ background: isPending ? "#fef3c7" : "#f1f5f9", color: isPending ? "#d97706" : "#64748b" }}
      onClick={onClick}
    >
      <Dot color={isPending ? "#d97706" : "#94a3b8"} />
      {isPending ? "Return" : "Non-Return"}
    </span>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function InfoRow({
  label,
  value,
  last = false,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between py-1.5"
      style={last ? {} : { borderBottom: "1px solid #f1f5f9" }}
    >
      <span className="text-xs text-[#94a3b8] font-medium">{label}</span>
      {children ?? <span className="text-sm text-[#0f172a] font-semibold">{value}</span>}
    </div>
  );
}

const stop = (e: React.MouseEvent) => e.stopPropagation();

// ─── ReviewPopupContent ────────────────────────────────────────────────────
// Module-level component (stable identity). Rendered into the Portal Modal.
function ReviewPopupContent({
  entry,
  isManager,
  currentPicName,
  onSwitchToSales,
  onClose,
  onReviewed,
  onSell,
}: {
  entry: ShortListEntry;
  isManager: boolean;
  currentPicName: string;
  onSwitchToSales?: () => void;
  onClose: () => void;
  onReviewed: () => void;
  onSell: () => void;
}) {
  const isSold = entry.item_status === "sold" || entry.quantity === 0;
  const isPartial =
    !isSold &&
    entry.original_qty != null &&
    entry.quantity > 0 &&
    !!entry.notes?.includes("unit(s) sold");
  const canReview =
    (isManager || entry.pic_name === currentPicName) &&
    !isSold &&
    entry.return_status !== "returned";
  const canSell = (isManager || entry.pic_name === currentPicName) && !isSold;
  const unitsPreviouslySold =
    isPartial && entry.original_qty != null ? entry.original_qty - entry.quantity : null;

  return (
    <div
      className="bg-white rounded-2xl shadow-xl"
      style={{ width: 360, padding: 20, border: "1px solid #e2e8f0", maxWidth: "calc(100vw - 32px)" }}
    >
      {/* STATE 2: Fully sold */}
      {isSold && (
        <>
          <p className="text-base font-bold text-[#0f172a] mb-1">Item Fully Sold</p>
          <div className="mb-4" style={{ height: 1, background: "#f1f5f9" }} />
          <p className="text-sm font-semibold text-[#0f172a] leading-snug mb-3">{entry.description}</p>
          <div className="rounded-xl px-3 mb-4" style={{ border: "1px solid #e2e8f0" }}>
            <InfoRow label="Barcode" value={entry.barcode} />
            <InfoRow label="Sold By" value={entry.sold_by ?? entry.pic_name} />
            {entry.sold_at && <InfoRow label="Sold On" value={formatDate(entry.sold_at)} />}
            <InfoRow
              label="Original Qty"
              value={
                entry.original_qty != null
                  ? `${entry.original_qty} unit${entry.original_qty !== 1 ? "s" : ""}`
                  : "—"
              }
              last
            />
          </div>
          <div className="rounded-xl px-3 py-3 flex items-start gap-2 mb-4" style={{ background: "#dcfce7" }}>
            <CheckIcon className="w-4 h-4 text-[#16a34a] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#16a34a]">This item has been fully sold</p>
              <p className="text-xs text-[#16a34a] opacity-80 mt-0.5">No further action needed.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
            >
              Close
            </button>
            {onSwitchToSales && (
              <button
                onClick={() => {
                  onClose();
                  onSwitchToSales();
                }}
                className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "#eff6ff", color: "#2563eb" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#dbeafe")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#eff6ff")}
              >
                View Sales Record →
              </button>
            )}
          </div>
        </>
      )}

      {/* STATE 1 + STATE 3: Active or partial-sold item */}
      {!isSold && (
        <>
          <p className="text-base font-bold text-[#0f172a] mb-1">Item Review</p>
          <div className="mb-4" style={{ height: 1, background: "#f1f5f9" }} />
          <p className="text-base font-bold text-[#0f172a] leading-snug mb-3">{entry.description}</p>
          <div className="rounded-xl px-3 mb-4" style={{ border: "1px solid #e2e8f0" }}>
            <InfoRow label="Barcode" value={entry.barcode} />
            <InfoRow label="Qty" value={`${entry.quantity}${entry.uom ? ` ${entry.uom}` : ""}`} />
            <InfoRow label="Category" value={entry.category} />
            <InfoRow label="Expiry" value={formatDate(entry.expiry_date)} />
            <InfoRow label="Days Left" last>
              <DaysLeftBadge entry={entry} />
            </InfoRow>
          </div>
          {isPartial && unitsPreviouslySold != null && (
            <div className="rounded-xl px-3 py-3 mb-4" style={{ background: "#fef9c3" }}>
              <p className="text-xs font-semibold" style={{ color: "#92400e" }}>⚠️ Partial Sale</p>
              <p className="text-xs mt-0.5" style={{ color: "#92400e" }}>
                {unitsPreviouslySold} unit{unitsPreviouslySold !== 1 ? "s" : ""} previously sold ·{" "}
                {entry.quantity} remaining
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
            >
              Cancel
            </button>
            {canSell && (
              <button
                onClick={onSell}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "#dbeafe", color: "#2563eb" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#bfdbfe")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#dbeafe")}
              >
                <BanknotesIcon className="w-4 h-4" />
                Mark Sold
              </button>
            )}
            {canReview && (
              <button
                onClick={onReviewed}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: "#22c55e" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#16a34a")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#22c55e")}
              >
                <CheckIcon className="w-4 h-4" />
                Reviewed
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── SellModalContent ──────────────────────────────────────────────────────
// Module-level component (stable identity). Rendered into the Portal Modal.
function SellModalContent({
  entry,
  unitsSold,
  setUnitsSold,
  onClose,
  onConfirm,
}: {
  entry: ShortListEntry;
  unitsSold: number;
  setUnitsSold: (n: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const maxQty = entry.quantity;
  const remaining = maxQty - unitsSold;
  const isFullySold = remaining === 0;
  const isValid = Number.isInteger(unitsSold) && unitsSold >= 1 && unitsSold <= maxQty;
  const desc =
    entry.description.length > 40 ? entry.description.slice(0, 40) + "…" : entry.description;
  const [ey, em, ed] = entry.expiry_date.split("T")[0].split("-");
  const expiryFmt = `${ed}/${em}/${ey}`;

  return (
    <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-sm p-6 space-y-4">
      <h3 className="text-base font-semibold text-[#1e293b]">Mark Units as Sold</h3>
      <div className="rounded-xl bg-[#f8fafc] px-4 py-3 space-y-0.5">
        <p className="text-sm font-semibold text-[#1e293b] leading-snug">{desc}</p>
        <p className="text-xs text-[#94a3b8]">{entry.category} · Expiry: {expiryFmt}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-1">Total Quantity</p>
        <p className="text-sm text-[#334155] font-medium">
          {maxQty} unit{maxQty !== 1 ? "s" : ""} available
        </p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">
          Units Sold <span className="text-[#dc2626]">*</span>
        </label>
        <input
          type="number"
          min={1}
          max={maxQty}
          value={unitsSold}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setUnitsSold(isNaN(v) ? 1 : v);
          }}
          className="w-full px-3 py-2 text-sm rounded-xl font-medium text-[#1e293b] outline-none transition-colors"
          style={{
            border: isValid ? "1.5px solid #e2e8f0" : "1.5px solid #dc2626",
            background: isValid ? "white" : "#fff5f5",
          }}
          onFocus={(e) => { if (isValid) e.currentTarget.style.borderColor = "#2563eb"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = isValid ? "#e2e8f0" : "#dc2626"; }}
          autoFocus
        />
        {!isValid && unitsSold > maxQty && (
          <p className="text-xs text-[#dc2626] mt-1">Cannot exceed available quantity of {maxQty}</p>
        )}
      </div>
      {isValid && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "#f1f5f9" }}>
          <span className="text-xs font-semibold text-[#64748b]">Remaining after this sale:</span>
          <span className="text-sm font-bold" style={{ color: isFullySold ? "#16a34a" : "#334155" }}>
            {remaining} unit{remaining !== 1 ? "s" : ""}
          </span>
        </div>
      )}
      {isValid && (
        <div
          className="rounded-xl px-4 py-3 text-xs font-medium"
          style={isFullySold ? { background: "#dcfce7", color: "#16a34a" } : { background: "#eff6ff", color: "#2563eb" }}
        >
          {isFullySold
            ? "All units sold — item moves to Sales Record"
            : `Item stays active with ${remaining} unit${remaining !== 1 ? "s" : ""} remaining`}
        </div>
      )}
      <div className="flex justify-end gap-3 pt-1">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-medium text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!isValid}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "#16a34a" }}
          onMouseEnter={(e) => { if (isValid) (e.currentTarget as HTMLElement).style.background = "#15803d"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#16a34a"; }}
        >
          Confirm Sold
        </button>
      </div>
    </div>
  );
}

interface Props {
  entries: ShortListEntry[];
  isLoading: boolean;
  isManager: boolean;
  currentPicName: string;
  onEditRequest: (entry: ShortListEntry) => void;
  onDeleteRequest: (entry: ShortListEntry) => void;
  onOfferRequest: (entry: ShortListEntry) => void;
  onMarkReviewed?: (id: number) => Promise<void>;
  onSwitchToSales?: () => void;
}

const TH_BASE = "sticky top-0 z-10 px-5 py-3 text-left whitespace-nowrap";

export default function ShortListTable({
  entries,
  isLoading,
  isManager,
  currentPicName,
  onEditRequest,
  onDeleteRequest,
  onMarkReviewed,
  onSwitchToSales,
}: Props) {
  const [reviewingIds, setReviewingIds]       = useState<Set<number>>(new Set());
  const [justReviewedIds, setJustReviewedIds] = useState<Set<number>>(new Set());
  const [sellingIds, setSellingIds]           = useState<Set<number>>(new Set());
  const [sellConfirmEntry, setSellConfirmEntry]     = useState<ShortListEntry | null>(null);
  const [reviewConfirmEntry, setReviewConfirmEntry] = useState<ShortListEntry | null>(null);
  const [unitsSold, setUnitsSold]       = useState(1);
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId]     = useState<number | null>(null);
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });
  const { toasts, showSuccess, showError, showInfo, dismiss } = useToast();

  // Ref to the <td> containing the open ⋮ menu — used for click-outside detection
  const menuCellRef = useRef<HTMLTableCellElement | null>(null);

  // Close ⋮ dropdown on outside click (no fixed backdrop that blocks sidebar)
  useEffect(() => {
    if (openMenuId === null) return;
    function handler(e: MouseEvent) {
      if (menuCellRef.current && !menuCellRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  const { sortConfig, handleSort, clearSort, sortData } = useTableSort();
  const { columnFilters, setColumnFilter, clearColumnFilter, clearAllColumnFilters, filterData, getUniqueValues } =
    useTableFilter();

  const augmented = useMemo(
    () => entries.map((e) => ({ ...e, return_label: getReturnLabel(e.return_status) })),
    [entries],
  );

  const picValues      = useMemo(() => getUniqueValues(augmented, "pic_name"),     [augmented, getUniqueValues]);
  const categoryValues = useMemo(() => getUniqueValues(augmented, "category"),     [augmented, getUniqueValues]);
  const uomValues      = useMemo(() => getUniqueValues(augmented, "uom"),          [augmented, getUniqueValues]);
  const returnValues   = useMemo(() => getUniqueValues(augmented, "return_label"), [augmented, getUniqueValues]);

  const processedEntries = useMemo(() => {
    const filtered = filterData(augmented as unknown as Record<string, unknown>[]) as typeof augmented;
    return sortData(filtered as unknown as Record<string, unknown>[]) as typeof augmented;
  }, [augmented, filterData, sortData]);

  const hasActiveSort    = !!sortConfig.column;
  const hasActiveFilters = Object.keys(columnFilters).length > 0;
  const hasActiveState   = hasActiveSort || hasActiveFilters;

  function colBg(col: string): React.CSSProperties {
    return sortConfig.column === col ? { background: "#eff6ff" } : { background: "#f8fafc" };
  }
  function cellBg(col: string): React.CSSProperties {
    return sortConfig.column === col ? { background: "#fafcff" } : {};
  }

  async function confirmMarkReviewed() {
    if (!reviewConfirmEntry) return;
    const id = reviewConfirmEntry.id;
    setReviewConfirmEntry(null);
    setReviewingIds((prev) => { const s = new Set(prev); s.add(id); return s; });
    try {
      const res = await fetch(`/api/expiry/${id}/review`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to mark reviewed");
      setJustReviewedIds((prev) => { const s = new Set(prev); s.add(id); return s; });
      showSuccess("Item marked as reviewed");
      setTimeout(() => {
        setJustReviewedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      }, 5000);
      await onMarkReviewed?.(id);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to mark reviewed");
    } finally {
      setReviewingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  function openSellFromPopup() {
    if (!reviewConfirmEntry) return;
    const entry = reviewConfirmEntry;
    setReviewConfirmEntry(null);
    setSellConfirmEntry(entry);
    setUnitsSold(1);
  }

  async function confirmSell() {
    if (!sellConfirmEntry) return;
    const entry = sellConfirmEntry;
    const sold = unitsSold;
    setSellConfirmEntry(null);
    setSellingIds((prev) => { const s = new Set(prev); s.add(entry.id); return s; });
    try {
      const res = await fetch(`/api/expiry/${entry.id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units_sold: sold }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      if (json.fully_sold) {
        showSuccess(`${sold} unit${sold !== 1 ? "s" : ""} sold — item moved to Sales Record`);
      } else {
        showInfo(`${sold} unit(s) sold. ${json.remaining} remaining`);
      }
      await onMarkReviewed?.(entry.id);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to mark as sold");
    } finally {
      setSellingIds((prev) => { const s = new Set(prev); s.delete(entry.id); return s; });
    }
  }

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-[#f1f5f9] animate-pulse">
            <div className="flex gap-4">
              <div className="h-4 w-24 bg-[#f1f5f9] rounded" />
              <div className="h-4 w-16 bg-[#f1f5f9] rounded" />
              <div className="h-4 flex-1 bg-[#f1f5f9] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm flex flex-col items-center justify-center py-16 text-center">
        <DocumentTextIcon className="w-12 h-12 text-[#cbd5e1] mb-3" />
        <p className="text-sm text-[#94a3b8]">No items found</p>
      </div>
    );
  }

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* ── Row-click popup (portal-based) ──────────────────────────────── */}
      <Modal isOpen={reviewConfirmEntry !== null} onClose={() => setReviewConfirmEntry(null)}>
        {reviewConfirmEntry && (
          <ReviewPopupContent
            entry={reviewConfirmEntry}
            isManager={isManager}
            currentPicName={currentPicName}
            onSwitchToSales={onSwitchToSales}
            onClose={() => setReviewConfirmEntry(null)}
            onReviewed={confirmMarkReviewed}
            onSell={openSellFromPopup}
          />
        )}
      </Modal>

      {/* ── Sell modal (portal-based) ───────────────────────────────────── */}
      <Modal isOpen={sellConfirmEntry !== null} onClose={() => setSellConfirmEntry(null)}>
        {sellConfirmEntry && (
          <SellModalContent
            entry={sellConfirmEntry}
            unitsSold={unitsSold}
            setUnitsSold={setUnitsSold}
            onClose={() => setSellConfirmEntry(null)}
            onConfirm={confirmSell}
          />
        )}
      </Modal>

      {/* Sort/filter toolbar */}
      {hasActiveState && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs">
          {hasActiveSort && sortConfig.column && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
              style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
              Sorted: {COLUMN_LABELS[sortConfig.column] ?? sortConfig.column}{" "}
              ({sortConfig.direction === "asc" ? "A→Z" : "Z→A"})
              <button onClick={clearSort} className="ml-0.5 font-bold leading-none hover:opacity-70">×</button>
            </span>
          )}
          {Object.entries(columnFilters).map(([col, vals]) => (
            <span key={col} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
              style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
              {COLUMN_LABELS[col] ?? col}: {vals.join(", ")}
              <button onClick={() => clearColumnFilter(col)} className="ml-0.5 font-bold leading-none hover:opacity-70">×</button>
            </span>
          ))}
          <button onClick={() => { clearSort(); clearAllColumnFilters(); }}
            className="ml-auto font-medium text-[#94a3b8] hover:text-[#334155] transition-colors">
            Clear all
          </button>
        </div>
      )}

      {/* No results after filter */}
      {processedEntries.length === 0 && hasActiveFilters && (
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm flex flex-col items-center justify-center py-12 text-center">
          <DocumentTextIcon className="w-10 h-10 text-[#cbd5e1] mb-2" />
          <p className="text-sm text-[#94a3b8]">No items match the active column filters.</p>
          <button onClick={clearAllColumnFilters} className="mt-2 text-xs text-[#2563eb] hover:underline">
            Clear filters
          </button>
        </div>
      )}

      {processedEntries.length > 0 && (
        <>
          <div className="overflow-x-auto overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th className={TH_BASE} style={colBg("logged_at")}>
                    <SortableHeader label="Date Logged" column="logged_at" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={TH_BASE} style={colBg("pic_name")}>
                    <SortableHeader label="PIC" column="pic_name" sortConfig={sortConfig} onSort={handleSort}
                      filterable filterValues={picValues}
                      activeFilters={columnFilters["pic_name"] ?? []}
                      onFilter={(v) => setColumnFilter("pic_name", v)} />
                  </th>
                  <th className={TH_BASE} style={colBg("stock_id")}>
                    <SortableHeader label="Stock ID" column="stock_id" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={TH_BASE} style={colBg("barcode")}>
                    <SortableHeader label="Barcode" column="barcode" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={`${TH_BASE} max-w-[200px]`} style={colBg("description")}>
                    <SortableHeader label="Description" column="description" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={TH_BASE} style={colBg("category")}>
                    <SortableHeader label="Category" column="category" sortConfig={sortConfig} onSort={handleSort}
                      filterable filterValues={categoryValues}
                      activeFilters={columnFilters["category"] ?? []}
                      onFilter={(v) => setColumnFilter("category", v)} />
                  </th>
                  <th className={TH_BASE} style={{ background: "#f8fafc" }}>
                    <SortableHeader label="UOM" column="uom" sortConfig={sortConfig} onSort={handleSort}
                      filterable filterValues={uomValues}
                      activeFilters={columnFilters["uom"] ?? []}
                      onFilter={(v) => setColumnFilter("uom", v)} />
                  </th>
                  <th className={TH_BASE} style={colBg("quantity")}>
                    <SortableHeader label="Qty" column="quantity" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={TH_BASE} style={colBg("expiry_date")}>
                    <SortableHeader label="Expiry Date" column="expiry_date" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={TH_BASE} style={colBg("days_left")}>
                    <SortableHeader label="Days Left" column="days_left" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={TH_BASE} style={{ background: "#f8fafc" }}>
                    <SortableHeader label="Return" column="return_label" sortConfig={sortConfig} onSort={handleSort}
                      filterable filterValues={returnValues}
                      activeFilters={columnFilters["return_label"] ?? []}
                      onFilter={(v) => setColumnFilter("return_label", v)} />
                  </th>
                  <th className={TH_BASE} style={{ background: "#f8fafc", width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {processedEntries.map((entry) => {
                  const justReviewed = justReviewedIds.has(entry.id);
                  const isReviewing  = reviewingIds.has(entry.id);
                  const isSelling    = sellingIds.has(entry.id);
                  const isHovered    = hoveredRowId === entry.id;
                  const menuOpen     = openMenuId === entry.id;

                  const isSold = entry.item_status === "sold" || entry.quantity === 0;
                  const canReview = (isManager || entry.pic_name === currentPicName)
                    && !isSold
                    && entry.return_status !== "returned";
                  const canSell = (isManager || entry.pic_name === currentPicName)
                    && !isSold;

                  const reviewStatus    = getRowStatus(entry, justReviewed);
                  const firstCellBorder = getFirstCellBorderStyle(reviewStatus);
                  const rowBg           = getRowBgStyle(reviewStatus);

                  const showMenu = isHovered || menuOpen;

                  return (
                    <tr
                      key={entry.id}
                      className="transition-colors duration-150"
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        ...(isHovered && !menuOpen ? { background: "#f8fafc" } : rowBg),
                      }}
                      onMouseDown={(e) => setMouseDownPos({ x: e.clientX, y: e.clientY })}
                      onClick={(e) => {
                        const dx = Math.abs(e.clientX - mouseDownPos.x);
                        const dy = Math.abs(e.clientY - mouseDownPos.y);
                        if (dx > 5 || dy > 5) return;
                        const sel = window.getSelection();
                        if (sel && sel.toString().length > 0) return;
                        setReviewConfirmEntry(entry);
                      }}
                      onMouseEnter={() => setHoveredRowId(entry.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      <td
                        className="px-5 py-3.5 font-medium text-[#334155] whitespace-nowrap"
                        style={{ ...cellBg("logged_at"), ...firstCellBorder }}
                      >
                        {formatDate(entry.logged_at)}
                      </td>
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap" style={cellBg("pic_name")}>
                        <span
                          className="badge"
                          style={{ background: "#dbeafe", color: "#2563eb" }}
                          onClick={stop}
                        >
                          {entry.pic_name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[#334155] font-mono text-xs whitespace-nowrap" style={cellBg("stock_id")}>
                        {entry.stock_id ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[#334155] font-mono text-xs whitespace-nowrap" style={cellBg("barcode")}>
                        {entry.barcode}
                      </td>
                      <td className="px-5 py-3.5 font-medium max-w-[200px]" style={cellBg("description")}>
                        <span
                          className="block truncate text-[#334155] font-medium"
                          title={entry.description + (entry.notes ? ` — ${entry.notes}` : "")}
                        >
                          {entry.description}
                        </span>
                        {entry.notes && (
                          <span className="block truncate text-xs text-[#94a3b8] mt-0.5" title={entry.notes}>
                            {entry.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[#334155] whitespace-nowrap" style={cellBg("category")}>
                        {entry.category}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[#334155] text-xs whitespace-nowrap">
                        {entry.uom ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap" style={cellBg("quantity")}>
                        <span className="text-[#334155]">{entry.quantity}</span>
                        {entry.notes?.includes("unit(s) sold") && (
                          <span className="block text-[10px] text-[#94a3b8] leading-tight">partial</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[#334155] whitespace-nowrap" style={cellBg("expiry_date")}>
                        {formatDate(entry.expiry_date)}
                      </td>
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap" style={cellBg("days_left")}>
                        <DaysLeftBadge entry={entry} onClick={stop} />
                      </td>
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                        <ReturnBadge status={entry.return_status} onClick={stop} />
                      </td>

                      {/* ⋮ action menu cell */}
                      <td
                        ref={(el) => { if (menuOpen) menuCellRef.current = el; }}
                        className="pr-3 py-3.5 whitespace-nowrap relative"
                        style={{ width: 40 }}
                        onClick={stop}
                      >
                        <button
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150"
                          style={{
                            opacity: showMenu ? 1 : 0,
                            color: "#64748b",
                            background: menuOpen ? "#f1f5f9" : "",
                          }}
                          title="Actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(menuOpen ? null : entry.id);
                          }}
                          onMouseEnter={(e) => { if (!menuOpen) (e.currentTarget as HTMLElement).style.background = "#f1f5f9"; }}
                          onMouseLeave={(e) => { if (!menuOpen) (e.currentTarget as HTMLElement).style.background = ""; }}
                        >
                          {isReviewing ? (
                            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <EllipsisVerticalIcon className="w-4 h-4" />
                          )}
                        </button>

                        {menuOpen && (
                          <div
                            className="absolute right-0 z-50 bg-white rounded-xl shadow-lg py-1"
                            style={{ top: "calc(100% - 4px)", minWidth: 168, border: "1px solid #e2e8f0" }}
                          >
                            {canReview && (
                              <button
                                onClick={() => { setOpenMenuId(null); setReviewConfirmEntry(entry); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors"
                                style={{ color: "#16a34a" }}
                                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f0fdf4")}
                                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                              >
                                <CheckIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                Mark Reviewed
                              </button>
                            )}
                            {canSell && (
                              <button
                                onClick={() => { setOpenMenuId(null); setSellConfirmEntry(entry); setUnitsSold(1); }}
                                disabled={isSelling}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors disabled:opacity-50"
                                style={{ color: "#2563eb" }}
                                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#eff6ff")}
                                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                              >
                                <BanknotesIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                {isSelling ? "Selling…" : "Mark as Sold"}
                              </button>
                            )}
                            {isManager && (canReview || canSell) && (
                              <div className="my-1 mx-2" style={{ height: 1, background: "#f1f5f9" }} />
                            )}
                            {isManager && (
                              <button
                                onClick={() => { setOpenMenuId(null); onEditRequest(entry); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors"
                                style={{ color: "#334155" }}
                                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
                                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                              >
                                <PencilSquareIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                Edit Entry
                              </button>
                            )}
                            {isManager && (
                              <button
                                onClick={() => { setOpenMenuId(null); onDeleteRequest(entry); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors"
                                style={{ color: "#dc2626" }}
                                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#fff5f5")}
                                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                              >
                                <TrashIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-1">
            {[
              { color: "#22c55e", label: "Up to date" },
              { color: "#eab308", label: "Needs review" },
              { color: "#ef4444", label: "Critical" },
              { color: "#94a3b8", label: "Resolved" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-[3px] h-3.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-xs text-[#94a3b8]">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
