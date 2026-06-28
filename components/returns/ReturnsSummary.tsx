"use client";

import type { ReturnCounts } from "@/hooks/useReturns";

interface Props {
  counts: ReturnCounts;
  isLoading: boolean;
}

function SummaryPill({
  label,
  count,
  bg,
  color,
  isLoading,
}: {
  label: string;
  count: number;
  bg: string;
  color: string;
  isLoading: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: bg, color }}
    >
      {label}
      {isLoading ? (
        <span className="inline-block w-4 h-3 rounded bg-current opacity-20 animate-pulse" />
      ) : (
        <span>{count}</span>
      )}
    </span>
  );
}

const STATUS_CHIPS = [
  { key: "pending"      as const, label: "Pending",      dot: "#d97706", bg: "#fef3c7", color: "#d97706" },
  { key: "overdue"      as const, label: "Overdue",      dot: "#dc2626", bg: "#fee2e2", color: "#dc2626" },
  { key: "returned"     as const, label: "Returned",     dot: "#16a34a", bg: "#dcfce7", color: "#16a34a" },
  { key: "not_approved" as const, label: "Not Approved", dot: "#ea580c", bg: "#ffedd5", color: "#ea580c" },
] as const;

export default function ReturnsSummary({ counts, isLoading }: Props) {
  return (
    <>
      {/* Mobile (below md) — horizontal scroll chips + right-aligned total */}
      <div className="md:hidden flex flex-col gap-1.5">
        <div
          className="flex gap-2 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          {STATUS_CHIPS.map(({ key, label, dot, bg, color }) => (
            <span
              key={key}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
              style={{ background: bg, color }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
              {label}
              {isLoading ? (
                <span className="inline-block w-4 h-3 rounded bg-current opacity-20 animate-pulse" />
              ) : (
                <span>{counts[key]}</span>
              )}
            </span>
          ))}
        </div>
        <p className="text-xs font-medium text-[#94a3b8] text-right">
          Total {isLoading ? "…" : counts.total}
        </p>
      </div>

      {/* Desktop (md and up) — existing pill layout */}
      <div className="hidden md:flex flex-wrap gap-2 items-center">
        <SummaryPill label="Pending"      count={counts.pending}      bg="#fef3c7" color="#d97706" isLoading={isLoading} />
        <SummaryPill label="Overdue"      count={counts.overdue}      bg="#fee2e2" color="#dc2626" isLoading={isLoading} />
        <SummaryPill label="Returned"     count={counts.returned}     bg="#dcfce7" color="#16a34a" isLoading={isLoading} />
        <SummaryPill label="Not Approved" count={counts.not_approved} bg="#ffedd5" color="#ea580c" isLoading={isLoading} />
        <span className="ml-auto text-xs font-medium text-[#94a3b8]">
          Total {isLoading ? "…" : counts.total}
        </span>
      </div>
    </>
  );
}
