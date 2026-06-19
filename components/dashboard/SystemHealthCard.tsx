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

// Arc geometry — 270° arc, gap at the bottom
// SVG coordinate system: 0° = right, angles increase clockwise (y-axis down)
// Start angle: 135° (bottom-left), End angle: 45° (bottom-right)
// Sweep clockwise (sweep=1) via top = 270° arc, large-arc=1
const CX = 60;
const CY = 60;
const R = 45;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

const START_X = CX + R * Math.cos(toRad(135));  // 28.18 — bottom-left
const START_Y = CY + R * Math.sin(toRad(135));  // 91.82
const END_X   = CX + R * Math.cos(toRad(45));   // 91.82 — bottom-right
const END_Y   = CY + R * Math.sin(toRad(45));   // 91.82

// Full 270° arc path (clockwise via top)
const ARC_PATH = [
  `M ${START_X.toFixed(2)} ${START_Y.toFixed(2)}`,
  `A ${R} ${R} 0 1 1 ${END_X.toFixed(2)} ${END_Y.toFixed(2)}`,
].join(" ");

// Arc circumference for the 270° span
const ARC_LENGTH = (270 / 360) * 2 * Math.PI * R; // ≈ 212.1

export default function SystemHealthCard({ data, isLoading }: Props) {
  const color   = data ? scoreColor(data.score) : "#94a3b8";
  const dashLen = data ? (data.score / 100) * ARC_LENGTH : 0;

  return (
    <div
      className="rounded-2xl bg-white shadow-sm p-6"
      style={{ border: "1px solid #e2e8f0" }}
    >
      <p className="text-sm font-bold text-[#0f172a] mb-4">System Health</p>

      {isLoading || !data ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-[130px] h-[130px] rounded-full bg-[#f1f5f9] animate-pulse" />
          <div className="w-full space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-5 bg-[#f1f5f9] animate-pulse rounded" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Donut arc */}
          <div className="flex justify-center mb-6">
            <div className="relative" style={{ width: 130, height: 130 }}>
              <svg
                width="130"
                height="130"
                viewBox="0 0 120 120"
                overflow="visible"
              >
                {/* Background track arc */}
                <path
                  d={ARC_PATH}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Progress arc */}
                <path
                  d={ARC_PATH}
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${dashLen.toFixed(2)} ${ARC_LENGTH.toFixed(2)}`}
                  style={{
                    transition: "stroke-dasharray 0.6s ease, stroke 0.3s ease",
                  }}
                />
              </svg>

              {/* Center label — sits inside the arc */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pb-3">
                <span
                  className="font-black leading-none"
                  style={{ fontSize: "34px", color }}
                >
                  {data.score}
                </span>
                <span
                  className="font-semibold uppercase text-[#94a3b8]"
                  style={{ fontSize: "9px", letterSpacing: "2px", marginTop: "3px" }}
                >
                  HEALTH
                </span>
              </div>
            </div>
          </div>

          {/* Stats list */}
          <div className="space-y-2.5">
            {[
              { dot: "#22c55e", label: "Up to date",   count: data.upToDate      },
              { dot: "#eab308", label: "Needs review", count: data.needsReview   },
              { dot: "#ef4444", label: "Critical",     count: data.criticalStale },
              { dot: "#64748b", label: "Resolved",     count: data.resolved      },
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
