"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useStaffReport } from "@/hooks/useStaffReport";
import StaffReportTable from "@/components/staff-report/StaffReportTable";
import MonthPicker from "@/components/ui/MonthPicker";
import type { MonthValue } from "@/components/ui/MonthPicker";

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white px-5 pt-4 pb-5 shadow-sm" style={{ border: "1px solid #e2e8f0" }}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{label}</p>
      <p className="text-3xl font-black text-slate-800 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-2">{sub}</p>}
    </div>
  );
}

export default function StaffReportPage() {
  const { isManager, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { data, isLoading, monthFilter, allTime, setFilter } = useStaffReport();

  useEffect(() => {
    document.title = "Staff Report | Expiry Tracker";
  }, []);

  useEffect(() => {
    if (!authLoading && !isManager) router.push("/dashboard");
  }, [authLoading, isManager, router]);

  if (authLoading || !isManager) return null;

  const rows = data?.staffReport ?? [];

  const totalLogged   = rows.reduce((s, r) => s + r.items_logged,   0);
  const totalReviewed = rows.reduce((s, r) => s + r.items_reviewed, 0);
  const reviewPct     = totalLogged > 0 ? Math.round((totalReviewed / totalLogged) * 100) : 0;
  const totalUnitsSold = rows.reduce((s, r) => s + r.units_sold,   0);
  const totalReturned  = rows.reduce((s, r) => s + r.items_returned, 0);

  function handleFilterChange(month: MonthValue | null) {
    if (month === null && !allTime) {
      setFilter(null, true);
    } else {
      setFilter(month, false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold text-[#0f172a]">Staff Report</h2>
        <p className="text-sm text-slate-400 mt-0.5">Performance overview by staff</p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <MonthPicker
          value={allTime ? null : monthFilter}
          onChange={handleFilterChange}
          placeholder="All Time"
        />
        <button
          onClick={() => setFilter(null, true)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            allTime
              ? "bg-[#2563eb] text-white border-[#2563eb]"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}
        >
          All Time
        </button>
        {(monthFilter || allTime) && (
          <button
            onClick={() => setFilter(null, false)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Reset
          </button>
        )}
        {data?.period && (
          <span className="text-xs text-slate-400 ml-auto">
            Showing: <span className="font-semibold text-slate-600">{data.period}</span>
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Items Logged"
          value={isLoading ? "—" : totalLogged}
          sub={`Across ${rows.length} staff`}
        />
        <SummaryCard
          label="Total Reviewed"
          value={isLoading ? "—" : `${reviewPct}%`}
          sub={`${totalReviewed} of ${totalLogged} items`}
        />
        <SummaryCard
          label="Total Units Sold"
          value={isLoading ? "—" : totalUnitsSold}
          sub={`${rows.reduce((s, r) => s + r.items_sold, 0)} items`}
        />
        <SummaryCard
          label="Total Returned"
          value={isLoading ? "—" : totalReturned}
          sub="Items returned to warehouse"
        />
      </div>

      {/* Table */}
      <StaffReportTable
        rows={rows}
        isLoading={isLoading}
        period={data?.period ?? ""}
      />
    </div>
  );
}
