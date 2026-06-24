"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useShortList } from "@/hooks/useShortList";
import ShortListModule from "@/components/shortlist/ShortListModule";
import SalesRecord from "@/components/shortlist/SalesRecord";
import ItemReviewModal from "@/components/shortlist/ItemReviewModal";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import type { ExpiryFormData } from "@/hooks/useExpiry";

export default function ShortListPage() {
  const { user, isManager } = useAuth();
  const { toasts, showSuccess, dismiss } = useToast();
  const [activeTab, setActiveTab] = useState<"active" | "sales">("active");
  const [salesCount, setSalesCount] = useState<number | null>(null);
  const [deepLinkModalOpen, setDeepLinkModalOpen] = useState(false);
  const [deepLinkReviewId, setDeepLinkReviewId]   = useState<number | null>(null);
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

  useEffect(() => { document.title = "Expiry Monitor | Expiry Tracker"; }, []);

  // Deep-link: /dashboard/shortlist?review=<id> opens the modal directly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reviewId = params.get("review");
    if (reviewId) {
      const id = parseInt(reviewId, 10);
      if (!isNaN(id)) {
        setDeepLinkReviewId(id);
        setDeepLinkModalOpen(true);
        window.history.replaceState({}, "", "/dashboard/shortlist");
      }
    }
  }, []);

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

  return (
    <div className="space-y-5">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* Deep-link modal */}
      <ItemReviewModal
        isOpen={deepLinkModalOpen}
        onClose={() => setDeepLinkModalOpen(false)}
        entryId={deepLinkReviewId}
        onUpdated={refresh}
        onSwitchToSales={() => { setDeepLinkModalOpen(false); setActiveTab("sales"); }}
        onToast={showSuccess}
      />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1e293b]">Expiry Monitor</h2>
          <p className="text-sm text-[#64748b] mt-0.5">
            Track and manage short-expiry items
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
      <div className="flex border-b border-[#e2e8f0]">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === "active"
              ? "border-[#2563eb] text-[#2563eb]"
              : "border-transparent text-[#94a3b8] hover:text-[#475569]"
          }`}
        >
          Item Status
          <span className="ml-2 px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b] text-xs font-bold">
            {counts.total}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === "sales"
              ? "border-[#2563eb] text-[#2563eb]"
              : "border-transparent text-[#94a3b8] hover:text-[#475569]"
          }`}
        >
          Sales Record
          {salesCount !== null && (
            <span
              className="ml-2 px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b] text-xs font-bold"
              title={`${salesCount} sale${salesCount !== 1 ? "s" : ""} this month`}
            >
              {salesCount}
            </span>
          )}
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
          onRefresh={refresh}
          onSwitchToSales={() => setActiveTab("sales")}
        />
      ) : (
        <SalesRecord
          isManager={isManager}
          picName={user.picName}
          onCountChange={setSalesCount}
        />
      )}
    </div>
  );
}
