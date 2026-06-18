"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useShortList } from "@/hooks/useShortList";
import ShortListModule from "@/components/shortlist/ShortListModule";
import CompletedItemsTable from "@/components/shortlist/CompletedItemsTable";
import type { ExpiryFormData } from "@/hooks/useExpiry";
import type { OfferFormData } from "@/hooks/useOffers";

export default function ShortListPage() {
  const { user, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
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
          <h2 className="text-xl font-semibold text-[#1e293b]">
            Item Short List
          </h2>
          <p className="text-sm text-[#64748b] mt-0.5">
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] text-[#94a3b8] text-sm font-medium cursor-not-allowed"
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

      {/* Tab nav */}
      <div className="flex border-b border-[#e2e8f0] gap-6">
        <button
          onClick={() => setActiveTab("active")}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === "active"
              ? "border-[#2563eb] text-[#2563eb]"
              : "border-transparent text-[#64748b] hover:text-[#334155]"
          }`}
        >
          Active Items{" "}
          {counts.total > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b] text-xs font-bold">
              {counts.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === "completed"
              ? "border-[#2563eb] text-[#2563eb]"
              : "border-transparent text-[#64748b] hover:text-[#334155]"
          }`}
        >
          Completed Items
        </button>
      </div>

      {/* Error banner */}
      {error && activeTab === "active" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Main content */}
      {activeTab === "active" ? (
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
          onRefresh={refresh}
        />
      ) : (
        <CompletedItemsTable isManager={isManager} picName={user.picName} />
      )}
    </div>
  );
}
