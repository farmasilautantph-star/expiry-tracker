"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useOffers } from "@/hooks/useOffers";
import OffersModule from "@/components/offers/OffersModule";

export default function OffersPage() {
  const { user, isManager } = useAuth();
  const router = useRouter();

  const {
    entries,
    counts,
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    updateOffer,
    deleteOffer,
    toggleAlert,
  } = useOffers();

  useEffect(() => {
    if (user && !isManager) router.replace("/dashboard");
  }, [user, isManager, router]);

  if (!user || !isManager) return null;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-[#1e293b]">
          Offer Ke Outlet
        </h2>
        <p className="text-sm text-[#64748b] mt-0.5">
          Monitor all items offered to outlets across all statuses.
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
          Offers are created from <strong>Item Short List</strong> — click
          &quot;Offer to Outlet&quot; on any row there.
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#ef4444]">
          {error}
        </div>
      )}

      <OffersModule
        entries={entries}
        counts={counts}
        isLoading={isLoading}
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        onUpdate={updateOffer}
        onDelete={deleteOffer}
        onToggleAlert={toggleAlert}
      />
    </div>
  );
}
