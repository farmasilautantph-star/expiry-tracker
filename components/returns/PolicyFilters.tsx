"use client";

import type { ReturnPolicyTypeFilter } from "@/hooks/useReturnPolicies";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

interface Props {
  search: string;
  setSearch: (v: string) => void;
  typeFilter: ReturnPolicyTypeFilter;
  setTypeFilter: (v: ReturnPolicyTypeFilter) => void;
  onRefresh: () => void;
  onExport: () => void;
  isLoading: boolean;
  counts: { all: number; returnable: number; exchangeable: number; non_returnable: number };
}

const TABS: { key: ReturnPolicyTypeFilter; label: string; countKey: keyof Props["counts"] }[] = [
  { key: "",                label: "All",            countKey: "all" },
  { key: "RETURNABLE",      label: "Returnable",     countKey: "returnable" },
  { key: "EXCHANGEABLE",    label: "Exchangeable",   countKey: "exchangeable" },
  { key: "NON_RETURNABLE",  label: "Non-Returnable", countKey: "non_returnable" },
];

export default function PolicyFilters({
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  onRefresh,
  onExport,
  isLoading,
  counts,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Search row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search supplier, brand, contact, item description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm text-[#0f172a] bg-white placeholder-[#94a3b8] transition-colors focus:outline-none"
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
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
              title="Clear"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center justify-center w-10 h-10 rounded-[10px] bg-white text-[#64748b] hover:text-[#2563eb] hover:border-[#2563eb] transition-colors disabled:opacity-50"
          style={{ border: "1px solid #e2e8f0" }}
          title="Refresh"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>

        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-[10px] text-sm font-medium text-white transition-colors"
          style={{ background: "#2563eb" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#1d4ed8")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#2563eb")}
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Type filter tabs */}
      <div className="inline-flex gap-1 p-1 rounded-xl" style={{ background: "#f1f5f9" }}>
        {TABS.map((t) => {
          const active = typeFilter === t.key;
          return (
            <button
              key={t.label}
              onClick={() => setTypeFilter(t.key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-1.5"
              style={
                active
                  ? { background: "white", color: "#0f172a", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                  : { color: "#64748b" }
              }
            >
              {t.label}
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold"
                style={
                  active
                    ? { background: "#e2e8f0", color: "#475569" }
                    : { background: "#e2e8f0", color: "#64748b" }
                }
              >
                {counts[t.countKey]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
