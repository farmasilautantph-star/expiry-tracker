"use client";

import type { SystemHealth } from "@/hooks/useDashboardHealth";

interface Props {
  data: SystemHealth | null;
  isLoading: boolean;
  isManager?: boolean;
}

const R           = 46;
const CX          = 60;
const CY          = 60;
const CIRCUMFERENCE = 2 * Math.PI * R;

const URGENCY_ROWS = [
  { key: "expired",  label: "Expired",  dot: "#dc2626", penaltyColor: "#dc2626" },
  { key: "critical", label: "Critical", dot: "#ea580c", penaltyColor: "#ea580c" },
  { key: "warning",  label: "Warning",  dot: "#ca8a04", penaltyColor: "#ca8a04" },
  { key: "safe",     label: "Safe",     dot: "#16a34a", penaltyColor: null      },
] as const;

function getHealthSummary(score: number, expired: number, critical: number) {
  if (score >= 80) {
    return {
      message: expired === 0 && critical === 0
        ? "Your inventory is in great shape! All items are well within safe expiry range."
        : `Your inventory is healthy. Monitor ${critical} critical item${critical !== 1 ? "s" : ""} before they expire.`,
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    };
  }
  if (score >= 60) {
    return {
      message: `Inventory needs attention. ${critical} critical item${critical !== 1 ? "s" : ""} expiring within 3 months. Review and take action soon.`,
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
    };
  }
  if (score >= 40) {
    return {
      message: `Several items require immediate action.${expired > 0 ? ` ${expired} item${expired !== 1 ? "s" : ""} already expired.` : ""} Prioritize clearing critical stock now.`,
      color: "#ea580c",
      bg: "#fff7ed",
      border: "#fed7aa",
    };
  }
  return {
    message: `Urgent! ${expired} expired item${expired !== 1 ? "s" : ""} detected. Immediate action required to prevent further losses.`,
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
  };
}

export default function SystemHealthCard({ data, isLoading, isManager = false }: Props) {
  const color   = data?.color ?? "#94a3b8";
  const dashLen = data ? (data.score / 100) * CIRCUMFERENCE : 0;

  return (
    <div
      className="rounded-2xl bg-white shadow-sm p-6 h-full"
      style={{ border: "1px solid #e2e8f0" }}
    >
      <div className="mb-4">
        <p className="text-sm font-bold text-[#0f172a]">System Health</p>
        <p className="text-xs text-[#94a3b8]">
          {isManager ? "All items" : "Your items"}
        </p>
      </div>

      {isLoading || !data ? (
        <div className="flex gap-5 items-center">
          <div className="w-[120px] h-[120px] rounded-full bg-[#f1f5f9] animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-[#f1f5f9] animate-pulse rounded" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex gap-5 items-start">
          {/* Full 360° donut ring */}
          <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              {/* Track */}
              <circle
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="10"
              />
              {/* Progress — starts from 12 o'clock, clockwise */}
              <circle
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dashLen.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`}
                transform={`rotate(-90 ${CX} ${CY})`}
                style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.3s ease" }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="font-black leading-none"
                style={{ fontSize: "30px", color }}
              >
                {data.score}
              </span>
              <span
                className="font-bold uppercase tracking-wider mt-0.5"
                style={{ fontSize: "9px", color }}
              >
                {data.label}
              </span>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="flex-1 min-w-0 pt-1">
            {URGENCY_ROWS.map(({ key, label, dot, penaltyColor }, i) => {
              const bucket = data[key];
              const isLast = i === URGENCY_ROWS.length - 1;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: isLast ? undefined : "1px solid #f8fafc" }}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: dot }}
                    />
                    <span className="text-xs text-[#475569] font-medium">{label}</span>
                    <span className="text-xs font-bold text-[#0f172a]">
                      {bucket.count}
                    </span>
                  </span>
                  {penaltyColor ? (
                    <span className="text-xs font-semibold" style={{ color: penaltyColor }}>
                      -{bucket.penalty} pts
                    </span>
                  ) : (
                    <span className="text-xs text-[#cbd5e1]">—</span>
                  )}
                </div>
              );
            })}

            {/* Total penalty */}
            <div
              className="flex items-center justify-between mt-2 pt-2"
              style={{ borderTop: "1px solid #e2e8f0" }}
            >
              <span className="text-xs font-semibold text-[#475569]">Total penalty</span>
              <span className="text-xs font-bold" style={{ color }}>
                -{data.totalPenalty} pts
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Score formula + summary — staff only */}
      {data && !isLoading && !isManager && (
        <>
          <p className="mt-4 text-[11px] text-[#94a3b8]">
            Score = 100 - penalty · Expired -10 ea · Critical -5 ea · Warning -1 ea
          </p>
          {(() => {
            const summary = getHealthSummary(data.score, data.expired.count, data.critical.count);
            return (
              <div
                className="mt-3 p-3 rounded-xl"
                style={{ background: summary.bg, border: `1px solid ${summary.border}` }}
              >
                <p className="text-xs font-medium leading-relaxed" style={{ color: summary.color }}>
                  {summary.message}
                </p>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
