"use client";

import type { ShortListCounts } from "@/hooks/useShortList";

interface Props {
  counts: ShortListCounts;
  isLoading: boolean;
  activeStatus: string;
  onSelectStatus: (status: string) => void;
}

interface CardCfg {
  value: "expired" | "critical" | "warning" | "safe";
  label: string;
  description: string;
  color: string;
  rangeLabel?: string;
  tintBg: string;
}

const CARDS: CardCfg[] = [
  {
    value: "expired",
    label: "EXPIRED",
    description: "Past expiry date",
    color: "#ef4444",
    tintBg: "#fef2f2",
  },
  {
    value: "critical",
    label: "CRITICAL",
    description: "Expiring within 3 months",
    color: "#ea580c",
    rangeLabel: "3 mo",
    tintBg: "#fff7ed",
  },
  {
    value: "warning",
    label: "WARNING",
    description: "3 to 8 months left",
    color: "#d97706",
    rangeLabel: "3–8 mo",
    tintBg: "#fffbeb",
  },
  {
    value: "safe",
    label: "SAFE",
    description: "More than 8 months left",
    color: "#16a34a",
    rangeLabel: "8 mo+",
    tintBg: "#f0fdf4",
  },
];

function Card({
  cfg,
  count,
  isLoading,
  isActive,
  onClick,
}: {
  cfg: CardCfg;
  count: number;
  isLoading: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl px-4 pt-3 pb-4 md:px-5 md:pt-4 md:pb-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      style={{
        background: isActive ? cfg.tintBg : "#fff",
        border: isActive ? `2px solid ${cfg.color}` : "1px solid #e2e8f0",
      }}
    >
      {/* Top row: dot + label / range */}
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: cfg.color }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>
        {cfg.rangeLabel && (
          <span className="text-[11px] font-medium text-[#94a3b8]">{cfg.rangeLabel}</span>
        )}
      </div>

      {/* Big number */}
      <p className="font-black leading-none text-[32px] md:text-[46px]" style={{ color: cfg.color }}>
        {isLoading ? (
          <span className="inline-block w-10 h-7 md:w-12 md:h-9 bg-[#f1f5f9] animate-pulse rounded" />
        ) : (
          count
        )}
      </p>

      {/* Description */}
      <p className="text-[11px] md:text-xs font-medium text-[#94a3b8] mt-1.5 md:mt-2">
        {cfg.description}
      </p>
    </button>
  );
}

export default function ItemStatusStatCards({
  counts,
  isLoading,
  activeStatus,
  onSelectStatus,
}: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {CARDS.map((cfg) => {
        const isActive = activeStatus === cfg.value;
        return (
          <Card
            key={cfg.value}
            cfg={cfg}
            count={counts[cfg.value]}
            isLoading={isLoading}
            isActive={isActive}
            // No dedicated "All" card exists anymore, so clicking the
            // already-active card toggles the filter back off ("All").
            onClick={() => onSelectStatus(isActive ? "" : cfg.value)}
          />
        );
      })}
    </div>
  );
}
