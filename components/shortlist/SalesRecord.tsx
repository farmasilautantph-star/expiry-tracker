"use client";

import { useSalesRecord } from "@/hooks/useSalesRecord";
import SalesFilters from "./SalesFilters";
import SalesSummaryBar from "./SalesSummaryBar";
import SalesSummaryInline from "./SalesSummaryInline";
import SalesAnalytics from "./SalesAnalytics";
import SalesTable from "./SalesTable";

interface Props {
  isManager: boolean;
  picName: string;
  onCountChange?: (count: number) => void;
}

export default function SalesRecord({ isManager, onCountChange }: Props) {
  const {
    entries,
    summary,
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    toggleShowAll,
  } = useSalesRecord(onCountChange);

  return (
    <div className="space-y-3 md:space-y-2">
      <SalesFilters
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        isManager={isManager}
      />

      {/* Mobile — original bulky stat card, unchanged */}
      <div className="md:hidden">
        <SalesSummaryBar summary={summary} isLoading={isLoading} />
      </div>

      {/* Desktop — compact stats, merged into the Analytics header when a
          manager sees it, or standalone for staff (no Analytics section) */}
      {isManager ? (
        !isLoading && (
          <div className="hidden md:block">
            <SalesAnalytics entries={entries} filters={filters} summary={summary} isLoading={isLoading} />
          </div>
        )
      ) : (
        <div className="hidden md:block">
          <SalesSummaryInline summary={summary} isLoading={isLoading} />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <SalesTable
        entries={entries}
        isLoading={isLoading}
        isManager={isManager}
        onViewAllTime={toggleShowAll}
      />
    </div>
  );
}
