"use client";

import type { ShortListCounts } from "@/hooks/useShortList";

interface Props {
  counts: ShortListCounts;
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

export default function ShortListSummary({ counts, isLoading }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill
        label="🔴 Expired"
        count={counts.expired}
        color="bg-red-500/10 border-red-500/20 text-red-400"
        isLoading={isLoading}
      />
      <Pill
        label="🟠 Critical"
        count={counts.critical}
        color="bg-orange-500/10 border-orange-500/20 text-orange-400"
        isLoading={isLoading}
      />
      <Pill
        label="🟡 Warning"
        count={counts.warning}
        color="bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
        isLoading={isLoading}
      />
      <Pill
        label="🟢 Safe"
        count={counts.safe}
        color="bg-green-500/10 border-green-500/20 text-green-400"
        isLoading={isLoading}
      />
      <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 self-center pr-1">
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        {isLoading ? "…" : `${counts.total} items`}
      </div>
    </div>
  );
}
