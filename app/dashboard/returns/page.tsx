"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useReturns } from "@/hooks/useReturns";
import ReturnsModule from "@/components/returns/ReturnsModule";
import PolicyModule from "@/components/returns/PolicyModule";
import MobileReturnManagement from "@/components/mobile/MobileReturnManagement";
import QuickPolicyCheckModal from "@/components/QuickPolicyCheckModal";
import type { MonthValue } from "@/components/ui/MonthPicker";
import { InformationCircleIcon, QrCodeIcon } from "@heroicons/react/24/outline";

type TabKey = "active" | "history" | "policy";

function toYearMonth(val: MonthValue | null): string {
  if (!val) return "";
  return `${val.year}-${String(val.month).padStart(2, "0")}`;
}

function currentMonthValue(): MonthValue {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export default function ReturnsPage() {
  const { user, isManager } = useAuth();
  useEffect(() => { document.title = "Return Management | Expiry Tracker"; }, []);
  const [tab, setTab] = useState<TabKey>("active");
  const [activeMonth, setActiveMonth] = useState<MonthValue | null>(null);
  const [historyMonth, setHistoryMonth] = useState<MonthValue | null>(currentMonthValue());
  const [policyCheckOpen, setPolicyCheckOpen] = useState(false);

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
    markNotApproved,
    updateReturnDate,
    refresh,
  } = useReturns();

  const activeEntries = useMemo(() => {
    const base = entries.filter((e) => e.return_status === "pending");
    const ym = toYearMonth(activeMonth);
    if (!ym) return base;
    return base.filter((e) => {
      const date = (e.return_by_date ?? e.logged_at).substring(0, 7);
      return date === ym;
    });
  }, [entries, activeMonth]);

  const historyEntries = useMemo(() => {
    const base = entries.filter(
      (e) => e.return_status === "returned" || e.return_status === "not_approved",
    );
    const ym = toYearMonth(historyMonth);
    if (!ym) return base;
    return base.filter((e) => {
      const date = (e.completed_at ?? e.logged_at).substring(0, 7);
      return date === ym;
    });
  }, [entries, historyMonth]);

  // Redirect to "active" if on policy tab on mobile
  useEffect(() => {
    if (tab === "policy" && window.matchMedia("(max-width: 767px)").matches) {
      setTab("active");
    }
  }, [tab]);

  function handleTabChange(newTab: TabKey) {
    setTab(newTab);
    setFilter("status", "");
  }

  if (!user) return null;

  return (
    <>
      {/* ── Mobile V2 (below md) ── */}
      <MobileReturnManagement
        activeEntries={activeEntries}
        historyEntries={historyEntries}
        counts={counts}
        isLoading={isLoading}
        isManager={isManager}
        error={error}
        tab={tab === "policy" ? "active" : tab}
        onTabChange={(t) => handleTabChange(t)}
        filters={filters}
        setFilter={setFilter}
        onMarkReturned={markReturned}
        onMarkNotApproved={markNotApproved}
        onUpdateReturnDate={updateReturnDate}
        onRefresh={refresh}
      />

      {/* ── Desktop (md and up) ── */}
      <div
        className="hidden md:block rounded-2xl bg-white shadow-sm"
        style={{ border: "1px solid #e2e8f0" }}
      >
        {/* Desktop header */}
        <div className="px-6 pt-6">
          <h2 className="text-xl font-bold text-[#0f172a]">Return Management</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">Monitor and manage item returns</p>
        </div>

        {/* Info banner */}
        <div
          className="mx-6 mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm text-[#1e3a8a]"
          style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
        >
          <InformationCircleIcon className="w-4 h-4 flex-shrink-0 text-[#3b82f6]" />
          <span>
            Items appear here automatically when logged as{" "}
            <strong className="font-semibold">Returnable</strong>{" "}
            in Log New Expiry.
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mx-6 mt-3 rounded-xl px-4 py-3 text-sm text-[#ef4444]"
            style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
          >
            {error}
          </div>
        )}

        {/* Quick Check Return Policy — standalone action, visible on every tab */}
        <div className="mx-6 mt-4">
          <button
            type="button"
            onClick={() => setPolicyCheckOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: "#1d4ed8" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#1e40af")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#1d4ed8")}
          >
            <QrCodeIcon className="w-5 h-5" />
            Quick Check Return Policy
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 mt-4">
          <div className="overflow-x-auto">
            <div className="inline-flex gap-1 p-1 rounded-xl" style={{ background: "#f1f5f9" }}>
              {(["active", "history", "policy"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTabChange(t)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                  style={
                    tab === t
                      ? { background: "white", color: "#0f172a", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                      : { color: "#64748b" }
                  }
                >
                  {t === "active" ? "Active Returns" : t === "history" ? "Return History" : "Return Policy"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 mt-4">
          {tab === "policy" ? (
            <PolicyModule isManager={isManager} />
          ) : (
            <ReturnsModule
              entries={tab === "active" ? activeEntries : historyEntries}
              allEntries={entries}
              counts={counts}
              isLoading={isLoading}
              isManager={isManager}
              mode={tab === "active" ? "active" : "history"}
              filters={filters}
              setFilter={setFilter}
              clearFilters={clearFilters}
              activeFilterCount={activeFilterCount}
              activeMonth={activeMonth}
              onActiveMonthChange={setActiveMonth}
              historyMonth={historyMonth}
              onHistoryMonthChange={setHistoryMonth}
              onMarkReturned={markReturned}
              onMarkNotApproved={markNotApproved}
              onUpdateReturnDate={updateReturnDate}
              onRefresh={refresh}
            />
          )}
        </div>
      </div>

      <QuickPolicyCheckModal
        isOpen={policyCheckOpen}
        onClose={() => setPolicyCheckOpen(false)}
      />
    </>
  );
}
