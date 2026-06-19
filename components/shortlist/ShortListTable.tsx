"use client";

import { useMemo, useState } from "react";
import type { ShortListEntry } from "@/hooks/useShortList";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import SortableHeader from "@/components/ui/SortableHeader";
import {
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
  TagIcon,
  DocumentTextIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

type Urgency = "expired" | "critical" | "warning" | "safe";

const BADGE_STYLE: Record<Urgency, { bg: string; color: string; dotColor: string; fontWeight: number }> = {
  expired:  { bg: "#fee2e2", color: "#dc2626", dotColor: "#dc2626", fontWeight: 600 },
  critical: { bg: "#ffedd5", color: "#ea580c", dotColor: "#ea580c", fontWeight: 600 },
  warning:  { bg: "#fef9c3", color: "#ca8a04", dotColor: "#ca8a04", fontWeight: 600 },
  safe:     { bg: "#dcfce7", color: "#16a34a", dotColor: "#16a34a", fontWeight: 600 },
};

// Human-readable labels for sort/filter toolbar
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

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

function StatusBadge({ status, urgency }: { status: string; urgency?: Urgency }) {
  const style = urgency
    ? BADGE_STYLE[urgency]
    : { bg: "#f1f5f9", color: "#475569", dotColor: "#94a3b8", fontWeight: 600 };
  return (
    <span
      className="badge"
      style={{ background: style.bg, color: style.color, fontWeight: style.fontWeight }}
    >
      <Dot color={style.dotColor} />
      {status}
    </span>
  );
}

function OfferBadge({ entry }: { entry: ShortListEntry }) {
  const { quantity, total_offered, offer_status } = entry;
  if (offer_status === "not-offered") {
    return <span className="text-xs text-[#cbd5e1]">—</span>;
  }
  const isComplete = total_offered >= quantity;
  return (
    <span
      className="badge"
      style={{
        background: isComplete ? "#dcfce7" : "#dbeafe",
        color: isComplete ? "#16a34a" : "#2563eb",
      }}
    >
      <Dot color={isComplete ? "#16a34a" : "#2563eb"} />
      {total_offered}/{quantity} offered
    </span>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function formatDaysLeft(days_left: number): string {
  if (days_left < 0) return "Expired";
  if (days_left === 0) return "Today";
  if (days_left <= 30) return `${days_left}d left`;
  return `${Math.round(days_left / 30)}m left`;
}

function DaysLeftBadge({ entry }: { entry: ShortListEntry }) {
  const { days_left, urgency } = entry;
  const u = urgency as Urgency;
  const style = BADGE_STYLE[u] ?? BADGE_STYLE.safe;
  return (
    <span className="badge" style={{ background: style.bg, color: style.color, fontWeight: style.fontWeight }}>
      <Dot color={style.dotColor} />
      {formatDaysLeft(days_left)}
    </span>
  );
}

function ReturnBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[#cbd5e1] text-xs">—</span>;
  const isPending = status === "pending";
  return (
    <span
      className="badge"
      style={{
        background: isPending ? "#fef3c7" : "#f1f5f9",
        color: isPending ? "#d97706" : "#64748b",
      }}
    >
      <Dot color={isPending ? "#d97706" : "#94a3b8"} />
      {isPending ? "Return" : "Non-Return"}
    </span>
  );
}

function calcReviewInfo(entry: ShortListEntry): {
  label: string;
  colorClass: string;
  statusLabel: string;
  statusBg: string;
  statusColor: string;
} {
  if (entry.return_status === "returned" || entry.quantity === 0) {
    return {
      label: "Resolved",
      colorClass: "text-[#64748b]",
      statusLabel: "Resolved",
      statusBg: "#f1f5f9",
      statusColor: "#64748b",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ref = entry.last_reviewed_at ?? entry.logged_at;
  const refDate = new Date(ref);
  refDate.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - refDate.getTime()) / 86_400_000);

  if (days <= 7) {
    return {
      label: days === 0 ? "Just now" : `${days}d ago`,
      colorClass: "text-[#16a34a]",
      statusLabel: "Up to date",
      statusBg: "#dcfce7",
      statusColor: "#16a34a",
    };
  }
  if (days <= 14) {
    return {
      label: `${days}d ago`,
      colorClass: "text-[#d97706]",
      statusLabel: "Needs Review",
      statusBg: "#fef3c7",
      statusColor: "#d97706",
    };
  }
  return {
    label: entry.last_reviewed_at ? `${days}d ago` : "Never",
    colorClass: "text-[#dc2626]",
    statusLabel: "Critical",
    statusBg: "#fee2e2",
    statusColor: "#dc2626",
  };
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
}

const TH_BASE =
  "sticky top-0 z-10 px-5 py-3 text-left whitespace-nowrap";

export default function ShortListTable({
  entries,
  isLoading,
  isManager,
  currentPicName,
  onEditRequest,
  onDeleteRequest,
  onOfferRequest,
  onMarkReviewed,
}: Props) {
  const [reviewingIds, setReviewingIds] = useState<Set<number>>(new Set());
  const [justReviewedIds, setJustReviewedIds] = useState<Set<number>>(new Set());
  const [sellingIds, setSellingIds] = useState<Set<number>>(new Set());
  const [sellConfirmEntry, setSellConfirmEntry] = useState<ShortListEntry | null>(null);
  const [unitsSold, setUnitsSold] = useState(1);
  const { toasts, showSuccess, showError, showInfo, dismiss } = useToast();

  const { sortConfig, handleSort, clearSort, sortData } = useTableSort();
  const { columnFilters, setColumnFilter, clearColumnFilter, clearAllColumnFilters, filterData, getUniqueValues } =
    useTableFilter();

  // Augment entries with derived display field for return filter
  const augmented = useMemo(
    () => entries.map((e) => ({ ...e, return_label: getReturnLabel(e.return_status) })),
    [entries],
  );

  // Unique values for each filterable column (computed from ALL entries, not filtered)
  const picValues = useMemo(() => getUniqueValues(augmented, "pic_name"), [augmented, getUniqueValues]);
  const categoryValues = useMemo(() => getUniqueValues(augmented, "category"), [augmented, getUniqueValues]);
  const uomValues = useMemo(() => getUniqueValues(augmented, "uom"), [augmented, getUniqueValues]);
  const returnValues = useMemo(() => getUniqueValues(augmented, "return_label"), [augmented, getUniqueValues]);

  // Apply column filters then sort
  const processedEntries = useMemo(() => {
    const filtered = filterData(augmented as unknown as Record<string, unknown>[]) as typeof augmented;
    return sortData(filtered as unknown as Record<string, unknown>[]) as typeof augmented;
  }, [augmented, filterData, sortData]);

  const hasActiveSort = !!sortConfig.column;
  const hasActiveFilters = Object.keys(columnFilters).length > 0;
  const hasActiveState = hasActiveSort || hasActiveFilters;

  function colBg(col: string): React.CSSProperties {
    return sortConfig.column === col ? { background: "#eff6ff" } : { background: "#f8fafc" };
  }

  function cellBg(col: string): React.CSSProperties {
    return sortConfig.column === col ? { background: "#fafcff" } : {};
  }

  async function handleMarkReviewed(id: number) {
    setReviewingIds((prev) => { const s = new Set(prev); s.add(id); return s; });
    try {
      const res = await fetch(`/api/expiry/${id}/review`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to mark reviewed");
      setJustReviewedIds((prev) => { const s = new Set(prev); s.add(id); return s; });
      setTimeout(() => {
        setJustReviewedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      }, 3000);
      await onMarkReviewed?.(id);
    } finally {
      setReviewingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  function handleMarkSold(entry: ShortListEntry) {
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
        showSuccess("Item marked as fully sold");
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

      {/* Sell modal */}
      {sellConfirmEntry && (() => {
        const maxQty = sellConfirmEntry.quantity;
        const remaining = maxQty - unitsSold;
        const isFullySold = remaining === 0;
        const isValid = Number.isInteger(unitsSold) && unitsSold >= 1 && unitsSold <= maxQty;
        const desc = sellConfirmEntry.description.length > 40
          ? sellConfirmEntry.description.slice(0, 40) + "…"
          : sellConfirmEntry.description;
        const [ey, em, ed] = sellConfirmEntry.expiry_date.split("T")[0].split("-");
        const expiryFmt = `${ed}/${em}/${ey}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
            <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-sm p-6 space-y-4">
              <h3 className="text-base font-semibold text-[#1e293b]">Mark Units as Sold</h3>

              {/* Item info */}
              <div className="rounded-xl bg-[#f8fafc] px-4 py-3 space-y-0.5">
                <p className="text-sm font-semibold text-[#1e293b] leading-snug">{desc}</p>
                <p className="text-xs text-[#94a3b8]">
                  {sellConfirmEntry.category} · Expiry: {expiryFmt}
                </p>
              </div>

              {/* Available qty */}
              <div>
                <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-1">Total Quantity</p>
                <p className="text-sm text-[#334155] font-medium">{maxQty} unit{maxQty !== 1 ? "s" : ""} available</p>
              </div>

              {/* Units sold input */}
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
                  <p className="text-xs text-[#dc2626] mt-1">
                    Cannot exceed available quantity of {maxQty}
                  </p>
                )}
              </div>

              {/* Remaining display */}
              {isValid && (
                <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ background: "#f1f5f9" }}>
                  <span className="text-xs font-semibold text-[#64748b]">Remaining after this sale:</span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: isFullySold ? "#16a34a" : "#334155" }}
                  >
                    {remaining} unit{remaining !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {/* Outcome info box */}
              {isValid && (
                <div
                  className="rounded-xl px-4 py-3 text-xs font-medium"
                  style={
                    isFullySold
                      ? { background: "#dcfce7", color: "#16a34a" }
                      : { background: "#eff6ff", color: "#2563eb" }
                  }
                >
                  {isFullySold
                    ? "All units sold — item will move to Completed"
                    : `Item stays active with ${remaining} unit${remaining !== 1 ? "s" : ""} remaining`}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={() => setSellConfirmEntry(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSell}
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
          </div>
        );
      })()}

      {/* Active sort + filter toolbar */}
      {hasActiveState && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs">
          {hasActiveSort && sortConfig.column && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
              style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}
            >
              Sorted: {COLUMN_LABELS[sortConfig.column] ?? sortConfig.column}{" "}
              ({sortConfig.direction === "asc" ? "A→Z" : "Z→A"})
              <button
                onClick={clearSort}
                className="ml-0.5 font-bold leading-none hover:opacity-70"
              >
                ×
              </button>
            </span>
          )}
          {Object.entries(columnFilters).map(([col, vals]) => (
            <span
              key={col}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
              style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}
            >
              {COLUMN_LABELS[col] ?? col}: {vals.join(", ")}
              <button
                onClick={() => clearColumnFilter(col)}
                className="ml-0.5 font-bold leading-none hover:opacity-70"
              >
                ×
              </button>
            </span>
          ))}
          <button
            onClick={() => { clearSort(); clearAllColumnFilters(); }}
            className="ml-auto font-medium text-[#94a3b8] hover:text-[#334155] transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* No results after column filter */}
      {processedEntries.length === 0 && hasActiveFilters && (
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm flex flex-col items-center justify-center py-12 text-center">
          <DocumentTextIcon className="w-10 h-10 text-[#cbd5e1] mb-2" />
          <p className="text-sm text-[#94a3b8]">No items match the active column filters.</p>
          <button
            onClick={clearAllColumnFilters}
            className="mt-2 text-xs text-[#2563eb] hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {processedEntries.length > 0 && (
        <div className="overflow-x-auto overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>

                <th className={TH_BASE} style={colBg("logged_at")}>
                  <SortableHeader label="Date Logged" column="logged_at" sortConfig={sortConfig} onSort={handleSort} />
                </th>

                <th className={TH_BASE} style={colBg("pic_name")}>
                  <SortableHeader
                    label="PIC" column="pic_name" sortConfig={sortConfig} onSort={handleSort}
                    filterable filterValues={picValues}
                    activeFilters={columnFilters["pic_name"] ?? []}
                    onFilter={(v) => setColumnFilter("pic_name", v)}
                  />
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
                  <SortableHeader
                    label="Category" column="category" sortConfig={sortConfig} onSort={handleSort}
                    filterable filterValues={categoryValues}
                    activeFilters={columnFilters["category"] ?? []}
                    onFilter={(v) => setColumnFilter("category", v)}
                  />
                </th>

                {/* UOM — filterable only (no sort) */}
                <th className={TH_BASE} style={{ background: "#f8fafc" }}>
                  <SortableHeader
                    label="UOM" column="uom" sortConfig={sortConfig} onSort={handleSort}
                    filterable filterValues={uomValues}
                    activeFilters={columnFilters["uom"] ?? []}
                    onFilter={(v) => setColumnFilter("uom", v)}
                  />
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

                {/* Return — filterable only */}
                <th className={TH_BASE} style={{ background: "#f8fafc" }}>
                  <SortableHeader
                    label="Return" column="return_label" sortConfig={sortConfig} onSort={handleSort}
                    filterable filterValues={returnValues}
                    activeFilters={columnFilters["return_label"] ?? []}
                    onFilter={(v) => setColumnFilter("return_label", v)}
                  />
                </th>

                <th className={TH_BASE} style={{ background: "#f8fafc" }}>
                  <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[#64748b]">Return By</span>
                </th>
                <th className={TH_BASE} style={{ background: "#f8fafc" }}>
                  <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[#64748b]">Offered</span>
                </th>
                <th className={TH_BASE} style={{ background: "#f8fafc" }}>
                  <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[#64748b]">Last Review</span>
                </th>
                <th className={TH_BASE} style={{ background: "#f8fafc" }}>
                  <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[#64748b]">Status</span>
                </th>
                <th className={TH_BASE} style={{ background: "#f8fafc" }}>
                  <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[#64748b]">Review</span>
                </th>
                {isManager && (
                  <th className={TH_BASE} style={{ background: "#f8fafc", textAlign: "right" }}>
                    <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[#64748b]">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {processedEntries.map((entry) => {
                const urgency = entry.urgency as Urgency;
                const canReview = isManager || entry.pic_name === currentPicName;
                const isReviewing = reviewingIds.has(entry.id);
                const justReviewed = justReviewedIds.has(entry.id);
                const review = calcReviewInfo(entry);
                const canSell =
                  (entry.item_status === "active" || entry.item_status === undefined) &&
                  (isManager || entry.pic_name === currentPicName);
                const isSelling = sellingIds.has(entry.id);

                return (
                  <tr
                    key={entry.id}
                    className="transition-colors duration-150"
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "#f8fafc")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "")
                    }
                  >
                    <td className="px-5 py-3.5 font-medium text-[#334155] whitespace-nowrap" style={cellBg("logged_at")}>
                      {formatDate(entry.logged_at)}
                    </td>
                    <td className="px-5 py-3.5 font-medium whitespace-nowrap" style={cellBg("pic_name")}>
                      <span className="badge" style={{ background: "#dbeafe", color: "#2563eb" }}>
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
                      <DaysLeftBadge entry={entry} />
                    </td>
                    <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                      <ReturnBadge status={entry.return_status} />
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#334155] text-xs whitespace-nowrap">
                      {entry.return_status === "pending" && entry.return_by_date
                        ? formatDate(entry.return_by_date)
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                      <OfferBadge entry={entry} />
                    </td>
                    <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                      <span className={`text-xs font-medium ${justReviewed ? "text-[#16a34a]" : review.colorClass}`}>
                        {justReviewed ? "Just now" : review.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                      <span
                        className="badge"
                        style={{
                          background: justReviewed ? "#dcfce7" : review.statusBg,
                          color: justReviewed ? "#16a34a" : review.statusColor,
                        }}
                      >
                        <Dot color={justReviewed ? "#16a34a" : review.statusColor} />
                        {justReviewed ? "Up to date" : review.statusLabel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {canReview &&
                          entry.return_status !== "returned" &&
                          entry.quantity > 0 && (
                            <button
                              onClick={() => handleMarkReviewed(entry.id)}
                              disabled={isReviewing || justReviewed}
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ color: "#16a34a" }}
                              title="Mark Reviewed"
                              onMouseEnter={(e) =>
                                ((e.currentTarget as HTMLElement).style.background = "#dcfce7")
                              }
                              onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLElement).style.background = "")
                              }
                            >
                              {isReviewing ? (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <CheckIcon className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        {canSell && (
                          <button
                            onClick={() => handleMarkSold(entry)}
                            disabled={isSelling}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ color: "#16a34a" }}
                            title="Mark as Sold"
                            onMouseEnter={(e) =>
                              ((e.currentTarget as HTMLElement).style.background = "#dcfce7")
                            }
                            onMouseLeave={(e) =>
                              ((e.currentTarget as HTMLElement).style.background = "")
                            }
                          >
                            {isSelling ? (
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <BanknotesIcon className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    {isManager && (
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {entry.total_offered < entry.quantity && (
                            <button
                              onClick={() => onOfferRequest(entry)}
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                              style={{ color: "#2563eb" }}
                              title={`Offer to Outlet — ${entry.quantity - entry.total_offered} unit${entry.quantity - entry.total_offered === 1 ? "" : "s"} remaining`}
                              onMouseEnter={(e) =>
                                ((e.currentTarget as HTMLElement).style.background = "#dbeafe")
                              }
                              onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLElement).style.background = "")
                              }
                            >
                              <TagIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onEditRequest(entry)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                            style={{ color: "#2563eb" }}
                            title="Edit"
                            onMouseEnter={(e) =>
                              ((e.currentTarget as HTMLElement).style.background = "#eff6ff")
                            }
                            onMouseLeave={(e) =>
                              ((e.currentTarget as HTMLElement).style.background = "")
                            }
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteRequest(entry)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                            style={{ color: "#dc2626" }}
                            title="Delete"
                            onMouseEnter={(e) =>
                              ((e.currentTarget as HTMLElement).style.background = "#fee2e2")
                            }
                            onMouseLeave={(e) =>
                              ((e.currentTarget as HTMLElement).style.background = "")
                            }
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
