"use client";

import type { SalesSummary } from "@/hooks/useSalesRecord";

interface Props {
  summary: SalesSummary;
  isLoading: boolean;
}

const STATS: { key: keyof SalesSummary; label: string }[] = [
  { key: "total_transactions", label: "transactions" },
  { key: "total_units_sold", label: "units sold" },
  { key: "partial_count", label: "partial" },
  { key: "fully_sold_count", label: "fully sold" },
];

// Compact desktop replacement for the bulky SalesSummaryBar card — same data,
// one line. Reused standalone (staff, no Analytics section) and merged into
// the Sales Analytics header (managers).
export default function SalesSummaryInline({ summary, isLoading }: Props) {
  if (isLoading) {
    return <span className="text-xs text-[#94a3b8]">Loading stats…</span>;
  }
  return (
    <span className="text-xs text-[#64748b]">
      {STATS.map((s, i) => (
        <span key={s.key}>
          {i > 0 && <span className="mx-1.5 text-[#cbd5e1]">·</span>}
          <span className="font-semibold text-[#0f172a]">{summary[s.key]}</span> {s.label}
        </span>
      ))}
    </span>
  );
}
