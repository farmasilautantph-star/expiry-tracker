"use client";

import type { ShortListFilters, ShortListCounts } from "@/hooks/useShortList";
import { MagnifyingGlassIcon, ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";

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
  categoryOptions: string[];
  counts: ShortListCounts;
  mobileMoreOpen?: boolean;
  onToggleMobileMore?: () => void;
}

const SELECT_CLS =
  "relative appearance-none border border-[#e2e8f0] bg-white text-[#334155] text-sm transition-colors focus:outline-none pr-8 pl-4 py-2";

const STATUS_CHIPS: Array<{ value: string; label: string; key: keyof Omit<ShortListCounts, "total"> | "total" }> = [
  { value: "",         label: "All",      key: "total"    },
  { value: "expired",  label: "Expired",  key: "expired"  },
  { value: "critical", label: "Critical", key: "critical" },
  { value: "warning",  label: "Warning",  key: "warning"  },
  { value: "safe",     label: "Safe",     key: "safe"     },
];

export default function ShortListFilters({
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  isManager,
  picOptions,
  categoryOptions,
  counts,
  mobileMoreOpen = false,
  onToggleMobileMore,
}: Props) {
  return (
    <>
      {/* ─── Mobile (below md) ─────────────────────────────────────── */}
      <div className="md:hidden flex flex-col gap-3">
        {/* Pill search + filter toggle */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2.5 px-3.5 rounded-2xl h-[46px]"
            style={{ background: "#f4f7fb", border: "1.5px solid #eef1f6" }}
          >
            <MagnifyingGlassIcon className="w-4 h-4 text-[#94a3b8] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search items, category, PIC…"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              className="flex-1 bg-transparent text-sm text-[#0f172a] placeholder-[#94a3b8] outline-none min-w-0"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilter("search", "")}
                className="text-[#94a3b8] flex-shrink-0"
                aria-label="Clear search"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          {onToggleMobileMore && (
            <button
              type="button"
              onClick={onToggleMobileMore}
              aria-label="More filters"
              aria-pressed={mobileMoreOpen}
              className="w-[46px] h-[46px] flex-shrink-0 rounded-xl flex items-center justify-center transition-colors"
              style={{
                background: mobileMoreOpen ? "#1e3a5f" : "#f1f5f9",
                color: mobileMoreOpen ? "#fff" : "#475569",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M7 12h10M11 18h2" />
              </svg>
            </button>
          )}
        </div>

        {/* Status chips — horizontal scroll */}
        <div
          className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {STATUS_CHIPS.map((chip) => {
            const active = filters.status === chip.value;
            const count = counts[chip.key];
            return (
              <button
                key={chip.value || "all"}
                type="button"
                onClick={() => setFilter("status", chip.value)}
                className="flex-shrink-0 px-3.5 h-9 rounded-full text-xs font-semibold whitespace-nowrap transition-colors"
                style={
                  active
                    ? { background: "#1e3a5f", color: "#fff", border: "1.5px solid #1e3a5f" }
                    : { background: "#fff", color: "#475569", border: "1.5px solid #e2e8f0" }
                }
              >
                {chip.label} · {count}
              </button>
            );
          })}
        </div>

        {/* More filters — toggled from page header filter icon */}
        {mobileMoreOpen && (
          <div className="flex flex-col gap-2 pt-1">
            <select
              value={filters.category}
              onChange={(e) => setFilter("category", e.target.value)}
              className={`${SELECT_CLS} w-full`}
              style={{ borderRadius: "12px" }}
            >
              <option value="">All Categories</option>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filters.return_status}
              onChange={(e) => setFilter("return_status", e.target.value)}
              className={`${SELECT_CLS} w-full`}
              style={{ borderRadius: "12px" }}
            >
              <option value="">All Returns</option>
              <option value="returnable">Returnable</option>
              <option value="pending">Pending</option>
              <option value="returned">Returned</option>
              <option value="non-returnable">Non-Returnable</option>
              <option value="none">Not Set</option>
            </select>
            {isManager && (
              <select
                value={filters.pic}
                onChange={(e) => setFilter("pic", e.target.value)}
                className={`${SELECT_CLS} w-full`}
                style={{ borderRadius: "12px" }}
              >
                <option value="">All PICs</option>
                {picOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="self-start flex items-center gap-1.5 text-xs font-medium"
                style={{ color: "#64748b" }}
              >
                Clear filters
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-semibold"
                  style={{ background: "#2563eb" }}
                >
                  {activeFilterCount}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Desktop (md and up) ────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[240px]">
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
          {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
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
    </>
  );
}
