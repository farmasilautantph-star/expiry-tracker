"use client";

import { useMemo } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { SalesFilters as SalesFiltersType, SaleStatus } from "@/hooks/useSalesRecord";
import { DEFAULT_SALES_FILTERS } from "@/hooks/useSalesRecord";

const STATUS_PILLS: { value: SaleStatus; label: string }[] = [
  { value: "all",        label: "All" },
  { value: "partial",    label: "Partial Sold" },
  { value: "fully_sold", label: "Fully Sold" },
];

const SORT_OPTIONS = [
  { value: "last_sold_at|desc", label: "Date (Newest)" },
  { value: "last_sold_at|asc",  label: "Date (Oldest)" },
  { value: "units_sold|desc",   label: "Units Sold (High→Low)" },
  { value: "units_sold|asc",    label: "Units Sold (Low→High)" },
  { value: "description|asc",   label: "Description (A-Z)" },
];

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-MY", { month: "long", year: "numeric" });
    opts.push({ value, label });
  }
  return opts;
}

interface Props {
  filters: SalesFiltersType;
  setFilter: <K extends keyof SalesFiltersType>(key: K, value: SalesFiltersType[K]) => void;
  clearFilters: () => void;
  isManager: boolean;
}

export default function SalesFilters({ filters, setFilter, clearFilters, isManager }: Props) {
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const sortValue = `${filters.sort_by}|${filters.sort_order}`;

  function applySort(val: string) {
    const [by, order] = val.split("|") as [string, "asc" | "desc"];
    setFilter("sort_by", by);
    setFilter("sort_order", order);
  }

  const hasAnyFilter =
    filters.status !== DEFAULT_SALES_FILTERS.status ||
    filters.search !== DEFAULT_SALES_FILTERS.search ||
    filters.pic !== DEFAULT_SALES_FILTERS.pic ||
    filters.showAll !== DEFAULT_SALES_FILTERS.showAll ||
    filters.month !== DEFAULT_SALES_FILTERS.month;

  return (
    <div className="space-y-3">
      {/* Pill tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_PILLS.map((pill) => {
          const active = filters.status === pill.value;
          return (
            <button
              key={pill.value}
              onClick={() => setFilter("status", pill.value)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
              style={{
                background: active ? "#2563eb" : "#f1f5f9",
                color: active ? "#ffffff" : "#64748b",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "#e2e8f0";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "#f1f5f9";
              }}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Secondary filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month picker */}
        <select
          value={filters.showAll ? "__all__" : (filters.month || currentMonth())}
          onChange={(e) => {
            if (e.target.value === "__all__") {
              setFilter("showAll", true);
            } else {
              setFilter("showAll", false);
              setFilter("month", e.target.value);
            }
          }}
          className="text-sm px-3 py-2 rounded-xl border border-[#e2e8f0] bg-white text-[#334155] focus:outline-none appearance-none"
        >
          <option value="__all__">All Time</option>
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="pl-8 pr-3 py-2 text-sm rounded-xl border border-[#e2e8f0] bg-white text-[#334155] focus:outline-none w-44"
          />
        </div>

        {/* PIC filter — manager only */}
        {isManager && (
          <input
            type="text"
            placeholder="Filter by PIC..."
            value={filters.pic}
            onChange={(e) => setFilter("pic", e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-[#e2e8f0] bg-white text-[#334155] focus:outline-none w-40"
          />
        )}

        {/* Clear */}
        {hasAnyFilter && (
          <button
            onClick={clearFilters}
            className="text-xs font-medium text-[#64748b] hover:text-[#334155] px-2.5 py-1.5 rounded-lg hover:bg-[#f1f5f9] transition-colors"
          >
            Clear
          </button>
        )}

        {/* Sort — right side */}
        <div className="ml-auto">
          <select
            value={sortValue}
            onChange={(e) => applySort(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl border border-[#e2e8f0] bg-white text-[#334155] focus:outline-none appearance-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
