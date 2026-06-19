"use client";

import type { ShortListCounts } from "@/hooks/useShortList";

interface Props {
  counts: ShortListCounts;
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

export default function ShortListSummary({ counts, isLoading }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <SummaryPill label="Expired" count={counts.expired} bg="#fee2e2" color="#dc2626" dotColor="#dc2626" isLoading={isLoading} />
      <SummaryPill label="Critical" count={counts.critical} bg="#ffedd5" color="#ea580c" dotColor="#ea580c" isLoading={isLoading} />
      <SummaryPill label="Warning" count={counts.warning} bg="#fef9c3" color="#ca8a04" dotColor="#ca8a04" isLoading={isLoading} />
      <SummaryPill label="Safe" count={counts.safe} bg="#dcfce7" color="#16a34a" dotColor="#16a34a" isLoading={isLoading} />
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ml-auto" style={{ background: "#f1f5f9", color: "#475569" }}>
        Total {isLoading ? "…" : counts.total}
      </span>
    </div>
  );
}
