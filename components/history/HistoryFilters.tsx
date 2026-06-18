"use client";

import { useMemo } from "react";
import type { HistoryFilters } from "@/hooks/useHistory";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = -6; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
    opts.push({ value, label });
  }
  return opts.reverse();
}

interface Props {
  filters: HistoryFilters;
  setFilter: <K extends keyof HistoryFilters>(
    key: K,
    value: HistoryFilters[K],
  ) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  picNames: string[];
}

const SELECT_CLS =
  "relative appearance-none border border-[#e2e8f0] bg-white text-[#334155] text-sm transition-colors focus:outline-none pr-8 pl-4 py-2";

export default function HistoryFilters({
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  picNames,
}: Props) {
  const months = useMemo(() => monthOptions(), []);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          type="text"
          placeholder="Search description…"
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm text-[#0f172a] bg-white placeholder-[#94a3b8] transition-colors focus:outline-none"
          style={{ border: "1px solid #e2e8f0", borderRadius: "10px" }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#2563eb";
            e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.boxShadow = "";
          }}
        />
        {filters.search && (
          <button
            onClick={() => setFilter("search", "")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Month */}
      <div className="relative">
        <select
          value={filters.month}
          onChange={(e) => setFilter("month", e.target.value)}
          className={SELECT_CLS}
          style={{ borderRadius: "10px" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.1)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = ""; }}
        >
          <option value="">All Time</option>
          {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
      </div>

      {/* Module */}
      <div className="relative">
        <select
          value={filters.module}
          onChange={(e) => setFilter("module", e.target.value)}
          className={SELECT_CLS}
          style={{ borderRadius: "10px" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.1)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = ""; }}
        >
          <option value="">All Modules</option>
          <option value="expiry">Expiry</option>
          <option value="offers">Offers</option>
          <option value="returns">Returns</option>
          <option value="users">Users</option>
        </select>
        <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
      </div>

      {/* Action */}
      <div className="relative">
        <select
          value={filters.action}
          onChange={(e) => setFilter("action", e.target.value)}
          className={SELECT_CLS}
          style={{ borderRadius: "10px" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.1)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = ""; }}
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>
        <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
      </div>

      {/* PIC */}
      {picNames.length > 0 && (
        <div className="relative">
          <select
            value={filters.pic}
            onChange={(e) => setFilter("pic", e.target.value)}
            className={SELECT_CLS}
            style={{ borderRadius: "10px" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.1)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = ""; }}
          >
            <option value="">All PICs</option>
            {picNames.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
        </div>
      )}

      {/* Clear */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: "#64748b" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#64748b")}
        >
          Clear
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-semibold"
            style={{ background: "#2563eb" }}
          >
            {activeFilterCount}
          </span>
        </button>
      )}
    </div>
  );
}
