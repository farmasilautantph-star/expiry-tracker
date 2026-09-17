"use client";

import { useEffect, useState } from "react";
import {
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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

interface Props {
  entries: SalesEntry[];
  isLoading: boolean;
  isManager: boolean;
  onViewAllTime: () => void;
}

export default function SalesTable({ entries, isLoading, isManager, onViewAllTime }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 whenever the underlying (filtered) dataset or page size
  // changes, so we never land on an out-of-range empty page.
  useEffect(() => {
    setPage(1);
  }, [entries, pageSize]);

  const total = entries.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIdx = (clampedPage - 1) * pageSize;
  const pageEntries = entries.slice(startIdx, startIdx + pageSize);
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
            <th className={TH}>Date Sold</th>
            {isManager && <th className={TH}>PIC</th>}
            <th className={TH}>Stock ID</th>
            <th className={TH}>Barcode</th>
            <th className={`${TH} max-w-[200px]`}>Description</th>
            <th className={TH}>Category</th>
            <th className={TH}>Expiry Date</th>
            <th className={TH}>Original Qty</th>
            <th className={TH}>Units Sold</th>
            <th className={TH}>Amount (RM)</th>
            <th className={TH}>Remaining</th>
            <th className={TH}>Status</th>
          </tr>
        </thead>
        <tbody>
          {pageEntries.map((entry) => {
            const statusStyle = SALE_STATUS_STYLE[entry.sale_status];
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
                <td className={`${TD} text-[#334155] whitespace-nowrap font-medium`}>
                  {formatDate(entry.last_sold_at)}
                </td>
                {isManager && (
                  <td className={`${TD} whitespace-nowrap`}>
                    <span
                      className="badge"
                      style={{ background: "#dbeafe", color: "#2563eb" }}
                    >
                      {entry.pic_name}
                    </span>
                  </td>
                )}
                <td className={`${TD} text-[#334155] font-mono text-xs whitespace-nowrap`}>
                  {entry.stock_id ?? "—"}
                </td>
                <td className={`${TD} text-[#334155] font-mono text-xs whitespace-nowrap`}>
                  {entry.barcode}
                </td>
                <td className={`${TD} max-w-[200px]`}>
                  <span
                    className="block truncate text-[#334155] font-medium"
                    title={entry.description}
                  >
                    {entry.description}
                  </span>
                </td>
                <td className={`${TD} text-[#334155] whitespace-nowrap`}>{entry.category}</td>
                <td className={`${TD} text-[#334155] whitespace-nowrap`}>
                  {formatDate(entry.expiry_date)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <span className="text-sm text-[#64748b]">
                    {entry.original_qty ?? "—"}
                  </span>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  {entry.units_sold != null ? (
                    <span className="text-sm font-bold text-[#0f172a]">
                      {entry.units_sold} unit{entry.units_sold !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-[#cbd5e1]">—</span>
                  )}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  {entry.amount != null ? (
                    <span className="text-sm font-bold text-[#0f172a]">
                      {formatRM(entry.amount)}
                    </span>
                  ) : entry.units_sold != null ? (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#d97706]"
                      title="No price found for this barcode"
                    >
                      <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                      No price
                    </span>
                  ) : (
                    <span className="text-xs text-[#cbd5e1]">—</span>
                  )}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  {entry.current_qty > 0 ? (
                    <span className="text-xs font-medium" style={{ color: "#2563eb" }}>
                      {entry.current_qty} left
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
                    {SALE_STATUS_LABEL[entry.sale_status]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-xs text-[#64748b]">
          Showing {rangeStart} to {rangeEnd} of {total} records
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
