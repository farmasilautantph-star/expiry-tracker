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
    summary,
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    addOffer,
    editOffer,
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
        <h2 className="text-xl font-semibold text-white">Offer Ke Outlet</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Manage items offered to the outlet with UOM, quantity, and alerts.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <OffersModule
        entries={entries}
        summary={summary}
        isLoading={isLoading}
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        onAdd={addOffer}
        onEdit={editOffer}
        onDelete={deleteOffer}
        onToggleAlert={toggleAlert}
      />
    </div>
  );
}
