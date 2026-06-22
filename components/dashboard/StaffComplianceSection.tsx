"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { CompletionRate } from "@/hooks/useDashboardHealth";

interface Props {
  completionRates: CompletionRate[];
  weekRange: { lastSunday: string; nextSunday: string };
  isLoading: boolean;
  inline?: boolean;
}

function rateVariant(rate: number): "green" | "amber" | "red" {
  if (rate >= 80) return "green";
  if (rate >= 50) return "amber";
  return "red";
}

const VARIANT = {
  green: { text: "#16a34a", bar: "#22c55e", avatar: "#16a34a", badge: "bg-green-100 text-green-700" },
  amber: { text: "#d97706", bar: "#f59e0b", avatar: "#d97706", badge: "bg-amber-100 text-amber-700" },
  red:   { text: "#dc2626", bar: "#ef4444", avatar: "#dc2626", badge: "bg-red-100 text-red-700"     },
};

function CompactRow({ staff }: { staff: CompletionRate }) {
  const v = rateVariant(staff.completion_rate);
  const cls = VARIANT[v];

  return (
    <div
      className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: "1px solid #f1f5f9" }}
    >
      {/* Avatar */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
        style={{ background: cls.avatar }}
      >
        {staff.pic_name[0]?.toUpperCase() ?? "?"}
      </div>

      {/* Name */}
      <p className="text-sm font-semibold text-slate-700 w-28 truncate flex-shrink-0">
        {staff.pic_name}
      </p>

      {/* Progress bar + detail */}
      <div className="flex-1 min-w-0">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, staff.completion_rate)}%`, background: cls.bar }}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {staff.reviewed_on_time}/{staff.total} reviewed
          {staff.needs_review > 0 && ` · ${staff.needs_review} pending`}
        </p>
      </div>

      {/* Rate */}
      <span className="text-sm font-bold flex-shrink-0 w-10 text-right" style={{ color: cls.text }}>
        {Math.round(staff.completion_rate)}%
      </span>

      {/* Critical stale flag */}
      {staff.critical_stale > 0 && (
        <span title={`${staff.critical_stale} item${staff.critical_stale > 1 ? "s" : ""} missed 2+ Sunday deadlines`}>
          <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        </span>
      )}
    </div>
  );
}

export default function StaffComplianceSection({
  completionRates,
  weekRange,
  isLoading,
  inline = false,
}: Props) {
  if (isLoading) {
    const skeleton = (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 bg-slate-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
    if (inline) return <>{skeleton}</>;
    return (
      <div className="rounded-2xl bg-white shadow-sm p-5" style={{ border: "1px solid #e2e8f0" }}>
        {skeleton}
      </div>
    );
  }

  if (completionRates.length === 0) {
    const empty = <p className="text-sm text-slate-400">No active items to track this week.</p>;
    if (inline) return <>{empty}</>;
    return (
      <div className="rounded-2xl bg-white shadow-sm p-5 text-center" style={{ border: "1px solid #e2e8f0" }}>
        {empty}
      </div>
    );
  }

  const overallRate =
    completionRates.reduce((sum, r) => sum + r.completion_rate, 0) /
    completionRates.length;
  const staffOnTrack = completionRates.filter((r) => r.completion_rate >= 80).length;
  const totalStaff = completionRates.length;
  const ov = rateVariant(overallRate);
  const ovCls = VARIANT[ov];

  const inner = (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-sm font-bold text-slate-800">Staff Review Compliance</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Week: {weekRange.lastSunday} → {weekRange.nextSunday}
          </p>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${ovCls.badge}`}>
          {staffOnTrack}/{totalStaff} on track
        </div>
      </div>

      {/* Staff rows */}
      <div className="mt-3">
        {completionRates.map((staff) => (
          <CompactRow key={staff.pic_name} staff={staff} />
        ))}
      </div>

      {/* Overall bar */}
      <div className="mt-3 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-slate-500">Overall Team</p>
          <p className="text-xs font-bold" style={{ color: ovCls.text }}>
            {Math.round(overallRate)}%
          </p>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, overallRate)}%`, background: ovCls.bar }}
          />
        </div>
      </div>
    </>
  );

  if (inline) return <>{inner}</>;

  return (
    <div className="rounded-2xl bg-white shadow-sm p-5" style={{ border: "1px solid #e2e8f0" }}>
      {inner}
    </div>
  );
}
