"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOffers } from "@/hooks/useOffers";
import ActiveOffersTab from "@/components/offers/ActiveOffersTab";
import OfferHistoryTab from "@/components/offers/OfferHistoryTab";

export default function OffersPage() {
  const { user, isManager } = useAuth();
  const [tab, setTab] = useState<"active" | "history">("active");

  useEffect(() => { document.title = "Outlet Offers | Expiry Tracker"; }, []);

  const {
    entries,
    isLoading,
    error,
    updateOfferStatus,
    refresh,
  } = useOffers();

  const activeEntries = useMemo(
    () => entries.filter((e) => e.offer_status === "offered"),
    [entries],
  );

  const historyEntries = useMemo(
    () => entries.filter((e) => e.offer_status === "accepted" || e.offer_status === "rejected"),
    [entries],
  );

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-[#1e293b]">Outlet Offers</h2>
        <p className="text-sm text-[#64748b] mt-0.5">
          Track items offered to outlets
        </p>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-[#eff6ff] px-4 py-3 text-sm text-[#1e3a8a]">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Offers are created from <strong>Item Short List</strong> — click &quot;Offer to Outlet&quot; on any row there.
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#ef4444]">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="inline-flex gap-1 p-1 rounded-xl" style={{ background: "#f1f5f9" }}>
        {(["active", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={
              tab === t
                ? { background: "white", color: "#0f172a", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { color: "#64748b" }
            }
          >
            {t === "active" ? `Active Offers${activeEntries.length > 0 ? ` ${activeEntries.length}` : ""}` : "Offer History"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "active" ? (
        <ActiveOffersTab
          entries={activeEntries}
          isLoading={isLoading}
          onUpdateOfferStatus={updateOfferStatus}
          onRefresh={refresh}
        />
      ) : (
        <OfferHistoryTab
          entries={historyEntries}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
