"use client";

import type { OfferCounts } from "@/hooks/useOffers";

interface Props {
  counts: OfferCounts;
  isLoading: boolean;
}

const PILLS = [
  {
    key: "offered",
    label: "Offered",
    dot: "bg-[#3b82f6]",
    text: "text-[#1e3a8a]",
    border: "border-blue-200",
    bg: "bg-blue-50",
  },
  {
    key: "accepted",
    label: "Accepted",
    dot: "bg-[#22c55e]",
    text: "text-[#16a34a]",
    border: "border-green-200",
    bg: "bg-green-50",
  },
  {
    key: "rejected",
    label: "Rejected",
    dot: "bg-[#ef4444]",
    text: "text-[#ef4444]",
    border: "border-red-200",
    bg: "bg-red-50",
  },
  {
    key: "completed",
    label: "Completed",
    dot: "bg-[#22c55e]",
    text: "text-[#059669]",
    border: "border-emerald-200",
    bg: "bg-emerald-50",
  },
] as const;

export default function OffersSummary({ counts, isLoading }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Total */}
      <div className="flex items-center gap-2 rounded-2xl border border-[#e2e8f0] bg-white shadow-sm px-4 py-2.5">
        <span className="text-xs text-[#64748b]">Total</span>
        <span
          className={`text-sm font-bold text-[#1e293b] ${isLoading ? "opacity-40" : ""}`}
        >
          {counts.total}
        </span>
      </div>

      {PILLS.map(({ key, label, dot, text, border, bg }) => (
        <div
          key={key}
          className={`flex items-center gap-2 rounded-2xl border ${border} ${bg} shadow-sm px-4 py-2.5`}
        >
          <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />
          <span className="text-xs text-[#64748b]">{label}</span>
          <span
            className={`text-sm font-bold ${text} ${isLoading ? "opacity-40" : ""}`}
          >
            {counts[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
