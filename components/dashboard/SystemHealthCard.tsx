"use client";

import type { SystemHealth } from "@/hooks/useDashboardHealth";

interface Props {
  data: SystemHealth | null;
  isLoading: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  return "#ef4444";
}

export default function SystemHealthCard({ data, isLoading }: Props) {
  const color = data ? scoreColor(data.score) : "#94a3b8";

  return (
    <div className="rounded-2xl bg-white border border-[#e2e8f0] shadow-sm p-6">
      <p className="text-base font-bold text-[#1e293b] mb-4">
        🏥 System Health
      </p>

      {isLoading || !data ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-32 h-32 rounded-full bg-[#f1f5f9] animate-pulse" />
          <div className="w-full space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-5 bg-[#f1f5f9] animate-pulse rounded"
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center border-8"
              style={{ borderColor: color }}
            >
              <div className="text-center leading-none">
                <span
                  className="text-5xl font-black"
                  style={{ color }}
                >
                  {data.score}
                </span>
                <span className="text-2xl font-bold" style={{ color }}>
                  %
                </span>
              </div>
            </div>
            <p className="text-sm text-[#64748b] mt-2">System Health Score</p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span>✅</span>
                <span className="text-[#475569]">Up to date</span>
              </span>
              <span className="font-semibold text-[#1e293b]">
                {data.upToDate} items
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span>🟡</span>
                <span className="text-[#475569]">Needs review</span>
              </span>
              <span className="font-semibold text-[#1e293b]">
                {data.needsReview} items
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span>🔴</span>
                <span className="text-[#475569]">Critical</span>
              </span>
              <span className="font-semibold text-[#1e293b]">
                {data.criticalStale} items
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span>☑️</span>
                <span className="text-[#475569]">Resolved</span>
              </span>
              <span className="font-semibold text-[#1e293b]">
                {data.resolved} items
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
