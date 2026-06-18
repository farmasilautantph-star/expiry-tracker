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

const CIRCUMFERENCE = 2 * Math.PI * 45; // r=45

export default function SystemHealthCard({ data, isLoading }: Props) {
  const color = data ? scoreColor(data.score) : "#94a3b8";
  const dashOffset = data
    ? CIRCUMFERENCE - (data.score / 100) * CIRCUMFERENCE
    : CIRCUMFERENCE;

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6" style={{ border: "1px solid #e2e8f0" }}>
      <p className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-4">
        SYSTEM HEALTH
      </p>

      {isLoading || !data ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-[120px] h-[120px] rounded-full bg-[#f1f5f9] animate-pulse" />
          <div className="w-full space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-5 bg-[#f1f5f9] animate-pulse rounded" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center mb-6">
            <div className="relative" style={{ width: 120, height: 120 }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                {/* Track */}
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="10"
                />
                {/* Progress */}
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  stroke={color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="font-black leading-none"
                  style={{ fontSize: "36px", color }}
                >
                  {data.score}
                </span>
                <span className="text-xs text-[#94a3b8] mt-0.5">Health Score</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { dot: "#22c55e", label: "Up to date", count: data.upToDate },
              { dot: "#eab308", label: "Needs review", count: data.needsReview },
              { dot: "#ef4444", label: "Critical", count: data.criticalStale },
              { dot: "#64748b", label: "Resolved", count: data.resolved },
            ].map(({ dot, label, count }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: dot }}
                  />
                  <span className="text-[#475569]">{label}</span>
                </span>
                <span className="font-bold text-[#0f172a]">{count} items</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
