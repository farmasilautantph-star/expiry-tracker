"use client";

import { useRouter } from "next/navigation";
import type { StaleItem, ReviewDeadline } from "@/hooks/useDashboardHealth";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { getNextSundayDisplay } from "@/lib/sunday-deadline";

interface Props {
  items: StaleItem[];
  isLoading: boolean;
  reviewDeadline?: ReviewDeadline;
}

export default function StaleItemsCard({ items, isLoading, reviewDeadline }: Props) {
  const router = useRouter();
  const count = items.length;
  const nextSunday = reviewDeadline?.nextSunday ?? getNextSundayDisplay();

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6" style={{ border: "1px solid #e2e8f0" }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
            Items Needing Review
          </p>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Deadline: Every Sunday by 11:59 PM MYT
          </p>
        </div>
        {count > 0 && (
          <span
            className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full text-white text-xs font-bold flex-shrink-0"
            style={{ background: "#dc2626" }}
          >
            {count}
          </span>
        )}
        {count === 0 && !isLoading && (
          <span
            className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-bold flex-shrink-0"
            style={{ background: "#dcfce7", color: "#16a34a" }}
          >
            All clear
          </span>
        )}
      </div>

      {/* Next deadline badge */}
      {!isLoading && (
        <div className="mb-4 mt-2">
          <span
            className="inline-flex items-center text-xs rounded-full px-3 py-1 font-medium"
            style={{ background: "#eff6ff", color: "#2563eb" }}
          >
            Next deadline: {nextSunday}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[#f1f5f9] animate-pulse rounded-xl" />
          ))}
        </div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircleIcon className="w-10 h-10 text-[#22c55e] mb-2" />
          <p className="text-sm font-semibold text-[#16a34a]">All items reviewed!</p>
          <p className="text-xs text-[#94a3b8] mt-1">Next deadline:</p>
          <p className="text-xs font-semibold text-[#2563eb] mt-0.5">{nextSunday}</p>
        </div>
      ) : (
        <div className="space-y-0 max-h-80 overflow-y-auto">
          {items.map((item, idx) => {
            const isCritical = item.review_status === "critical_stale";
            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 py-3"
                style={{
                  borderBottom: idx < items.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: isCritical ? "#ef4444" : "#eab308" }}
                  />
                  <div className="min-w-0">
                    <p
                      className="text-sm font-semibold text-[#0f172a] truncate"
                      title={item.description}
                    >
                      {item.description}
                    </p>
                    <p className="text-xs text-[#94a3b8] mt-0.5">
                      {item.category} · {item.pic_name}
                    </p>
                    <p className="text-xs text-[#94a3b8] mt-0.5">
                      Missed deadline: {item.missed_sunday}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    router.push(
                      `/dashboard/shortlist?search=${encodeURIComponent(item.barcode)}`,
                    )
                  }
                  className="flex-shrink-0 text-xs font-semibold transition-colors"
                  style={{ color: "#2563eb" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "#1d4ed8")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "#2563eb")
                  }
                >
                  Review
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
