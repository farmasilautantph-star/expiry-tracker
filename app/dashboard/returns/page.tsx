"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useReturns } from "@/hooks/useReturns";
import ReturnsModule from "@/components/returns/ReturnsModule";

export default function ReturnsPage() {
  const { user, isManager } = useAuth();
  const [tab, setTab] = useState<"active" | "history">("active");
  const [historyMonth, setHistoryMonth] = useState("");

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

  const activeEntries = useMemo(
    () => entries.filter((e) => e.return_status === "pending"),
    [entries],
  );

  const historyEntries = useMemo(() => {
    const base = entries.filter(
      (e) => e.return_status === "returned" || e.return_status === "not_approved",
    );
    if (!historyMonth) return base;
    return base.filter((e) => {
      const date = (e.completed_at ?? e.logged_at).substring(0, 7);
      return date === historyMonth;
    });
  }, [entries, historyMonth]);

  function handleTabChange(newTab: "active" | "history") {
    setTab(newTab);
    setFilter("status", "");
  }

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
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Items appear here automatically when logged as <strong>Returnable</strong> in Log New Expiry.
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#ef4444]">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div
        className="inline-flex gap-1 p-1 rounded-xl"
        style={{ background: "#f1f5f9" }}
      >
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
            {t === "active" ? "Active Returns" : "Return History"}
          </button>
        ))}
      </div>

      <ReturnsModule
        entries={tab === "active" ? activeEntries : historyEntries}
        allEntries={entries}
        counts={counts}
        isLoading={isLoading}
        isManager={isManager}
        mode={tab}
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        historyMonth={historyMonth}
        onHistoryMonthChange={setHistoryMonth}
        onMarkReturned={markReturned}
        onMarkNotApproved={markNotApproved}
        onUpdateReturnDate={updateReturnDate}
        onRefresh={refresh}
      />
    </div>
  );
}
