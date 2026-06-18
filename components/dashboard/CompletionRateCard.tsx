"use client";

import type { CompletionRate } from "@/hooks/useDashboardHealth";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface Props {
  rates: CompletionRate[];
  isManager: boolean;
  isLoading: boolean;
}

function rateColor(rate: number): string {
  if (rate >= 80) return "#22c55e";
  if (rate >= 60) return "#eab308";
  return "#ef4444";
}

function RateIcon({ rate }: { rate: number }) {
  if (rate >= 80)
    return <CheckCircleIcon className="w-4 h-4" style={{ color: "#22c55e" }} />;
  if (rate >= 60)
    return (
      <ExclamationCircleIcon className="w-4 h-4" style={{ color: "#eab308" }} />
    );
  return <XCircleIcon className="w-4 h-4" style={{ color: "#ef4444" }} />;
}

function ProgressBar({ rate, height = 12 }: { rate: number; height?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ height, background: "#f1f5f9" }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${rate}%`, background: rateColor(rate) }}
      />
    </div>
  );
}

export default function CompletionRateCard({
  rates,
  isManager,
  isLoading,
}: Props) {
  const myRate = !isManager ? rates[0] : undefined;

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6" style={{ border: "1px solid #e2e8f0" }}>
      <p className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-4">
        {isManager ? "STAFF COMPLETION RATES" : "MY COMPLETION RATE"}
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(isManager ? 4 : 2)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 w-24 bg-[#f1f5f9] animate-pulse rounded" />
              <div className="h-3 bg-[#f1f5f9] animate-pulse rounded-full" />
            </div>
          ))}
        </div>
      ) : !isManager && myRate ? (
        <div className="space-y-3">
          <div className="flex items-end justify-center gap-0.5">
            <span
              className="font-black"
              style={{ fontSize: "60px", color: rateColor(myRate.completion_rate), lineHeight: 1 }}
            >
              {myRate.completion_rate}
            </span>
            <span className="text-2xl font-bold text-[#64748b] mb-1">%</span>
          </div>
          <ProgressBar rate={myRate.completion_rate} height={12} />
          <p className="text-sm text-[#64748b] text-center">
            {myRate.reviewed_on_time} of {myRate.total} items reviewed on time
          </p>
          {myRate.needs_review + myRate.critical_stale > 0 && (
            <p className="text-sm font-medium text-[#ef4444] text-center">
              {myRate.needs_review + myRate.critical_stale} items need attention
            </p>
          )}
        </div>
      ) : !isManager && !myRate ? (
        <p className="text-sm text-[#94a3b8] text-center py-4">
          No active items to track.
        </p>
      ) : rates.length === 0 ? (
        <p className="text-sm text-[#94a3b8] text-center py-4">
          No active items to track.
        </p>
      ) : (
        <div className="space-y-4">
          {rates.map((r) => (
            <div key={r.pic_name} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: "#2563eb" }}
                >
                  {r.pic_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-[#0f172a] flex-1">
                  {r.pic_name}
                </span>
                <span
                  className="text-sm font-black"
                  style={{ color: rateColor(r.completion_rate) }}
                >
                  {r.completion_rate}%
                </span>
                <RateIcon rate={r.completion_rate} />
              </div>
              <ProgressBar rate={r.completion_rate} height={8} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
