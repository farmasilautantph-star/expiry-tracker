"use client";

import type { HistoryCounts } from "@/hooks/useHistory";

interface Props {
  counts: HistoryCounts;
  isLoading: boolean;
}

export default function HistorySummary({ counts, isLoading }: Props) {
  const fade = isLoading ? "opacity-40" : "";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-2.5">
        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
        <span className="text-xs text-gray-400">Creates</span>
        <span className={`text-sm font-bold text-green-400 ${fade}`}>
          {counts.creates}
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2.5">
        <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
        <span className="text-xs text-gray-400">Updates</span>
        <span className={`text-sm font-bold text-yellow-400 ${fade}`}>
          {counts.updates}
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5">
        <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
        <span className="text-xs text-gray-400">Deletes</span>
        <span className={`text-sm font-bold text-red-400 ${fade}`}>
          {counts.deletes}
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5">
        <span className="text-xs text-gray-400">Total</span>
        <span className={`text-sm font-bold text-white ${fade}`}>
          {counts.total}
        </span>
      </div>
    </div>
  );
}
