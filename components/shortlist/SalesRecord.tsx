"use client";

import { useSalesRecord } from "@/hooks/useSalesRecord";
import SalesFilters from "./SalesFilters";
import SalesSummaryBar from "./SalesSummaryBar";
import SalesStatCards from "./SalesStatCards";
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

      {/* Desktop — compact 4-card stat row (both roles, matches SalesSummaryBar's
          original visibility), then the manager-only Analytics charts below it */}
      <div className="hidden md:block">
        <SalesStatCards summary={summary} isLoading={isLoading} />
      </div>
      {isManager && !isLoading && (
        <div className="hidden md:block">
          <SalesAnalytics entries={entries} filters={filters} />
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
