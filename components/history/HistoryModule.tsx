"use client";

import { useHistory } from "@/hooks/useHistory";
import HistoryFilters from "./HistoryFilters";
import HistorySummary from "./HistorySummary";
import HistoryTable from "./HistoryTable";

export default function HistoryModule() {
  const {
    entries,
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    counts,
    picNames,
    page,
    totalPages,
    total,
    setPage,
  } = useHistory();

  return (
    <div className="flex flex-col gap-5">
      {/* Filters */}
      <HistoryFilters
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        picNames={picNames}
      />

      {/* Summary */}
      <HistorySummary counts={counts} isLoading={isLoading} />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <HistoryTable
        entries={entries}
        isLoading={isLoading}
        total={total}
        page={page}
        totalPages={totalPages}
        setPage={setPage}
      />
    </div>
  );
}
