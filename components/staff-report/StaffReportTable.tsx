"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import type { StaffReportRow } from "@/hooks/useStaffReport";

interface Props {
  rows: StaffReportRow[];
  isLoading: boolean;
  period: string;
}

function rateColor(rate: number): string {
  if (rate >= 80) return "#16a34a";
  if (rate >= 50) return "#d97706";
  return "#dc2626";
}

function rateBorder(rate: number): string {
  if (rate >= 80) return "#22c55e";
  if (rate >= 50) return "#eab308";
  return "#ef4444";
}

function RateBar({ rate }: { rate: number }) {
  const color = rateColor(rate);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden" style={{ minWidth: 48 }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, rate)}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold flex-shrink-0" style={{ color }}>
        {rate}%
      </span>
    </div>
  );
}

function StaffRow({ row }: { row: StaffReportRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer transition-colors"
        style={{ borderBottom: "1px solid #f1f5f9", borderLeft: `3px solid ${rateBorder(row.review_rate)}` }}
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
      >
        {/* Staff */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: "#2563eb" }}
            >
              {row.pic_name[0]?.toUpperCase() ?? "?"}
            </div>
            <span className="text-sm font-semibold text-slate-800">{row.pic_name}</span>
          </div>
        </td>
        {/* Logged */}
        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{row.items_logged}</td>
        {/* Reviewed */}
        <td className="px-4 py-3">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">
              {row.items_reviewed} of {row.items_logged}
            </p>
            <RateBar rate={row.review_rate} />
          </div>
        </td>
        {/* Missed Sundays */}
        <td className="px-4 py-3">
          <span
            className="text-sm font-bold"
            style={{ color: row.missed_sundays > 0 ? "#dc2626" : "#16a34a" }}
          >
            {row.missed_sundays}
          </span>
        </td>
        {/* Sold */}
        <td className="px-4 py-3 text-sm font-medium text-slate-700">{row.items_sold}</td>
        {/* Units Sold */}
        <td className="px-4 py-3 text-sm font-medium text-slate-700">{row.units_sold}</td>
        {/* Returned */}
        <td className="px-4 py-3 text-sm font-medium text-slate-700">{row.items_returned}</td>
        {/* Offered */}
        <td className="px-4 py-3 text-sm font-medium text-slate-700">{row.items_offered}</td>
        {/* Active */}
        <td className="px-4 py-3 text-sm font-medium text-slate-700">{row.items_active}</td>
        {/* Expand toggle */}
        <td className="px-4 py-3">
          {expanded
            ? <ChevronUpIcon className="w-4 h-4 text-slate-400" />
            : <ChevronDownIcon className="w-4 h-4 text-slate-400" />}
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
          <td colSpan={10} className="px-6 py-3">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Items Logged</p>
                <p className="text-sm font-semibold text-slate-700">{row.items_logged}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Reviewed On Time</p>
                <p className="text-sm font-semibold text-slate-700">{row.items_reviewed} <span className="text-xs font-normal text-slate-400">({row.review_rate}%)</span></p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Missed Sundays</p>
                <p className="text-sm font-semibold" style={{ color: row.missed_sundays > 0 ? "#dc2626" : "#16a34a" }}>{row.missed_sundays}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sold</p>
                <p className="text-sm font-semibold text-slate-700">{row.items_sold} items · {row.units_sold} units</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Returned</p>
                <p className="text-sm font-semibold text-slate-700">{row.items_returned}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Offered to Outlet</p>
                <p className="text-sm font-semibold text-slate-700">{row.items_offered}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Active</p>
                <p className="text-sm font-semibold text-slate-700">{row.items_active}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const TH = "px-4 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap sticky top-0 bg-[#f8fafc] z-10";

export default function StaffReportTable({ rows, isLoading, period }: Props) {
  function handleExport() {
    if (!rows.length) return;
    const headers = ["Staff", "Items Logged", "Items Reviewed", "Review Rate (%)", "Missed Sundays", "Items Sold", "Units Sold", "Items Returned", "Items Offered", "Active Items"];
    const csvRows = rows.map((r) => [
      r.pic_name, r.items_logged, r.items_reviewed, r.review_rate,
      r.missed_sundays, r.items_sold, r.units_sold, r.items_returned,
      r.items_offered, r.items_active,
    ].join(","));
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-report-${period.replace(/\s/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200">
        <p className="text-base font-semibold text-slate-400">No data for this period</p>
        <p className="text-sm text-slate-300 mt-1">Try selecting a different month.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#2563eb] transition-colors"
          style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#dbeafe"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#eff6ff"; }}
        >
          ↓ Export CSV
        </button>
      </div>

      <div className="rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden">
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th className={TH} style={{ minWidth: 160 }}>Staff</th>
                <th className={TH}>Logged</th>
                <th className={TH} style={{ minWidth: 180 }}>Reviewed</th>
                <th className={TH}>Missed Sundays</th>
                <th className={TH}>Items Sold</th>
                <th className={TH}>Units Sold</th>
                <th className={TH}>Returned</th>
                <th className={TH}>Offered</th>
                <th className={TH}>Active</th>
                <th className={TH} style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <StaffRow key={row.pic_name} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
