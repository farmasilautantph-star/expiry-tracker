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
      <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 shadow-sm px-4 py-2.5">
        <span className="w-2 h-2 rounded-full bg-[#22c55e] flex-shrink-0" />
        <span className="text-xs text-[#64748b]">Creates</span>
        <span className={`text-sm font-bold text-[#16a34a] ${fade}`}>
          {counts.creates}
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-yellow-200 bg-yellow-50 shadow-sm px-4 py-2.5">
        <span className="w-2 h-2 rounded-full bg-[#eab308] flex-shrink-0" />
        <span className="text-xs text-[#64748b]">Updates</span>
        <span className={`text-sm font-bold text-[#ca8a04] ${fade}`}>
          {counts.updates}
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 shadow-sm px-4 py-2.5">
        <span className="w-2 h-2 rounded-full bg-[#ef4444] flex-shrink-0" />
        <span className="text-xs text-[#64748b]">Deletes</span>
        <span className={`text-sm font-bold text-[#ef4444] ${fade}`}>
          {counts.deletes}
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-[#e2e8f0] bg-white shadow-sm px-4 py-2.5">
        <span className="text-xs text-[#64748b]">Total</span>
        <span className={`text-sm font-bold text-[#1e293b] ${fade}`}>
          {counts.total}
        </span>
      </div>
    </div>
  );
}
