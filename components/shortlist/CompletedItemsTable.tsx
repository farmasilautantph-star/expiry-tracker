"use client";

import { useCallback, useEffect, useState } from "react";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

interface CompletedEntry {
  id: number;
  barcode: string;
  description: string;
  category: string;
  expiry_date: string;
  pic_id: number;
  pic_name: string;
  logged_at: string;
  notes: string | null;
  stock_id: string | null;
  uom: string | null;
  quantity: number;
  item_status: string;
  completed_via: string | null;
  completed_at: string | null;
  completed_notes: string | null;
  sold_at: string | null;
  sold_by: string | null;
  return_notes: string | null;
}

interface Filters {
  completed_via: string;
  month: string;
  pic: string;
  search: string;
}

const COMPLETED_VIA_LABELS: Record<string, string> = {
  sold: "Sold",
  returned: "Returned",
  return_not_approved: "Return Not Approved",
  offer_received: "Offer Received",
  offer_rejected: "Offer Rejected",
};

const COMPLETED_VIA_STYLE: Record<string, { bg: string; color: string }> = {
  sold: { bg: "#dbeafe", color: "#2563eb" },
  returned: { bg: "#dcfce7", color: "#16a34a" },
  return_not_approved: { bg: "#fee2e2", color: "#dc2626" },
  offer_received: { bg: "#dcfce7", color: "#16a34a" },
  offer_rejected: { bg: "#fee2e2", color: "#dc2626" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

function CompletedViaBadge({ via }: { via: string | null }) {
  if (!via) return <span className="text-xs text-[#cbd5e1]">—</span>;
  const style = COMPLETED_VIA_STYLE[via] ?? {
    bg: "#f1f5f9",
    color: "#475569",
  };
  return (
    <span
      className="badge"
      style={{ background: style.bg, color: style.color }}
    >
      <Dot color={style.color} />
      {COMPLETED_VIA_LABELS[via] ?? via}
    </span>
  );
}

const TH =
  "sticky top-0 z-10 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap";
const TD = "px-5 py-3.5 font-medium";

interface Props {
  isManager: boolean;
  picName: string;
  onCountChange?: (count: number) => void;
}

export default function CompletedItemsTable({ isManager, picName, onCountChange }: Props) {
  const [entries, setEntries] = useState<CompletedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    completed_via: "",
    month: "",
    pic: "",
    search: "",
  });

  const fetchData = useCallback(async (f: Filters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.completed_via) params.set("completed_via", f.completed_via);
      if (f.month) params.set("month", f.month);
      if (f.pic) params.set("pic", f.pic);
      if (f.search) params.set("search", f.search);
      const res = await fetch(`/api/expiry/completed?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      setEntries(json.data);
      onCountChange?.(json.data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(filters);
  }, [fetchData, filters]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filters.completed_via}
          onChange={(e) => setFilter("completed_via", e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
        >
          <option value="">All statuses</option>
          {Object.entries(COMPLETED_VIA_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>

        <input
          type="month"
          value={filters.month}
          onChange={(e) => setFilter("month", e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
        />

        {isManager && (
          <input
            type="text"
            placeholder="Filter by PIC..."
            value={filters.pic}
            onChange={(e) => setFilter("pic", e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 w-40"
          />
        )}

        <input
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 w-48"
        />

        {(filters.completed_via || filters.month || filters.pic || filters.search) && (
          <button
            onClick={() =>
              setFilters({ completed_via: "", month: "", pic: "", search: "" })
            }
            className="text-xs text-[#64748b] hover:text-[#334155] px-2 py-1.5 rounded-lg hover:bg-[#f1f5f9] transition-colors"
          >
            Clear
          </button>
        )}

        <span className="text-xs text-[#94a3b8] ml-auto">
          {!isLoading && `${entries.length} item${entries.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
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
      ) : entries.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <DocumentTextIcon className="w-12 h-12 text-[#cbd5e1] mb-3" />
          <p className="text-sm text-[#94a3b8]">No completed items yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                <th className={TH}>Completed Date</th>
                {isManager && <th className={TH}>PIC</th>}
                <th className={TH}>Stock ID</th>
                <th className={TH}>Barcode</th>
                <th className={`${TH} max-w-[200px]`}>Description</th>
                <th className={TH}>Category</th>
                <th className={TH}>Expiry Date</th>
                <th className={TH}>Completed Via</th>
                <th className={TH}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
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
                  <td className={`${TD} text-[#334155] whitespace-nowrap`}>
                    {formatDate(entry.completed_at)}
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
                      title={
                        entry.description + (entry.notes ? ` — ${entry.notes}` : "")
                      }
                    >
                      {entry.description}
                    </span>
                    {entry.notes && (
                      <span
                        className="block truncate text-xs text-[#94a3b8] mt-0.5"
                        title={entry.notes}
                      >
                        {entry.notes}
                      </span>
                    )}
                  </td>
                  <td className={`${TD} text-[#334155] whitespace-nowrap`}>
                    {entry.category}
                  </td>
                  <td className={`${TD} text-[#334155] whitespace-nowrap`}>
                    {formatDate(entry.expiry_date)}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    <CompletedViaBadge via={entry.completed_via} />
                  </td>
                  <td className={`${TD} text-[#94a3b8] text-xs max-w-[200px]`}>
                    <span className="block truncate" title={entry.completed_notes ?? entry.return_notes ?? ""}>
                      {entry.completed_notes ?? entry.return_notes ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
