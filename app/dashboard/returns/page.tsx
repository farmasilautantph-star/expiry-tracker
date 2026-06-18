"use client";

import { useAuth } from "@/hooks/useAuth";
import { useReturns } from "@/hooks/useReturns";
import ReturnsModule from "@/components/returns/ReturnsModule";

export default function ReturnsPage() {
  const { user, isManager } = useAuth();
  const {
    entries,
    counts,
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    markReturned,
    updateReturnDate,
  } = useReturns();

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-[#1e293b]">Return List</h2>
        <p className="text-sm text-[#64748b] mt-0.5">
          {isManager
            ? "All returnable items across all PICs."
            : `Returnable items logged by you (${user.picName}).`}
        </p>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-[#eff6ff] px-4 py-3 text-sm text-[#1e3a8a]">
        <svg
          className="w-4 h-4 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          Items appear here automatically when logged as{" "}
          <strong>Returnable</strong> in Log New Expiry.
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#ef4444]">
          {error}
        </div>
      )}

      <ReturnsModule
        entries={entries}
        counts={counts}
        isLoading={isLoading}
        isManager={isManager}
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        onMarkReturned={markReturned}
        onUpdateReturnDate={updateReturnDate}
      />
    </div>
  );
}
