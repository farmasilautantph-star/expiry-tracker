"use client";

import { useRouter } from "next/navigation";
import type { StaleItem } from "@/hooks/useDashboardHealth";

interface Props {
  items: StaleItem[];
  isLoading: boolean;
}

export default function StaleItemsCard({ items, isLoading }: Props) {
  const router = useRouter();
  const count = items.length;

  return (
    <div className="rounded-2xl bg-white border border-[#e2e8f0] shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-base font-bold text-[#1e293b]">
          ⚠️ Items Needing Review
        </p>
        {count > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
            {count}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-[#f1f5f9] animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm font-semibold text-[#1e293b]">
            All items are up to date!
          </p>
          <p className="text-xs text-[#94a3b8] mt-1">
            Great work keeping records fresh.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {items.map((item) => {
            const isCritical = item.review_status === "critical_stale";
            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 p-3 rounded-xl border border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className="mt-0.5 flex-shrink-0">
                    {isCritical ? "🔴" : "🟡"}
                  </span>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium text-[#1e293b] truncate"
                      title={item.description}
                    >
                      {item.description}
                    </p>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      {item.category} · {item.pic_name} ·{" "}
                      {item.days_since_review}d since review
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    router.push(
                      `/dashboard/shortlist?search=${encodeURIComponent(item.barcode)}`,
                    )
                  }
                  className="flex-shrink-0 text-xs font-medium text-[#3b82f6] hover:text-[#1e3a8a] whitespace-nowrap transition-colors"
                >
                  Review Now →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
