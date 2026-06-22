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

export default function ReturnsSummary({ counts, isLoading }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <SummaryPill label="Pending"      count={counts.pending}      bg="#fef3c7" color="#d97706" isLoading={isLoading} />
      <SummaryPill label="Overdue"      count={counts.overdue}      bg="#fee2e2" color="#dc2626" isLoading={isLoading} />
      <SummaryPill label="Returned"     count={counts.returned}     bg="#dcfce7" color="#16a34a" isLoading={isLoading} />
      <SummaryPill label="Not Approved" count={counts.not_approved} bg="#ffedd5" color="#ea580c" isLoading={isLoading} />
      <span className="ml-auto text-xs font-medium text-[#94a3b8]">
        Total {isLoading ? "…" : counts.total}
      </span>
    </div>
  );
}
