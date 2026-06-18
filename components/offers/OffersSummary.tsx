"use client";

import type { OfferCounts } from "@/hooks/useOffers";

interface Props {
  counts: OfferCounts;
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

export default function OffersSummary({ counts, isLoading }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <SummaryPill label="Offered"   count={counts.offered}   bg="#dbeafe" color="#2563eb" dotColor="#2563eb" isLoading={isLoading} />
      <SummaryPill label="Accepted"  count={counts.accepted}  bg="#dcfce7" color="#16a34a" dotColor="#16a34a" isLoading={isLoading} />
      <SummaryPill label="Rejected"  count={counts.rejected}  bg="#fee2e2" color="#dc2626" dotColor="#dc2626" isLoading={isLoading} />
      <SummaryPill label="Completed" count={counts.completed} bg="#dcfce7" color="#16a34a" dotColor="#16a34a" isLoading={isLoading} />
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ml-auto" style={{ background: "#f1f5f9", color: "#475569" }}>
        Total {isLoading ? "…" : counts.total}
      </span>
    </div>
  );
}
