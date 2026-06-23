"use client";

import { useRouter } from "next/navigation";
import type { StaleItem, ReviewDeadline, CompletionRate, UrgentItem } from "@/hooks/useDashboardHealth";
import { CheckCircleIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import {
  getDaysUntilSunday,
  getNextSundayDisplay,
  getLastSundayDisplay,
} from "@/lib/sunday-deadline-client";

// ── Staff-view helpers ────────────────────────────────────────────────────────

interface StaffProps {
  staleItems: StaleItem[];
  isLoading: boolean;
  rates: CompletionRate[];
  reviewDeadline?: ReviewDeadline;
}

interface ManagerProps {
  urgentItems: UrgentItem[];
  isLoading: boolean;
}

type Props =
  | ({ isManager: true } & ManagerProps & { rates?: CompletionRate[]; reviewDeadline?: ReviewDeadline })
  | ({ isManager: false } & StaffProps);

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

function StaleStatusDot({ urgency }: { urgency: StaleItem["urgency"] }) {
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

function rateColor(rate: number): string {
  if (rate >= 80) return "#22c55e";
  if (rate >= 60) return "#eab308";
  return "#ef4444";
}

function rateEmoji(rate: number): string {
  if (rate >= 80) return "✅";
  if (rate >= 60) return "⚠️";
  return "❌";
}

function StaffComplianceSection({
  rates,
  isLoading,
  lastSunday,
  nextSunday,
}: {
  rates: CompletionRate[];
  isLoading: boolean;
  lastSunday: string;
  nextSunday: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 mt-1">
        <div className="h-3 w-32 bg-[#f1f5f9] animate-pulse rounded" />
        <div className="h-6 bg-[#f1f5f9] animate-pulse rounded" />
      </div>
    );
  }

  const myRate = rates[0];
  if (!myRate) {
    return <p className="text-xs text-[#94a3b8]">No active items to track.</p>;
  }
  const color = rateColor(myRate.completion_rate);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-black leading-none" style={{ color }}>
          {myRate.completion_rate}%
        </span>
        <div className="flex-1">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f1f5f9" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${myRate.completion_rate}%`, background: color }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
            {myRate.reviewed_on_time} of {myRate.total} items reviewed on time
          </p>
        </div>
      </div>
      <p className="text-[11px]" style={{ color: "#94a3b8" }}>
        Week: {lastSunday} → {nextSunday}
      </p>
    </div>
  );
}

// ── Manager view ──────────────────────────────────────────────────────────────

function ManagerView({ urgentItems, isLoading, router }: ManagerProps & { router: ReturnType<typeof useRouter> }) {
  const count = urgentItems.length;
  const VISIBLE = 5;
  const overflow = count - VISIBLE;

  return (
    <div
      className="rounded-2xl bg-white shadow-sm p-6 flex flex-col"
      style={{ border: "1px solid #e2e8f0" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-slate-800">Items to Monitor</p>
          <p className="text-xs text-slate-400 mt-0.5">Expired &amp; critical items across all staff</p>
        </div>
        {!isLoading && count > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full text-xs font-bold flex-shrink-0 bg-red-500 text-white">
            {count}
          </span>
        )}
        {!isLoading && count === 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-bold flex-shrink-0 bg-green-100 text-green-700">
            All clear
          </span>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[#f1f5f9] animate-pulse rounded-xl" />
          ))}
        </div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircleIcon className="w-10 h-10 text-green-500 mb-2" />
          <p className="text-sm font-semibold text-green-700">No expired or critical items!</p>
          <p className="text-xs text-slate-400 mt-1">Inventory is in good shape.</p>
        </div>
      ) : (
        <>
          <div className="space-y-0 max-h-[280px] overflow-y-auto">
            {urgentItems.map((item, idx) => {
              const isExpired = item.urgency === "expired";
              const badgeBg    = isExpired ? "bg-red-100"    : "bg-orange-100";
              const badgeColor = isExpired ? "text-red-600"  : "text-orange-600";
              const dotColor   = isExpired ? "bg-red-500"    : "bg-orange-500";

              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-3 cursor-pointer hover:bg-slate-50 rounded-lg px-1 -mx-1 transition-colors"
                  style={{ borderBottom: idx < urgentItems.length - 1 ? "1px solid #f1f5f9" : "none" }}
                  onClick={() => router.push(`/dashboard/shortlist?review=${item.id}`)}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${dotColor}${isExpired ? " animate-pulse" : ""}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0f172a] truncate" title={item.description}>
                        {item.description}
                      </p>
                      <p className="text-xs text-[#64748b] mt-0.5">
                        {item.category} · {item.pic_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(item.expiry_date).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${badgeBg} ${badgeColor}`}>
                    {item.days_left_display}
                  </span>
                </div>
              );
            })}
          </div>
          {overflow > 0 && (
            <button
              className="mt-3 text-xs text-blue-600 font-medium text-left hover:text-blue-700 transition-colors"
              onClick={() => router.push("/dashboard/shortlist")}
            >
              + {overflow} more critical item{overflow !== 1 ? "s" : ""}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Staff view ────────────────────────────────────────────────────────────────

function StaffView({ staleItems, isLoading, rates, reviewDeadline, router }: StaffProps & { router: ReturnType<typeof useRouter> }) {
  const count = staleItems.length;
  const dayOfWeek = getMYTDayOfWeek();
  const daysUntilSunday = getDaysUntilSunday();
  const nextSunday = reviewDeadline?.nextSunday ?? getNextSundayDisplay();
  const lastSunday = reviewDeadline?.lastSunday ?? getLastSundayDisplay();

  const isThurSat = dayOfWeek >= 4 && dayOfWeek <= 6;
  const isSunday  = dayOfWeek === 0;

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

  const badgeBg    = isSunday ? "#ffedd5" : isThurSat ? "#fef9c3" : "#fee2e2";
  const badgeColor = isSunday ? "#ea580c" : isThurSat ? "#ca8a04" : "#dc2626";
  const badgePulse = isSunday;

  const emptyTitle = isSunday
    ? "All reviewed! Great work"
    : isThurSat
    ? "Looking good — nothing to review yet"
    : "No missed reviews this week";

  const emptySubtitle = isSunday
    ? "Deadline at 11:59 PM MYT tonight"
    : `Next deadline: ${nextSunday}`;

  return (
    <div
      className="rounded-2xl bg-white shadow-sm p-6 flex flex-col"
      style={{ border: "1px solid #e2e8f0" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
            {headerTitle}
          </p>
          <p className="text-xs text-[#94a3b8] mt-0.5">{headerSubtitle}</p>
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

      {/* Deadline badge */}
      {!isLoading && !isSunday && (
        <div className="mb-4 mt-2">
          <span
            className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 font-medium"
            style={{ background: "#eff6ff", color: "#2563eb" }}
          >
            <CalendarDaysIcon className="w-3.5 h-3.5 flex-shrink-0" />
            Next deadline: {nextSunday}
          </span>
        </div>
      )}
      {!isLoading && isSunday && (
        <div className="mb-4 mt-2">
          <span
            className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 font-medium animate-pulse"
            style={{ background: "#ffedd5", color: "#ea580c" }}
          >
            <CalendarDaysIcon className="w-3.5 h-3.5 flex-shrink-0" />
            Deadline tonight at 11:59 PM MYT
          </span>
        </div>
      )}

      {/* Stale items list */}
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
        <div className="space-y-0 max-h-56 overflow-y-auto">
          {staleItems.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 py-3"
              style={{ borderBottom: idx < staleItems.length - 1 ? "1px solid #f1f5f9" : "none" }}
            >
              <div className="flex items-start gap-2 min-w-0">
                <StaleStatusDot urgency={item.urgency} />
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
                onClick={() => router.push(`/dashboard/shortlist?review=${item.id}`)}
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

      {/* Compliance — staff only */}
      <div className="border-t mt-4 pt-4 flex-shrink-0" style={{ borderColor: "#f1f5f9" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "#94a3b8" }}>
          My Review Compliance
        </p>
        <StaffComplianceSection
          rates={rates}
          isLoading={isLoading}
          lastSunday={lastSunday}
          nextSunday={nextSunday}
        />
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function StaleItemsCard(props: Props) {
  const router = useRouter();

  if (props.isManager) {
    return (
      <ManagerView
        urgentItems={props.urgentItems}
        isLoading={props.isLoading}
        router={router}
      />
    );
  }

  return (
    <StaffView
      staleItems={props.staleItems}
      isLoading={props.isLoading}
      rates={props.rates}
      reviewDeadline={props.reviewDeadline}
      router={router}
    />
  );
}
