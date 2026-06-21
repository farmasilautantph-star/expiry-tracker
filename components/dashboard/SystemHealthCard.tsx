"use client";

import type { SystemHealth } from "@/hooks/useDashboardHealth";

interface Props {
  data: SystemHealth | null;
  isLoading: boolean;
  isManager?: boolean;
}

// Arc geometry — 270° arc, gap at the bottom
const CX = 60;
const CY = 60;
const R  = 45;

function toRad(deg: number) { return (deg * Math.PI) / 180; }

const START_X = CX + R * Math.cos(toRad(135));
const START_Y = CY + R * Math.sin(toRad(135));
const END_X   = CX + R * Math.cos(toRad(45));
const END_Y   = CY + R * Math.sin(toRad(45));

const ARC_PATH   = `M ${START_X.toFixed(2)} ${START_Y.toFixed(2)} A ${R} ${R} 0 1 1 ${END_X.toFixed(2)} ${END_Y.toFixed(2)}`;
const ARC_LENGTH = (270 / 360) * 2 * Math.PI * R;

const URGENCY_ROWS = [
  { key: "expired",  label: "Expired",  dot: "#dc2626", penaltyColor: "#dc2626" },
  { key: "critical", label: "Critical", dot: "#ea580c", penaltyColor: "#ea580c" },
  { key: "warning",  label: "Warning",  dot: "#ca8a04", penaltyColor: "#ca8a04" },
  { key: "safe",     label: "Safe",     dot: "#16a34a", penaltyColor: null      },
] as const;

export default function SystemHealthCard({ data, isLoading, isManager = false }: Props) {
  const color   = data?.color ?? "#94a3b8";
  const dashLen = data ? (data.score / 100) * ARC_LENGTH : 0;

  return (
    <div
      className="rounded-2xl bg-white shadow-sm p-6"
      style={{ border: "1px solid #e2e8f0" }}
    >
      <div className="mb-1">
        <p className="text-sm font-bold text-[#0f172a]">System Health</p>
        <p className="text-xs text-[#94a3b8]">
          {isManager ? "(All items)" : "(Your items)"}
        </p>
      </div>

      {isLoading || !data ? (
        <div className="flex flex-col items-center gap-4 py-4 mt-3">
          <div className="w-[130px] h-[130px] rounded-full bg-[#f1f5f9] animate-pulse" />
          <div className="w-full space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-5 bg-[#f1f5f9] animate-pulse rounded" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Donut arc */}
          <div className="flex justify-center mt-3 mb-5">
            <div className="relative" style={{ width: 130, height: 130 }}>
              <svg width="130" height="130" viewBox="0 0 120 120" overflow="visible">
                <path
                  d={ARC_PATH}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d={ARC_PATH}
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${dashLen.toFixed(2)} ${ARC_LENGTH.toFixed(2)}`}
                  style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.3s ease" }}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center pb-3">
                <span
                  className="font-black leading-none"
                  style={{ fontSize: "34px", color }}
                >
                  {data.score}
                </span>
                <span
                  className="font-semibold uppercase tracking-wider"
                  style={{ fontSize: "10px", color, marginTop: "3px" }}
                >
                  {data.label}
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown table */}
          <div>
            {URGENCY_ROWS.map(({ key, label, dot, penaltyColor }, i) => {
              const bucket = data[key];
              const isLast = i === URGENCY_ROWS.length - 1;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: isLast ? undefined : "1px solid #f1f5f9" }}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: dot }}
                    />
                    <span className="text-sm text-[#475569] font-medium">{label}</span>
                    <span className="text-sm font-bold text-[#0f172a] ml-1">
                      {bucket.count}
                    </span>
                  </span>
                  {penaltyColor ? (
                    <span className="text-sm font-semibold" style={{ color: penaltyColor }}>
                      -{bucket.penalty} pts
                    </span>
                  ) : (
                    <span className="text-sm text-[#94a3b8]">—</span>
                  )}
                </div>
              );
            })}

            {/* Divider + total */}
            <div
              className="flex items-center justify-between pt-2.5 mt-1"
              style={{ borderTop: "1px solid #e2e8f0" }}
            >
              <span className="text-xs text-[#94a3b8]">Total Penalty</span>
              <span className="text-sm font-bold" style={{ color }}>
                -{data.totalPenalty} pts
              </span>
            </div>
          </div>

          {/* Score formula info box */}
          <div
            className="mt-4 rounded-lg p-2 text-xs text-[#94a3b8] space-y-0.5"
            style={{ background: "#f8fafc" }}
          >
            <p>Score = 100 - penalty</p>
            <p>Expired: -10pts each &nbsp;·&nbsp; Critical: -5pts each &nbsp;·&nbsp; Warning: -1pt each</p>
          </div>
        </>
      )}
    </div>
  );
}
