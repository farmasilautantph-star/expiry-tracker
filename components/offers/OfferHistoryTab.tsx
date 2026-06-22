"use client";

import { useMemo, useState } from "react";
import type { OfferEntry } from "@/hooks/useOffers";
import type { MonthValue } from "@/components/ui/MonthPicker";
import { ChevronDownIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

interface Props {
  entries: OfferEntry[];
  isLoading: boolean;
  historyMonth: MonthValue | null;
  search: string;
}

const TH = "sticky top-0 z-10 bg-[#f8fafc] px-4 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap";
const TD = "px-4 py-3 text-sm font-medium";

const SELECT_CLS = "appearance-none border border-[#e2e8f0] bg-white text-[#334155] text-sm focus:outline-none pr-8 pl-4 py-2";

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

const STATUS_STYLE = {
  accepted: { bg: "#dcfce7", color: "#16a34a", label: "Received" },
  rejected: { bg: "#fee2e2", color: "#dc2626", label: "Rejected" },
};

export default function OfferHistoryTab({ entries, isLoading, historyMonth, search }: Props) {
  const [typeFilter, setTypeFilter] = useState<"" | "accepted" | "rejected">("");

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
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-4 py-4 border-b border-[#f1f5f9] animate-pulse">
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
      {/* Type filter */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "" | "accepted" | "rejected")}
            className={SELECT_CLS}
            style={{ borderRadius: "10px" }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#2563eb";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            <option value="">All Types</option>
            <option value="accepted">Received</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
        </div>
      </div>

      {/* Summary bar */}
      <div
        className="flex items-center gap-4 px-4 py-2.5 rounded-xl text-sm"
        style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
      >
        <span className="flex items-center gap-1.5 font-medium" style={{ color: "#16a34a" }}>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#16a34a" }} />
          Received: {received} unit{received !== 1 ? "s" : ""}
        </span>
        <span style={{ color: "#e2e8f0" }}>|</span>
        <span className="flex items-center gap-1.5 font-medium" style={{ color: "#dc2626" }}>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#dc2626" }} />
          Rejected: {rejected}
        </span>
        <span style={{ color: "#e2e8f0" }}>|</span>
        <span className="text-[#64748b] font-medium">Total: {filtered.length}</span>
      </div>

      {/* Table / empty */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
          style={{ border: "1px solid #e2e8f0" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#f1f5f9" }}
          >
            <DocumentTextIcon className="w-8 h-8 text-[#94a3b8]" />
          </div>
          <p className="text-base font-semibold text-[#334155]">No offer history found</p>
          <p className="text-sm text-[#94a3b8] mt-2">Completed offers will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white">
          <div className="flex items-center px-4 py-2.5 bg-[#f8fafc]" style={{ borderBottom: "1px solid #e2e8f0" }}>
            <span className="text-xs text-[#94a3b8]">{filtered.length} {filtered.length === 1 ? "offer" : "offers"}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th className={`${TH} min-w-[180px]`}>Item</th>
                <th className={TH}>Barcode</th>
                <th className={TH}>Outlet</th>
                <th className={TH}>Category</th>
                <th className={TH}>Qty</th>
                <th className={TH}>Status</th>
                <th className={TH}>Completed</th>
                <th className={TH}>Notes</th>
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
                    <td className={`${TD} min-w-[180px]`}>
                      <p
                        className="text-sm font-semibold text-[#0f172a] leading-snug"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                        title={entry.description}
                      >
                        {entry.description}
                      </p>
                    </td>
                    <td className={`${TD} font-mono text-xs text-[#334155] whitespace-nowrap`}>{entry.barcode}</td>
                    <td className={`${TD} text-[#334155] font-semibold whitespace-nowrap`}>{entry.outlet_name}</td>
                    <td className={`${TD} text-xs text-[#475569] whitespace-nowrap`}>{entry.category ?? "—"}</td>
                    <td className={`${TD} text-[#334155] whitespace-nowrap`}>{entry.quantity}</td>
                    <td className={`${TD} whitespace-nowrap`}>
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: s.bg, color: s.color }}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className={`${TD} text-xs text-[#475569] whitespace-nowrap`}>{formatShortDate(completedDate)}</td>
                    <td className={`${TD} text-[#64748b] max-w-[180px]`}>
                      {entry.rejection_notes ? (
                        <span className="block truncate text-xs" title={entry.rejection_notes}>
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
