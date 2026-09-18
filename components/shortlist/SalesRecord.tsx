"use client";

import { useState } from "react";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { useSalesRecord } from "@/hooks/useSalesRecord";
import SalesFilters from "./SalesFilters";
import SalesSummaryBar from "./SalesSummaryBar";
import SalesStatCards from "./SalesStatCards";
import SalesAnalytics from "./SalesAnalytics";
import SalesTable from "./SalesTable";
import MonthlySalesUploadModal from "./MonthlySalesUploadModal";

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
    refresh,
  } = useSalesRecord(onCountChange);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="space-y-3 md:space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <SalesFilters
            filters={filters}
            setFilter={setFilter}
            clearFilters={clearFilters}
            isManager={isManager}
          />
        </div>
        {isManager && (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 md:px-2.5 md:py-1.5 rounded-xl text-sm font-medium text-white transition-colors flex-shrink-0"
            style={{ background: "#2563eb" }}
          >
            <CloudArrowUpIcon className="w-4 h-4" />
            Upload Monthly Sales
          </button>
        )}
      </div>

      {isManager && (
        <MonthlySalesUploadModal
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSuccess={refresh}
        />
      )}

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
        sortBy={filters.sort_by}
        sortOrder={filters.sort_order}
      />
    </div>
  );
}
