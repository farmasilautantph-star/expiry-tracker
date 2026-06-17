"use client";

import { useAuth } from "@/hooks/useAuth";
import { useShortList } from "@/hooks/useShortList";
import ShortListModule from "@/components/shortlist/ShortListModule";
import type { ExpiryFormData } from "@/hooks/useExpiry";
import type { OfferFormData } from "@/hooks/useOffers";

export default function ShortListPage() {
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
    refresh,
  } = useShortList();

  if (!user) return null;

  async function handleEdit(id: number, data: ExpiryFormData): Promise<void> {
    const res = await fetch(`/api/expiry/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to update entry");
    await refresh();
  }

  async function handleDelete(id: number): Promise<void> {
    const res = await fetch(`/api/expiry/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to delete entry");
    await refresh();
  }

  async function handleAddOffer(data: OfferFormData): Promise<void> {
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to create offer");
    await refresh();
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Item Short List</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {isManager
              ? "All logged expiry items across all PICs."
              : `Your logged expiry items (${user.picName}).`}
          </p>
        </div>

        {/* Export — manager only, placeholder for Phase 10 */}
        {isManager && (
          <button
            disabled
            title="Export — coming in Phase 10"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-500 text-sm font-medium cursor-not-allowed"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Main module */}
      <ShortListModule
        entries={entries}
        counts={counts}
        isLoading={isLoading}
        isManager={isManager}
        picName={user.picName}
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddOffer={handleAddOffer}
      />
    </div>
  );
}
