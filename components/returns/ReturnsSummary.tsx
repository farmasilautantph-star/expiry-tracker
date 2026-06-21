"use client";

import type { ReturnCounts } from "@/hooks/useReturns";

interface Props {
  counts: ReturnCounts;
  isLoading: boolean;
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

function SummaryPill({
  label,
  count,
  bg,
  color,
  dotColor,
  isLoading,
}: {
  label: string;
  count: number;
  bg: string;
  color: string;
  dotColor: string;
  isLoading: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: bg, color }}
    >
      <Dot color={dotColor} />
      {label}
      {isLoading ? (
        <span className="inline-block w-4 h-3 rounded bg-current opacity-20 animate-pulse" />
      ) : (
        count
      )}
    </span>
  );
}

export default function ReturnsSummary({ counts, isLoading }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <SummaryPill label="Pending"      count={counts.pending}      bg="#fef3c7" color="#d97706" dotColor="#d97706" isLoading={isLoading} />
      <SummaryPill label="Overdue"      count={counts.overdue}      bg="#fee2e2" color="#dc2626" dotColor="#dc2626" isLoading={isLoading} />
      <SummaryPill label="Returned"     count={counts.returned}     bg="#dcfce7" color="#16a34a" dotColor="#16a34a" isLoading={isLoading} />
      <SummaryPill label="Not Approved" count={counts.not_approved} bg="#fee2e2" color="#991b1b" dotColor="#991b1b" isLoading={isLoading} />
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ml-auto" style={{ background: "#f1f5f9", color: "#475569" }}>
        Total {isLoading ? "…" : counts.total}
      </span>
    </div>
  );
}
