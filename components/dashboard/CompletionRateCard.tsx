"use client";

import type { CompletionRate } from "@/hooks/useDashboardHealth";

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

function rateIcon(rate: number): string {
  if (rate >= 80) return "✅";
  if (rate >= 60) return "⚠️";
  return "❌";
}

function ProgressBar({ rate }: { rate: number }) {
  return (
    <div className="h-3 rounded-full bg-[#f1f5f9] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${rate}%`, backgroundColor: rateColor(rate) }}
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
    <div className="rounded-2xl bg-white border border-[#e2e8f0] shadow-sm p-6">
      <p className="text-base font-bold text-[#1e293b] mb-4">
        {isManager ? "📊 Staff Completion Rates" : "📊 My Completion Rate"}
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
              className="text-5xl font-black"
              style={{ color: rateColor(myRate.completion_rate) }}
            >
              {myRate.completion_rate}
            </span>
            <span className="text-2xl font-bold text-[#64748b] mb-1">%</span>
          </div>
          <ProgressBar rate={myRate.completion_rate} />
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
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#1e293b]">
                  {r.pic_name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-sm font-black"
                    style={{ color: rateColor(r.completion_rate) }}
                  >
                    {r.completion_rate}%
                  </span>
                  <span className="text-sm">{rateIcon(r.completion_rate)}</span>
                </div>
              </div>
              <ProgressBar rate={r.completion_rate} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
