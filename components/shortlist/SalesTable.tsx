"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { SalesEntry } from "@/hooks/useSalesRecord";
import { formatRM } from "@/lib/formatCurrency";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Standard 7-slot page-number window with ellipsis for long lists — full run
// of numbers when everything fits, first/last pinned with a "…" gap otherwise.
function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

const SALE_STATUS_STYLE = {
  partial:    { bg: "#fef9c3", color: "#d97706", dot: "#d97706" },
  fully_sold: { bg: "#dcfce7", color: "#16a34a", dot: "#16a34a" },
};

const SALE_STATUS_LABEL = {
  partial:    "Partial Sold",
  fully_sold: "Fully Sold",
};

const TH =
  "sticky top-0 z-10 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap";
const TD = "px-5 py-3.5";

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

// One summary row per (item, seller) — aggregates every transaction so the
// same barcode sold by the same person on different dates/receipts collapses
// into a single row, expandable to see each underlying transaction.
interface SalesGroup {
  key: string;
  pic_name: string;
  stock_id: string | null;
  barcode: string;
  description: string;
  category: string;
  expiry_date: string;
  original_qty: number | null;
  current_qty: number;
  total_units_sold: number;
  total_amount: number;
  missingPriceCount: number;
  soldCount: number;
  sale_status: "partial" | "fully_sold";
  last_sold_at: string | null;
  transactions: SalesEntry[];
}

function buildGroups(entries: SalesEntry[]): SalesGroup[] {
  const map = new Map<string, SalesGroup>();

  for (const entry of entries) {
    const key = `${entry.barcode}||${entry.pic_name}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        pic_name: entry.pic_name,
        stock_id: entry.stock_id,
        barcode: entry.barcode,
        description: entry.description,
        category: entry.category,
        expiry_date: entry.expiry_date,
        original_qty: entry.original_qty,
        current_qty: 0,
        total_units_sold: 0,
        total_amount: 0,
        missingPriceCount: 0,
        soldCount: 0,
        sale_status: "fully_sold",
        last_sold_at: null,
        transactions: [],
      };
      map.set(key, g);
    }

    // A barcode can match multiple logged batches — represent the group by
    // whichever member has the soonest expiry date (most actionable one).
    if (entry.expiry_date && (!g.expiry_date || entry.expiry_date < g.expiry_date)) {
      g.expiry_date = entry.expiry_date;
      g.original_qty = entry.original_qty;
    }

    g.current_qty += entry.current_qty;
    g.total_units_sold += entry.units_sold ?? 0;
    if (entry.units_sold != null) {
      g.soldCount++;
      if (entry.amount != null) g.total_amount += entry.amount;
      else g.missingPriceCount++;
    }
    if (entry.sale_status === "partial") g.sale_status = "partial";
    if (!g.last_sold_at || (entry.last_sold_at && entry.last_sold_at > g.last_sold_at)) {
      g.last_sold_at = entry.last_sold_at;
    }
    g.transactions.push(entry);
  }

  const groups = Array.from(map.values());
  for (const g of groups) {
    g.transactions.sort((a, b) => (b.last_sold_at ?? "").localeCompare(a.last_sold_at ?? ""));
  }

  return groups;
}

function sortGroups(groups: SalesGroup[], sortBy: string, sortOrder: "asc" | "desc"): SalesGroup[] {
  const dir = sortOrder === "asc" ? 1 : -1;
  const sorted = [...groups];

  if (sortBy === "expiry_date") {
    sorted.sort((a, b) => {
      const av = a.expiry_date || "9999-99-99";
      const bv = b.expiry_date || "9999-99-99";
      return av === bv ? 0 : (av < bv ? -1 : 1) * dir;
    });
  } else if (sortBy === "description") {
    sorted.sort((a, b) => a.description.localeCompare(b.description) * dir);
  } else if (sortBy === "last_sold_at") {
    sorted.sort((a, b) => {
      const av = a.last_sold_at ?? "";
      const bv = b.last_sold_at ?? "";
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
  } else {
    // Default / "units_sold": total units sold per group.
    sorted.sort((a, b) => (a.total_units_sold - b.total_units_sold) * dir);
  }

  return sorted;
}

interface Props {
  entries: SalesEntry[];
  isLoading: boolean;
  isManager: boolean;
  onViewAllTime: () => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export default function SalesTable({ entries, isLoading, isManager, onViewAllTime, sortBy, sortOrder }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo(
    () => sortGroups(buildGroups(entries), sortBy, sortOrder),
    [entries, sortBy, sortOrder],
  );

  // Reset to page 1 whenever the underlying (filtered) dataset or page size
  // changes, so we never land on an out-of-range empty page.
  useEffect(() => {
    setPage(1);
  }, [entries, pageSize]);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const total = groups.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIdx = (clampedPage - 1) * pageSize;
  const pageGroups = groups.slice(startIdx, startIdx + pageSize);
  const rangeStart = total === 0 ? 0 : startIdx + 1;
  const rangeEnd = Math.min(startIdx + pageSize, total);

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        {[...Array(4)].map((_, i) => (
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
      <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-sm flex flex-col items-center justify-center py-16 text-center px-6">
        <DocumentTextIcon className="w-12 h-12 text-[#cbd5e1] mb-3" />
        <p className="text-sm font-semibold text-[#334155]">No sales recorded this month</p>
        <p className="text-xs text-[#94a3b8] mt-1 mb-4">
          Try selecting a different month or view all time
        </p>
        <button
          onClick={onViewAllTime}
          className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-colors"
          style={{ background: "#2563eb" }}
        >
          View All Time
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
    <div className="overflow-x-auto overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
            <th className={TH}></th>
            {isManager && <th className={TH}>PIC</th>}
            <th className={TH}>Stock ID</th>
            <th className={TH}>Barcode</th>
            <th className={`${TH} max-w-[200px]`}>Description</th>
            <th className={TH}>Category</th>
            <th className={TH}>Expiry Date</th>
            <th className={TH}>Original Qty</th>
            <th className={TH}>Total Units Sold</th>
            <th className={TH}>Total Amount (RM)</th>
            <th className={TH}>Remaining</th>
            <th className={TH}>Status</th>
          </tr>
        </thead>
        <tbody>
          {pageGroups.map((g) => {
            const statusStyle = SALE_STATUS_STYLE[g.sale_status];
            const isOpen = expanded.has(g.key);
            const colCount = 11 + (isManager ? 1 : 0);
            return (
              <Fragment key={g.key}>
                <tr
                  className="transition-colors duration-150 cursor-pointer"
                  style={{ borderBottom: isOpen ? "none" : "1px solid #f1f5f9" }}
                  onClick={() => toggle(g.key)}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "#f8fafc")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "")
                  }
                >
                  <td className={`${TD} w-8`}>
                    {isOpen ? (
                      <ChevronDownIcon className="w-4 h-4 text-[#94a3b8]" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-[#94a3b8]" />
                    )}
                  </td>
                  {isManager && (
                    <td className={`${TD} whitespace-nowrap`}>
                      <span
                        className="badge"
                        style={{ background: "#dbeafe", color: "#2563eb" }}
                      >
                        {g.pic_name}
                      </span>
                    </td>
                  )}
                  <td className={`${TD} text-[#334155] font-mono text-xs whitespace-nowrap`}>
                    {g.stock_id ?? "—"}
                  </td>
                  <td className={`${TD} text-[#334155] font-mono text-xs whitespace-nowrap`}>
                    {g.barcode}
                  </td>
                  <td className={`${TD} max-w-[200px]`}>
                    <span
                      className="block truncate text-[#334155] font-medium"
                      title={g.description}
                    >
                      {g.description}
                    </span>
                  </td>
                  <td className={`${TD} text-[#334155] whitespace-nowrap`}>{g.category}</td>
                  <td className={`${TD} text-[#334155] whitespace-nowrap`}>
                    {formatDate(g.expiry_date)}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    <span className="text-sm text-[#64748b]">
                      {g.original_qty ?? "—"}
                    </span>
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {g.total_units_sold > 0 ? (
                      <span className="text-sm font-bold text-[#0f172a]">
                        {g.total_units_sold} unit{g.total_units_sold !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-[#cbd5e1]">—</span>
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {g.soldCount === 0 ? (
                      <span className="text-xs text-[#cbd5e1]">—</span>
                    ) : g.missingPriceCount === g.soldCount ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#d97706]"
                        title="No price found for this barcode"
                      >
                        <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                        No price
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#0f172a]">
                          {formatRM(g.total_amount)}
                        </span>
                        {g.missingPriceCount > 0 && (
                          <ExclamationTriangleIcon
                            className="w-3.5 h-3.5 text-[#d97706]"
                            title={`${g.missingPriceCount} transaction(s) missing price data`}
                          />
                        )}
                      </span>
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {g.current_qty > 0 ? (
                      <span className="text-xs font-medium" style={{ color: "#2563eb" }}>
                        {g.current_qty} left
                      </span>
                    ) : (
                      <span className="text-xs text-[#cbd5e1]">—</span>
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      <Dot color={statusStyle.dot} />
                      {SALE_STATUS_LABEL[g.sale_status]}
                    </span>
                  </td>
                </tr>
                {isOpen && (
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td colSpan={colCount} className="bg-[#f8fafc] px-5 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[#94a3b8] uppercase tracking-wider">
                            <th className="text-left font-semibold pb-2 pr-4">Date Sold</th>
                            <th className="text-left font-semibold pb-2 pr-4">Qty</th>
                            <th className="text-left font-semibold pb-2 pr-4">Amount (RM)</th>
                            <th className="text-left font-semibold pb-2">Document No.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.transactions.map((t) => (
                            <tr key={t.id} className="text-[#334155]">
                              <td className="py-1 pr-4 whitespace-nowrap">{formatDate(t.last_sold_at)}</td>
                              <td className="py-1 pr-4 whitespace-nowrap">
                                {t.units_sold != null ? `${t.units_sold} unit${t.units_sold !== 1 ? "s" : ""}` : "—"}
                              </td>
                              <td className="py-1 pr-4 whitespace-nowrap">
                                {t.amount != null ? formatRM(t.amount) : "—"}
                              </td>
                              <td className="py-1 font-mono whitespace-nowrap">{t.document_number ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-xs text-[#64748b]">
          Showing {rangeStart} to {rangeEnd} of {total} items
        </p>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={clampedPage === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#64748b] border border-[#e2e8f0] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f8fafc] transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            </button>

            {getPageNumbers(clampedPage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-[#94a3b8]">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                    p === clampedPage
                      ? "bg-[#2563eb] text-white"
                      : "text-[#64748b] border border-[#e2e8f0] bg-white hover:bg-[#f8fafc]"
                  }`}
                >
                  {p}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={clampedPage === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#64748b] border border-[#e2e8f0] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f8fafc] transition-colors"
              aria-label="Next page"
            >
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-[#334155] focus:outline-none appearance-none"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
