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
    dot: "bg-blue-400",
    text: "text-blue-300",
    border: "border-blue-500/20",
    bg: "bg-blue-500/10",
  },
  {
    key: "accepted",
    label: "Accepted",
    dot: "bg-green-400",
    text: "text-green-300",
    border: "border-green-500/20",
    bg: "bg-green-500/10",
  },
  {
    key: "rejected",
    label: "Rejected",
    dot: "bg-red-400",
    text: "text-red-300",
    border: "border-red-500/20",
    bg: "bg-red-500/10",
  },
  {
    key: "completed",
    label: "Completed",
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/10",
  },
] as const;

export default function OffersSummary({ counts, isLoading }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Total */}
      <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5">
        <span className="text-xs text-gray-400">Total</span>
        <span
          className={`text-sm font-bold text-white ${isLoading ? "opacity-40" : ""}`}
        >
          {counts.total}
        </span>
      </div>

      {PILLS.map(({ key, label, dot, text, border, bg }) => (
        <div
          key={key}
          className={`flex items-center gap-2 rounded-xl border ${border} ${bg} px-4 py-2.5`}
        >
          <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />
          <span className="text-xs text-gray-400">{label}</span>
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
