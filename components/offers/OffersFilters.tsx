"use client";

import { useMemo } from "react";
import type { OfferFilters } from "@/hooks/useOffers";

const CATEGORIES = [
  "MOM & BABY",
  "FS",
  "OTC",
  "Poison B",
  "Poison C",
  "PET CARE",
  "HS",
] as const;

function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = -3; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
    opts.push({ value, label });
  }
  return opts;
}

interface Props {
  filters: OfferFilters;
  setFilter: <K extends keyof OfferFilters>(
    key: K,
    value: OfferFilters[K],
  ) => void;
  clearFilters: () => void;
  activeFilterCount: number;
}

const SELECT =
  "px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

export default function OffersFilters({
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
}: Props) {
  const months = useMemo(() => monthOptions(), []);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search desc, barcode, outlet…"
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          className="w-full pl-9 pr-8 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        {filters.search && (
          <button
            onClick={() => setFilter("search", "")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Category */}
      <select
        value={filters.category}
        onChange={(e) => setFilter("category", e.target.value)}
        className={SELECT}
      >
        <option value="">All Categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => setFilter("status", e.target.value)}
        className={SELECT}
      >
        <option value="">All Statuses</option>
        <option value="offered">🔵 Offered</option>
        <option value="accepted">🟢 Accepted</option>
        <option value="rejected">🔴 Rejected</option>
        <option value="completed">✅ Completed</option>
      </select>

      {/* Alert */}
      <select
        value={filters.has_alert}
        onChange={(e) => setFilter("has_alert", e.target.value)}
        className={SELECT}
      >
        <option value="">All Alerts</option>
        <option value="true">🔔 With Alert</option>
        <option value="false">No Alert</option>
      </select>

      {/* Month */}
      <select
        value={filters.month}
        onChange={(e) => setFilter("month", e.target.value)}
        className={SELECT}
      >
        <option value="">All Months</option>
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      {/* Clear */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700 transition-colors"
        >
          Clear
          <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-semibold">
            {activeFilterCount}
          </span>
        </button>
      )}
    </div>
  );
}
