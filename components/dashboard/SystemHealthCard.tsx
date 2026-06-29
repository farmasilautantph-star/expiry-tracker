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

type RowType = "penalty" | "neutral" | "bonus";
const URGENCY_ROWS: Array<{
  key: "expired" | "critical" | "warning" | "safe";
  label: string;
  dot: string;
  type: RowType;
  ptColor: string | null;
}> = [
  { key: "expired",  label: "Expired",  dot: "#dc2626", type: "penalty",  ptColor: "#dc2626" },
  { key: "critical", label: "Critical", dot: "#ea580c", type: "penalty",  ptColor: "#ea580c" },
  { key: "warning",  label: "Warning",  dot: "#ca8a04", type: "neutral",  ptColor: null      },
  { key: "safe",     label: "Safe",     dot: "#16a34a", type: "bonus",    ptColor: "#16a34a" },
];

function getHealthGradient(score: number): string {
  if (score >= 80) return "linear-gradient(135deg,#15803d,#166534)";
  if (score >= 60) return "linear-gradient(135deg,#1d4ed8,#2d5490)";
  if (score >= 40) return "linear-gradient(135deg,#92400e,#b45309)";
  return "linear-gradient(135deg,#991b1b,#b91c1c)";
}

function getHealthSummary(score: number) {
  if (score >= 80) {
    return {
      message: "Inventory health is good. Keep monitoring expiry dates.",
      color: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    };
  }
  if (score >= 60) {
    return {
      message: "Some items need attention. Review critical and warning items.",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    };
  }
  if (score >= 40) {
    return {
      message: "Inventory needs attention. Take action on expiring items.",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    };
  }
  return {
    message: "Critical inventory health. Immediate action required.",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  };
}

export default function SystemHealthCard({ data, isLoading, isManager = false }: Props) {
  const color   = data?.color ?? "#94a3b8";
  const dashLen = data ? (data.score / 100) * CIRCUMFERENCE : 0;
  const urgentCount = data ? data.expired.count + data.critical.count : 0;

  return (
    <>
      {/* Mobile-only hero card (below md) */}
      <div className="md:hidden rounded-2xl p-5 relative overflow-hidden" style={{ background: data ? getHealthGradient(data.score) : "#94a3b8" }}>
        <div className="absolute -right-5 -top-5 w-[130px] h-[130px] rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="absolute right-[70px] -bottom-9 w-[80px] h-[80px] rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
        {isLoading || !data ? (
          <div className="h-[110px] flex items-center">
            <div className="h-12 w-32 bg-white/20 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
              Inventory Health Score
            </p>
            <div className="flex items-end gap-1 mb-1.5">
              <span className="font-black text-white leading-none" style={{ fontSize: "64px", letterSpacing: "-3px" }}>
                {data.score}
              </span>
              <span className="pb-2.5 pl-0.5 text-lg" style={{ color: "rgba(255,255,255,0.5)" }}>/100</span>
            </div>
            <p className="text-[12.5px] font-semibold mb-3.5" style={{ color: "rgba(255,255,255,0.8)" }}>
              {data.label} · {urgentCount} {urgentCount === 1 ? "item needs" : "items need"} action
            </p>
            <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${data.score}%`, background: "rgba(255,255,255,0.85)" }}
              />
            </div>
          </>
        )}
      </div>

      {/* Desktop card (md and up) */}
      <div
        className="hidden md:block rounded-2xl bg-white shadow-sm p-6 h-full"
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
            {URGENCY_ROWS.map(({ key, label, dot, type, ptColor }, i) => {
              const bucket = data[key];
              const isLast = i === URGENCY_ROWS.length - 1;
              const pts =
                type === "penalty"
                  ? `−${(bucket as { count: number; penalty: number }).penalty} pts`
                  : type === "bonus"
                  ? `+${(bucket as { count: number; bonus: number }).bonus} pts`
                  : "—";
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
                  <span
                    className="text-xs font-semibold"
                    style={{ color: type === "neutral" ? "#cbd5e1" : ptColor! }}
                  >
                    {pts}
                  </span>
                </div>
              );
            })}

            {/* Net score */}
            <div
              className="flex items-center justify-between mt-2 pt-2"
              style={{ borderTop: "1px solid #e2e8f0" }}
            >
              <span className="text-xs font-semibold text-[#475569]">Net score</span>
              <span className="text-xs font-bold" style={{ color }}>
                {data.netAdjustment >= 0 ? "+" : "−"}{Math.abs(data.netAdjustment)} pts
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Note — all roles */}
      {data && !isLoading && (
        <p className="mt-4 text-[11px] text-[#94a3b8]">
          Resolve expired &amp; critical items to improve score. Safe stock earns bonus points.
        </p>
      )}

      {/* Summary — all roles */}
      {data && !isLoading && (() => {
        const summary = getHealthSummary(data.score);
        return (
          <div className={`mt-3 p-3 rounded-xl border ${summary.bgColor} ${summary.borderColor}`}>
            <p className={`text-xs font-medium leading-relaxed ${summary.color}`}>
              {summary.message}
            </p>
          </div>
        );
      })()}
      </div>
    </>
  );
}
