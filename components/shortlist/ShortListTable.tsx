"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import type { ShortListEntry } from "@/hooks/useShortList";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import SortableHeader from "@/components/ui/SortableHeader";
import {
  PencilSquareIcon,
  TrashIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import ItemReviewModal from "@/components/shortlist/ItemReviewModal";

type Urgency = "expired" | "critical" | "warning" | "safe";

const BADGE_STYLE: Record<Urgency, { bg: string; color: string; dotColor: string; fontWeight: number }> = {
  expired:  { bg: "#fee2e2", color: "#dc2626", dotColor: "#dc2626", fontWeight: 600 },
  critical: { bg: "#ffedd5", color: "#ea580c", dotColor: "#ea580c", fontWeight: 600 },
  warning:  { bg: "#fef9c3", color: "#ca8a04", dotColor: "#ca8a04", fontWeight: 600 },
  safe:     { bg: "#dcfce7", color: "#16a34a", dotColor: "#16a34a", fontWeight: 600 },
};

const COLUMN_LABELS: Record<string, string> = {
  logged_at:   "Date Logged",
  pic_name:    "PIC",
  stock_id:    "Stock ID",
  barcode:     "Barcode",
  description: "Description",
  category:    "Category",
  uom:         "UOM",
  quantity:    "Qty",
  expiry_date: "Expiry",
  days_left:   "Days Left",
  return_label: "Return",
};

function getReturnLabel(status: string | null): string {
  if (!status) return "—";
  if (status === "pending") return "Return";
  return "Non-Return";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

// Colored sub-label + icon under DATE LOGGED showing review status
function ReviewSubLabel({ entry }: { entry: ShortListEntry }) {
  if (entry.return_status === "returned" || entry.quantity === 0) return null;

  const { review_status, last_reviewed_at, last_reviewed_display } = entry;

  type StatusConfig = { icon: React.ReactNode; text: string; color: string };

  let cfg: StatusConfig | null = null;

  if (review_status === "pending") {
    if (!last_reviewed_at) return null;
    const displayText = last_reviewed_display ?? new Date(last_reviewed_at).toLocaleString("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    cfg = {
      icon: <CheckIcon className="w-3 h-3 flex-shrink-0 text-green-600" />,
      text: displayText,
      color: "#16a34a",
    };
  } else if (review_status === "early_alert") {
    cfg = {
      icon: <ClockIcon className="w-3 h-3 flex-shrink-0 text-yellow-500" />,
      text: "Review in a few days",
      color: "#ca8a04",
    };
  } else if (review_status === "last_chance") {
    cfg = {
      icon: <ExclamationTriangleIcon className="w-3 h-3 flex-shrink-0 text-orange-500" />,
      text: "Review today!",
      color: "#ea580c",
    };
  } else if (review_status === "needs_review") {
    cfg = {
      icon: <XCircleIcon className="w-3 h-3 flex-shrink-0 text-red-500" />,
      text: "Missed Sunday deadline",
      color: "#dc2626",
    };
  } else if (review_status === "critical_stale") {
    cfg = {
      icon: <XCircleIcon className="w-3 h-3 flex-shrink-0 text-red-800" />,
      text: "Overdue 2+ Sundays",
      color: "#991b1b",
    };
  } else if (!last_reviewed_at) {
    cfg = {
      icon: <ClockIcon className="w-3 h-3 flex-shrink-0 text-slate-400" />,
      text: "Never reviewed",
      color: "#94a3b8",
    };
  }

  if (!cfg) return null;

  return (
    <span className="flex items-center gap-1 mt-0.5">
      {cfg.icon}
      <span className="text-[10px] font-medium" style={{ color: cfg.color }}>
        {cfg.text}
      </span>
    </span>
  );
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
    `${Math.round(entry.days_left / 30)}mo left`;
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

const stop = (e: React.MouseEvent) => e.stopPropagation();

interface Props {
  entries: ShortListEntry[];
  isLoading: boolean;
  isManager: boolean;
  currentPicName: string;
  onEditRequest: (entry: ShortListEntry) => void;
  onDeleteRequest: (entry: ShortListEntry) => void;
  onMarkReviewed?: (id: number) => Promise<void>;
  onPatchEntry?: (id: number, patch: Partial<ShortListEntry>) => void;
  onSwitchToSales?: () => void;
}

const TH_BASE = "sticky top-0 z-10 px-4 py-3 text-left whitespace-nowrap";
const EMPTY_FILTER: string[] = [];

export default function ShortListTable({
  entries,
  isLoading,
  isManager,
  currentPicName,
  onEditRequest,
  onDeleteRequest,
  onMarkReviewed,
  onPatchEntry,
  onSwitchToSales,
}: Props) {
  const [reviewModalOpen, setReviewModalOpen]   = useState(false);
  const [reviewingEntryId, setReviewingEntryId] = useState<number | null>(null);
  const [reviewedIds, setReviewedIds]           = useState<Set<number>>(new Set());
  const [hoveredRowId, setHoveredRowId]         = useState<number | null>(null);
  const [openMenuId, setOpenMenuId]             = useState<number | null>(null);
  const [mouseDownPos, setMouseDownPos]         = useState({ x: 0, y: 0 });
  const { toasts, showSuccess, dismiss }        = useToast();

  const menuCellRef   = useRef<HTMLTableCellElement | null>(null);
  const savedScrollY  = useRef<number>(0);

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

  const handleColumnFilter = useCallback(
    (col: string, vals: string[]) => setColumnFilter(col, vals),
    [setColumnFilter],
  );
  const onFilterPic      = useCallback((v: string[]) => handleColumnFilter("pic_name", v),     [handleColumnFilter]);
  const onFilterCategory = useCallback((v: string[]) => handleColumnFilter("category", v),     [handleColumnFilter]);
  const onFilterUom      = useCallback((v: string[]) => handleColumnFilter("uom", v),          [handleColumnFilter]);
  const onFilterReturn   = useCallback((v: string[]) => handleColumnFilter("return_label", v), [handleColumnFilter]);

  const hasActiveSort    = !!sortConfig.column;
  const hasActiveFilters = Object.keys(columnFilters).length > 0;
  const hasActiveState   = hasActiveSort || hasActiveFilters;

  function colBg(col: string): React.CSSProperties {
    return sortConfig.column === col ? { background: "#eff6ff" } : { background: "#f8fafc" };
  }
  function cellBg(col: string): React.CSSProperties {
    return sortConfig.column === col ? { background: "#fafcff" } : {};
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-4 py-3.5 border-b border-[#f1f5f9] animate-pulse">
            <div className="flex gap-4">
              <div className="h-4 w-20 bg-[#f1f5f9] rounded" />
              <div className="h-4 w-14 bg-[#f1f5f9] rounded" />
              <div className="h-4 flex-1 bg-[#f1f5f9] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
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

      <ItemReviewModal
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          window.scrollTo({ top: savedScrollY.current, behavior: "instant" });
        }}
        entryId={reviewingEntryId}
        onUpdated={() => {
          onMarkReviewed?.(reviewingEntryId!);
        }}
        onReviewed={(ts) => {
          if (reviewingEntryId !== null) {
            onPatchEntry?.(reviewingEntryId, {
              last_reviewed_at: ts.last_reviewed_at,
              last_reviewed_display: ts.last_reviewed_display,
              review_status: "pending",
            });
            setReviewedIds((prev) => { const s = new Set(prev); s.add(reviewingEntryId); return s; });
          }
        }}
        onSwitchToSales={onSwitchToSales}
        onToast={showSuccess}
      />

      {/* Active sort / filter chips */}
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
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <th className={TH_BASE} style={colBg("logged_at")}>
                    <SortableHeader label="Date Logged" column="logged_at" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={TH_BASE} style={colBg("pic_name")}>
                    <SortableHeader label="PIC" column="pic_name" sortConfig={sortConfig} onSort={handleSort}
                      filterable filterValues={picValues}
                      activeFilters={columnFilters["pic_name"] ?? EMPTY_FILTER}
                      onFilter={onFilterPic} />
                  </th>
                  <th className={TH_BASE} style={colBg("stock_id")}>
                    <SortableHeader label="Stock ID" column="stock_id" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={TH_BASE} style={colBg("barcode")}>
                    <SortableHeader label="Barcode" column="barcode" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={`${TH_BASE} max-w-[180px]`} style={colBg("description")}>
                    <SortableHeader label="Description" column="description" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={TH_BASE} style={colBg("category")}>
                    <SortableHeader label="Category" column="category" sortConfig={sortConfig} onSort={handleSort}
                      filterable filterValues={categoryValues}
                      activeFilters={columnFilters["category"] ?? EMPTY_FILTER}
                      onFilter={onFilterCategory} />
                  </th>
                  <th className={TH_BASE} style={{ background: "#f8fafc" }}>
                    <SortableHeader label="UOM" column="uom" sortConfig={sortConfig} onSort={handleSort}
                      filterable filterValues={uomValues}
                      activeFilters={columnFilters["uom"] ?? EMPTY_FILTER}
                      onFilter={onFilterUom} />
                  </th>
                  <th className={TH_BASE} style={colBg("quantity")}>
                    <SortableHeader label="Qty" column="quantity" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={TH_BASE} style={colBg("expiry_date")}>
                    <SortableHeader label="Expiry" column="expiry_date" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={TH_BASE} style={colBg("days_left")}>
                    <SortableHeader label="Days Left" column="days_left" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                  <th className={TH_BASE} style={{ background: "#f8fafc" }}>
                    <SortableHeader label="Return" column="return_label" sortConfig={sortConfig} onSort={handleSort}
                      filterable filterValues={returnValues}
                      activeFilters={columnFilters["return_label"] ?? EMPTY_FILTER}
                      onFilter={onFilterReturn} />
                  </th>
                  {isManager && <th className={TH_BASE} style={{ background: "#f8fafc", width: 40 }} />}
                </tr>
              </thead>
              <tbody>
                {processedEntries.map((entry) => {
                  const isHovered = hoveredRowId === entry.id;
                  const menuOpen  = openMenuId === entry.id;
                  const showMenu  = isHovered || menuOpen;

                  return (
                    <tr
                      key={entry.id}
                      className="transition-colors duration-100"
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        background: isHovered && !menuOpen ? "#f8fafc" : "white",
                      }}
                      onMouseDown={(e) => setMouseDownPos({ x: e.clientX, y: e.clientY })}
                      onClick={(e) => {
                        const dx = Math.abs(e.clientX - mouseDownPos.x);
                        const dy = Math.abs(e.clientY - mouseDownPos.y);
                        if (dx > 5 || dy > 5) return;
                        const sel = window.getSelection();
                        if (sel && sel.toString().length > 0) return;
                        savedScrollY.current = window.scrollY;
                        setReviewingEntryId(entry.id);
                        setReviewModalOpen(true);
                      }}
                      onMouseEnter={() => setHoveredRowId(entry.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      {/* DATE LOGGED */}
                      <td className="px-4 py-3 font-medium text-[#334155] whitespace-nowrap" style={cellBg("logged_at")}>
                        <span className="text-sm font-semibold text-[#0f172a]">
                          {formatDate(entry.logged_at)}
                        </span>
                        <ReviewSubLabel entry={reviewedIds.has(entry.id) ? { ...entry, review_status: "pending" } : entry} />
                      </td>

                      {/* PIC */}
                      <td className="px-4 py-3 whitespace-nowrap" style={cellBg("pic_name")}>
                        <span
                          className="badge"
                          style={{ background: "#dbeafe", color: "#2563eb" }}
                          onClick={stop}
                        >
                          {entry.pic_name}
                        </span>
                      </td>

                      {/* STOCK ID */}
                      <td className="px-4 py-3 font-medium text-[#334155] font-mono text-xs whitespace-nowrap" style={cellBg("stock_id")}>
                        {entry.stock_id ?? "—"}
                      </td>

                      {/* BARCODE */}
                      <td className="px-4 py-3 font-medium text-[#334155] font-mono text-xs whitespace-nowrap" style={cellBg("barcode")}>
                        {entry.barcode}
                      </td>

                      {/* DESCRIPTION — 2-line clamp */}
                      <td className="px-4 py-3 max-w-[180px]" style={cellBg("description")}>
                        <span
                          className="text-sm font-medium text-[#334155]"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
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

                      {/* CATEGORY */}
                      <td className="px-4 py-3 text-sm font-medium text-[#334155] whitespace-nowrap" style={cellBg("category")}>
                        {entry.category}
                      </td>

                      {/* UOM */}
                      <td className="px-4 py-3 text-xs font-medium text-[#334155] whitespace-nowrap">
                        {entry.uom ?? "—"}
                      </td>

                      {/* QTY */}
                      <td className="px-4 py-3 whitespace-nowrap" style={cellBg("quantity")}>
                        <span className="text-sm text-[#334155] font-semibold">{entry.quantity}</span>
                        {entry.notes?.includes("unit(s) sold") && (
                          <span className="block text-[10px] text-[#94a3b8] leading-tight">partial</span>
                        )}
                        {entry.offered_qty > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium leading-tight mt-0.5" style={{ color: "#2563eb" }}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#2563eb" }} />
                            {entry.offered_qty} offered
                          </span>
                        )}
                      </td>

                      {/* EXPIRY — short year */}
                      <td className="px-4 py-3 text-sm font-medium text-[#334155] whitespace-nowrap" style={cellBg("expiry_date")}>
                        {formatShortDate(entry.expiry_date)}
                      </td>

                      {/* DAYS LEFT */}
                      <td className="px-4 py-3 whitespace-nowrap" style={cellBg("days_left")}>
                        <DaysLeftBadge entry={entry} onClick={stop} />
                      </td>

                      {/* RETURN */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ReturnBadge status={entry.return_status} onClick={stop} />
                      </td>

                      {/* ⋮ menu — managers only */}
                      {isManager && (
                        <td
                          ref={(el) => { if (menuOpen) menuCellRef.current = el; }}
                          className="pr-3 py-3 whitespace-nowrap relative"
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
                            <EllipsisVerticalIcon className="w-4 h-4" />
                          </button>

                          {menuOpen && (
                            <div
                              className="absolute right-0 z-50 bg-white rounded-xl shadow-lg py-1"
                              style={{ top: "calc(100% - 4px)", minWidth: 152, border: "1px solid #e2e8f0" }}
                            >
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
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend — circular dots */}
          <div className="flex flex-wrap gap-4 mt-1">
            {[
              { color: "#22c55e", label: "Reviewed this week" },
              { color: "#eab308", label: "Review soon (Thu–Sat)" },
              { color: "#ea580c", label: "Review today (Sunday)" },
              { color: "#ef4444", label: "Missed Sunday" },
              { color: "#991b1b", label: "Missed 2+ Sundays" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-xs text-[#94a3b8]">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
