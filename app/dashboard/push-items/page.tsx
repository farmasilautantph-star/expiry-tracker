"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useShortList } from "@/hooks/useShortList";
import ShortListModule from "@/components/shortlist/ShortListModule";
import PushItemDetail from "@/components/PushItemDetail";
import MobilePushItemDetail from "@/components/mobile/MobilePushItemDetail";
import MobileShortList from "@/components/mobile/MobileShortList";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import type { ExpiryFormData } from "@/hooks/useExpiry";

export default function PushItemsPage() {
  const { user, isManager } = useAuth();
  const router = useRouter();
  const { toasts, showSuccess, dismiss } = useToast();
  const [detailOpen, setDetailOpen]             = useState(false);
  const [detailId, setDetailId]                 = useState<number | null>(null);
  const [mobileMoreOpen, setMobileMoreOpen]     = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const {
    pushEntries,
    counts,
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    refresh,
    patchEntry,
    removeEntry,
  } = useShortList();

  useEffect(() => { document.title = "Push Item | Expiry Tracker"; }, []);

  // Track real viewport width so deep-linked review popups render with the
  // correct desktop/mobile modal.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobileViewport(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Deep-link: ?review=<id> opens the push detail popup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reviewId = params.get("review");
    if (reviewId) {
      const id = parseInt(reviewId, 10);
      if (!isNaN(id)) {
        setDetailId(id);
        setDetailOpen(true);
      }
      window.history.replaceState({}, "", "/dashboard/push-items");
    }
  }, []);

  function openDetail(id: number) {
    setDetailId(id);
    setDetailOpen(true);
  }

  if (!user) return null;

  const goToSales = () => router.push("/dashboard/shortlist?tab=sales");

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
    const reason = window.prompt("Reason for deleting this entry (required):");
    if (!reason?.trim()) return;
    const res = await fetch(`/api/expiry/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to delete entry");
    await refresh();
  }

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* Sales-card detail popup — mobile bottom sheet / desktop modal */}
      <MobilePushItemDetail
        isOpen={detailOpen && isMobileViewport}
        onClose={() => setDetailOpen(false)}
        entryId={detailId}
        isManager={isManager}
        onPatchEntry={patchEntry}
        onRemoveEntry={removeEntry}
        onToast={showSuccess}
      />
      <PushItemDetail
        isOpen={detailOpen && !isMobileViewport}
        onClose={() => setDetailOpen(false)}
        entryId={detailId}
        isManager={isManager}
        onPatchEntry={patchEntry}
        onRemoveEntry={removeEntry}
        onToast={showSuccess}
      />

      {/* ── Mobile V2 (below md) ── */}
      <MobileShortList
        entries={pushEntries}
        counts={counts}
        isLoading={isLoading}
        isManager={isManager}
        picName={user.picName}
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        onRefresh={refresh}
        onPatchEntry={patchEntry}
        onRemoveEntry={removeEntry}
        onSwitchToSales={goToSales}
        activeTab="push"
        headerTitle="Push Item"
        hideTabs
        onToast={showSuccess}
        onOpenItem={openDetail}
      />

      {/* ── Desktop (md and up) ── */}
      <div className="hidden md:block space-y-5">

        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-[#1e293b]">Push Item</h2>
          <p className="text-sm text-[#64748b] mt-0.5">
            Manager-flagged items requiring sales prioritization
          </p>
        </div>

        {/* Purple banner */}
        <div className="rounded-xl border border-[#ede9fe] bg-[#faf5ff] px-4 py-3 text-sm">
          <div className="font-semibold text-[#7c3aed] mb-0.5">
            Push Items ({pushEntries.length})
          </div>
          <div className="text-xs text-[#7c3aed]/80">
            Manager-flagged items requiring sales prioritization. Sorted by days remaining.
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Content */}
        {pushEntries.length === 0 ? (
          <div className="rounded-xl border border-[#e2e8f0] bg-white px-6 py-12 text-center text-sm text-[#64748b]">
            No items have been marked as Push Item.
          </div>
        ) : (
          <ShortListModule
            entries={pushEntries}
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
            onPatchEntry={patchEntry}
            onRemoveEntry={removeEntry}
            onSwitchToSales={goToSales}
            mobileMoreOpen={mobileMoreOpen}
            onToggleMobileMore={() => setMobileMoreOpen((o) => !o)}
            onRowClick={openDetail}
          />
        )}
      </div>
    </>
  );
}
