"use client";

import { useMemo, useState } from "react";
import type { OfferEntry } from "@/hooks/useOffers";
import MonthPicker, { type MonthValue } from "@/components/ui/MonthPicker";
import { MagnifyingGlassIcon, ChevronDownIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

interface Props {
  entries: OfferEntry[];
  isLoading: boolean;
}

const TH = "sticky top-0 z-10 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap";
const TD = "px-5 py-3.5 text-sm font-medium";

const SELECT_CLS = "appearance-none border border-[#e2e8f0] bg-white text-[#334155] text-sm focus:outline-none pr-8 pl-4 py-2";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

const STATUS_STYLE = {
  accepted:  { bg: "#dcfce7", color: "#16a34a", dot: "#16a34a", label: "Received" },
  rejected:  { bg: "#fee2e2", color: "#dc2626", dot: "#dc2626", label: "Rejected" },
};

export default function OfferHistoryTab({ entries, isLoading }: Props) {
  const now = new Date();
  const [historyMonth, setHistoryMonth] = useState<MonthValue | null>({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [typeFilter, setTypeFilter] = useState<"" | "accepted" | "rejected">("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let data = entries.filter(
      (e) => e.offer_status === "accepted" || e.offer_status === "rejected"
    );
    if (historyMonth) {
      const ym = `${historyMonth.year}-${String(historyMonth.month).padStart(2, "0")}`;
      data = data.filter((e) => {
        const dateStr = (e.received_at ?? e.updated_at ?? e.created_at).substring(0, 7);
        return dateStr === ym;
      });
    }
    if (typeFilter) {
      data = data.filter((e) => e.offer_status === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.outlet_name.toLowerCase().includes(q) ||
          e.barcode.toLowerCase().includes(q)
      );
    }
    return data;
  }, [entries, historyMonth, typeFilter, search]);

  const received = filtered.filter((e) => e.offer_status === "accepted").reduce((s, e) => s + e.quantity, 0);
  const rejected = filtered.filter((e) => e.offer_status === "rejected").length;

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-[#f1f5f9] animate-pulse">
            <div className="flex gap-4">
              <div className="h-4 w-24 bg-[#f1f5f9] rounded" />
              <div className="h-4 w-48 bg-[#f1f5f9] rounded" />
              <div className="h-4 flex-1 bg-[#f1f5f9] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <MonthPicker value={historyMonth} onChange={setHistoryMonth} placeholder="All Time" />

        {/* Type filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "" | "accepted" | "rejected")}
            className={SELECT_CLS}
            style={{ borderRadius: "10px" }}
          >
            <option value="">All Types</option>
            <option value="accepted">Received</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search item, outlet, barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm text-[#0f172a] bg-white placeholder-[#94a3b8] focus:outline-none"
            style={{ border: "1px solid #e2e8f0", borderRadius: "10px" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl text-sm" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <span className="flex items-center gap-1.5 font-medium" style={{ color: "#16a34a" }}>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#16a34a" }} />
          Received: {received} unit{received !== 1 ? "s" : ""}
        </span>
        <span className="text-[#e2e8f0]">|</span>
        <span className="flex items-center gap-1.5 font-medium" style={{ color: "#dc2626" }}>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#dc2626" }} />
          Rejected: {rejected}
        </span>
        <span className="text-[#e2e8f0]">|</span>
        <span className="text-[#64748b] font-medium">Total: {filtered.length}</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <DocumentTextIcon className="w-12 h-12 text-[#cbd5e1] mb-3" />
          <p className="text-sm text-[#94a3b8]">No offer history found</p>
          <p className="text-xs text-[#94a3b8] mt-1">Completed offers will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                <th className={TH}>Completed Date</th>
                <th className={`${TH} max-w-[200px]`}>Description</th>
                <th className={TH}>Barcode</th>
                <th className={TH}>Category</th>
                <th className={TH}>Outlet</th>
                <th className={TH}>Qty</th>
                <th className={TH}>Status</th>
                <th className={TH}>Received Date</th>
                <th className={TH}>Notes / Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const s = STATUS_STYLE[entry.offer_status as "accepted" | "rejected"] ?? STATUS_STYLE.rejected;
                const completedDate = entry.offer_status === "accepted"
                  ? (entry.received_at ?? entry.updated_at)
                  : entry.updated_at;
                return (
                  <tr
                    key={entry.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                  >
                    <td className={`${TD} text-[#334155] whitespace-nowrap`}>{formatDate(completedDate)}</td>
                    <td className={`${TD} max-w-[200px]`}>
                      <span
                        className="block truncate text-[#334155] font-medium"
                        title={entry.description}
                      >
                        {entry.description}
                      </span>
                    </td>
                    <td className={`${TD} text-[#334155] font-mono text-xs whitespace-nowrap`}>{entry.barcode}</td>
                    <td className={`${TD} text-[#334155] whitespace-nowrap`}>{entry.category ?? "—"}</td>
                    <td className={`${TD} text-[#334155] font-medium whitespace-nowrap`}>{entry.outlet_name}</td>
                    <td className={`${TD} text-[#334155] whitespace-nowrap`}>{entry.quantity}</td>
                    <td className={`${TD} whitespace-nowrap`}>
                      <span className="badge" style={{ background: s.bg, color: s.color }}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                        {s.label}
                      </span>
                    </td>
                    <td className={`${TD} text-[#334155] whitespace-nowrap`}>
                      {entry.offer_status === "accepted" ? formatDate(entry.received_at) : "—"}
                    </td>
                    <td className={`${TD} text-[#64748b] max-w-[180px]`}>
                      {entry.rejection_notes ? (
                        <span className="block truncate" title={entry.rejection_notes}>
                          {entry.rejection_notes}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
