"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useReturns } from "@/hooks/useReturns";
import ReturnsModule from "@/components/returns/ReturnsModule";
import PolicyModule from "@/components/returns/PolicyModule";
import type { MonthValue } from "@/components/ui/MonthPicker";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

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

  function handleTabChange(newTab: TabKey) {
    setTab(newTab);
    setFilter("status", "");
  }

  if (!user) return null;

  return (
    <div className="rounded-2xl bg-white shadow-sm" style={{ border: "1px solid #e2e8f0" }}>
      {/* Desktop header (md and up) */}
      <div className="hidden md:block px-6 pt-6">
        <h2 className="text-xl font-bold text-[#0f172a]">Return Management</h2>
        <p className="text-sm text-[#94a3b8] mt-0.5">Monitor and manage item returns</p>
      </div>

      {/* Info banner — desktop only */}
      <div className="hidden md:flex mx-6 mt-4 items-center gap-2.5 rounded-xl px-4 py-3 text-sm text-[#1e3a8a]"
        style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
        <InformationCircleIcon className="w-4 h-4 flex-shrink-0 text-[#3b82f6]" />
        <span>
          Items appear here automatically when logged as{" "}
          <strong className="font-semibold">Returnable</strong>{" "}
          in Log New Expiry.
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 md:mx-6 mt-3 rounded-xl px-4 py-3 text-sm text-[#ef4444]"
          style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          {error}
        </div>
      )}

      {/* Tabs — mobile: full-width equal spacing; desktop: inline-flex with long labels */}
      <div className="px-4 md:px-6 mt-3 md:mt-4">
        {/* Mobile */}
        <div className="md:hidden flex gap-1 p-1 rounded-xl w-full" style={{ background: "#f1f5f9" }}>
          {(["active", "history", "policy"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className="flex-1 py-2 rounded-lg text-[13px] font-semibold text-center transition-all"
              style={
                tab === t
                  ? { background: "white", color: "#0f172a", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                  : { color: "#64748b" }
              }
            >
              {t === "active" ? "Active" : t === "history" ? "History" : "Policy"}
            </button>
          ))}
        </div>
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
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
      <div className="px-4 md:px-6 pb-6 mt-4">
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
  );
}
