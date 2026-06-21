"use client";

import { useRouter } from "next/navigation";
import type { StaleItem, ReviewDeadline } from "@/hooks/useDashboardHealth";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { getDaysUntilSunday, getNextSundayDisplay } from "@/lib/sunday-deadline-client";

interface Props {
  items: StaleItem[];
  isLoading: boolean;
  reviewDeadline?: ReviewDeadline;
}

function getMYTDayOfWeek(): number {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" })).getDay();
}

function StatusMessage({ item }: { item: StaleItem }) {
  switch (item.review_status) {
    case "early_alert":
      return (
        <p className="text-xs mt-0.5 font-medium" style={{ color: "#ca8a04" }}>
          ⏰ Review before {item.sunday_label}
        </p>
      );
    case "last_chance":
      return (
        <p className="text-xs mt-0.5 font-medium" style={{ color: "#ea580c" }}>
          ⚠ Must review TODAY by 11:59 PM MYT
        </p>
      );
    case "needs_review":
      return (
        <p className="text-xs mt-0.5 font-medium" style={{ color: "#dc2626" }}>
          ✗ Missed Sunday: {item.sunday_label}
        </p>
      );
    case "critical_stale":
      return (
        <p className="text-xs mt-0.5 font-medium" style={{ color: "#991b1b" }}>
          ✗ Missed 2+ Sunday deadlines
        </p>
      );
  }
}

function StatusDot({ urgency }: { urgency: StaleItem["urgency"] }) {
  const colors: Record<string, string> = {
    warn: "#eab308",
    urgent: "#ea580c",
    missed: "#ef4444",
    critical: "#991b1b",
  };
  return (
    <span
      className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: colors[urgency] ?? "#94a3b8" }}
    />
  );
}

export default function StaleItemsCard({ items, isLoading, reviewDeadline }: Props) {
  const router = useRouter();
  const count = items.length;
  const dayOfWeek = getMYTDayOfWeek();
  const daysUntilSunday = getDaysUntilSunday();
  const nextSunday = reviewDeadline?.nextSunday ?? getNextSundayDisplay();

  // Dynamic header
  const isThurSat = dayOfWeek >= 4 && dayOfWeek <= 6;
  const isSunday = dayOfWeek === 0;

  const headerTitle = isSunday
    ? "Review Deadline TODAY"
    : isThurSat
    ? "Items to Review This Week"
    : "Items Needing Review";

  const headerSubtitle = isSunday
    ? "Must complete by 11:59 PM MYT"
    : isThurSat
    ? `${daysUntilSunday} day${daysUntilSunday !== 1 ? "s" : ""} until Sunday deadline`
    : "Missed Sunday deadline";

  const badgeBg = isSunday ? "#ffedd5" : isThurSat ? "#fef9c3" : "#fee2e2";
  const badgeColor = isSunday ? "#ea580c" : isThurSat ? "#ca8a04" : "#dc2626";
  const badgePulse = isSunday;

  // Empty state messages
  const emptyTitle = isSunday
    ? "All reviewed! Great work"
    : isThurSat
    ? "Looking good — nothing to review yet"
    : "No missed reviews this week";

  const emptySubtitle = isSunday
    ? "Deadline at 11:59 PM MYT tonight"
    : `Next deadline: ${nextSunday}`;

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6" style={{ border: "1px solid #e2e8f0" }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
            {headerTitle}
          </p>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            {headerSubtitle}
          </p>
        </div>
        {!isLoading && count > 0 && (
          <span
            className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full text-xs font-bold flex-shrink-0${badgePulse ? " animate-pulse" : ""}`}
            style={{ background: badgeBg, color: badgeColor }}
          >
            {count}
          </span>
        )}
        {!isLoading && count === 0 && (
          <span
            className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-bold flex-shrink-0"
            style={{ background: "#dcfce7", color: "#16a34a" }}
          >
            All clear
          </span>
        )}
      </div>

      {/* Next deadline badge */}
      {!isLoading && !isSunday && (
        <div className="mb-4 mt-2">
          <span
            className="inline-flex items-center text-xs rounded-full px-3 py-1 font-medium"
            style={{ background: "#eff6ff", color: "#2563eb" }}
          >
            Next deadline: {nextSunday}
          </span>
        </div>
      )}
      {!isLoading && isSunday && (
        <div className="mb-4 mt-2">
          <span
            className="inline-flex items-center text-xs rounded-full px-3 py-1 font-medium animate-pulse"
            style={{ background: "#ffedd5", color: "#ea580c" }}
          >
            ⚠ Deadline tonight at 11:59 PM MYT
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
          <p className="text-sm font-semibold text-[#16a34a]">{emptyTitle}</p>
          <p className="text-xs text-[#94a3b8] mt-1">{emptySubtitle}</p>
        </div>
      ) : (
        <div className="space-y-0 max-h-80 overflow-y-auto">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 py-3"
              style={{
                borderBottom: idx < items.length - 1 ? "1px solid #f1f5f9" : "none",
              }}
            >
              <div className="flex items-start gap-2 min-w-0">
                <StatusDot urgency={item.urgency} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0f172a] truncate" title={item.description}>
                    {item.description}
                  </p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    {item.category} · {item.pic_name}
                  </p>
                  <StatusMessage item={item} />
                </div>
              </div>
              <button
                onClick={() =>
                  router.push(`/dashboard/shortlist?search=${encodeURIComponent(item.barcode)}`)
                }
                className="flex-shrink-0 text-xs font-semibold transition-colors"
                style={{ color: "#2563eb" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#1d4ed8")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#2563eb")}
              >
                Review
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
