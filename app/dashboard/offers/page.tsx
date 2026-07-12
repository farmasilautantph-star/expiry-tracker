"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOffers } from "@/hooks/useOffers";
import ActiveOffersTab from "@/components/offers/ActiveOffersTab";
import OfferHistoryTab from "@/components/offers/OfferHistoryTab";
import OfferAnalytics from "@/components/offers/OfferAnalytics";
import MobileOffers from "@/components/mobile/MobileOffers";
import MonthPicker, { type MonthValue } from "@/components/ui/MonthPicker";
import { InformationCircleIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function OffersPage() {
  const { user, isManager } = useAuth();
  const [tab, setTab] = useState<"active" | "history">("active");
  const [month, setMonth] = useState<MonthValue | null>(null);
  const [search, setSearch] = useState("");

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

  function handleTabChange(t: "active" | "history") {
    setTab(t);
    setMonth(null);
    setSearch("");
  }

  if (!user) return null;

  return (
    <>
      {/* ── Mobile V2 (below md) ── */}
      <MobileOffers
        entries={entries}
        isLoading={isLoading}
        isManager={isManager}
        error={error}
        onUpdateOfferStatus={updateOfferStatus}
        onRefresh={refresh}
      />

      {/* ── Desktop (md and up) ── */}
      <div
        className="hidden md:block rounded-2xl bg-white shadow-sm"
        style={{ border: "1px solid #e2e8f0" }}
      >
        {/* Desktop header */}
        <div className="px-6 pt-6">
          <h2 className="text-xl font-bold text-[#0f172a]">Outlet Offers</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">Track items offered to outlets</p>
        </div>

        {/* Info banner */}
        <div
          className="mx-6 mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm text-[#1e3a8a]"
          style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
        >
          <InformationCircleIcon className="w-4 h-4 flex-shrink-0 text-[#3b82f6]" />
          <span>
            Offers are created from <strong className="font-semibold">Item Short List</strong>{" "}
            — click &quot;Offer to Outlet&quot; on any row there.
          </span>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mx-6 mt-3 rounded-xl px-4 py-3 text-sm text-[#ef4444]"
            style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
          >
            {error}
          </div>
        )}

        {/* Tabs + inline filters */}
        <div className="flex px-6 mt-4 items-center gap-3 flex-wrap">
          <div className="inline-flex gap-1 p-1 rounded-xl flex-shrink-0" style={{ background: "#f1f5f9" }}>
            {(["active", "history"] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={
                  tab === t
                    ? { background: "white", color: "#0f172a", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                    : { color: "#64748b" }
                }
              >
                {t === "active" ? "Active Offers" : "Offer History"}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <MonthPicker value={month} onChange={setMonth} placeholder="All Months" />

          <div className="relative min-w-[220px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search item, outlet, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm text-[#0f172a] bg-white placeholder-[#94a3b8] focus:outline-none"
              style={{ border: "1px solid #e2e8f0", borderRadius: "10px" }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#2563eb";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "";
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-6 pb-6 mt-4">
          {isManager && tab === "active" && !isLoading && entries.length > 0 && (
            <OfferAnalytics entries={entries} />
          )}

          {tab === "active" ? (
            <ActiveOffersTab
              entries={activeEntries}
              isLoading={isLoading}
              activeMonth={month}
              search={search}
              onUpdateOfferStatus={updateOfferStatus}
              onRefresh={refresh}
            />
          ) : (
            <OfferHistoryTab
              entries={historyEntries}
              isLoading={isLoading}
              historyMonth={month}
              search={search}
            />
          )}
        </div>
      </div>
    </>
  );
}
