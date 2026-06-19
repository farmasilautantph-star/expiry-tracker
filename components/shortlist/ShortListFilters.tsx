"use client";

import type { ShortListFilters } from "@/hooks/useShortList";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

const CATEGORIES = [
  "MOM & BABY",
  "FS",
  "OTC",
  "Poison B",
  "Poison C",
  "PET CARE",
  "HS",
] as const;

interface Props {
  filters: ShortListFilters;
  setFilter: <K extends keyof ShortListFilters>(
    key: K,
    value: ShortListFilters[K],
  ) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  isManager: boolean;
  picOptions: string[];
}

const SELECT_CLS =
  "relative appearance-none border border-[#e2e8f0] bg-white text-[#334155] text-sm transition-colors focus:outline-none pr-8 pl-4 py-2";

export default function ShortListFilters({
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  isManager,
  picOptions,
}: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          type="text"
          placeholder="Search desc, barcode, stock ID…"
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

      {/* Category */}
      <div className="relative">
        <select
          value={filters.category}
          onChange={(e) => setFilter("category", e.target.value)}
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
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
      </div>

      {/* Status */}
      <div className="relative">
        <select
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
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
          <option value="">All Statuses</option>
          <option value="expired">Expired</option>
          <option value="critical">Critical (&lt; 3 months)</option>
          <option value="warning">Warning (3–8 months)</option>
          <option value="safe">Safe (&gt; 8 months)</option>
        </select>
        <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
      </div>

      {/* PIC — manager only */}
      {isManager && (
        <div className="relative">
          <select
            value={filters.pic}
            onChange={(e) => setFilter("pic", e.target.value)}
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
            <option value="">All PICs</option>
            {picOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
        </div>
      )}

      {/* Return Status */}
      <div className="relative">
        <select
          value={filters.return_status}
          onChange={(e) => setFilter("return_status", e.target.value)}
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
          <option value="">All Returns</option>
          <option value="returnable">Returnable</option>
          <option value="pending">Pending</option>
          <option value="returned">Returned</option>
          <option value="non-returnable">Non-Returnable</option>
          <option value="none">Not Set</option>
        </select>
        <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
      </div>

      {/* Clear all */}
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
