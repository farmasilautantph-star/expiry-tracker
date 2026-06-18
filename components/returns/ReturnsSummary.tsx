"use client";

import type { ReturnCounts } from "@/hooks/useReturns";

interface Props {
  counts: ReturnCounts;
  isLoading: boolean;
}

function Pill({
  label,
  count,
  color,
  isLoading,
}: {
  label: string;
  count: number;
  color: string;
  isLoading: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${color}`}
    >
      <span className="text-xs font-medium opacity-80">{label}</span>
      {isLoading ? (
        <span className="w-5 h-4 rounded bg-current opacity-20 animate-pulse" />
      ) : (
        <span className="text-sm font-bold">{count}</span>
      )}
    </div>
  );
}

export default function ReturnsSummary({ counts, isLoading }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill
        label="🟡 Pending"
        count={counts.pending}
        color="bg-yellow-50 border-yellow-200 text-[#ca8a04]"
        isLoading={isLoading}
      />
      <Pill
        label="🔴 Overdue"
        count={counts.overdue}
        color="bg-red-50 border-red-200 text-[#ef4444]"
        isLoading={isLoading}
      />
      <Pill
        label="✅ Returned"
        count={counts.returned}
        color="bg-green-50 border-green-200 text-[#16a34a]"
        isLoading={isLoading}
      />
      <div className="ml-auto flex items-center gap-1.5 text-xs text-[#64748b] self-center pr-1">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
        {isLoading ? "…" : `${counts.total} total`}
      </div>
    </div>
  );
}
