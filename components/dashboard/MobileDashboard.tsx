"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HealthData } from "@/hooks/useDashboardHealth";
import type { HistoryEntry } from "@/hooks/useHistory";
import {
  getMalaysiaTime,
  getDaysUntilSunday,
  getNextSundayDisplay,
} from "@/lib/sunday-deadline-client";

interface MobileUser {
  username: string;
  picName?: string | null;
  role: string;
}

interface Stats {
  expired: number;
  critical: number;
  warning: number;
  safe: number;
}

interface Props {
  user: MobileUser;
  isManager: boolean;
  stats: Stats | null;
  healthData: HealthData | null;
  healthLoading: boolean;
  onOpenForm: () => void;
}

function getGreeting(): string {
  const h = getMalaysiaTime().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function getMYTDayOfWeek(): number {
  return getMalaysiaTime().getDay();
}

function formatTodayMYT(): string {
  return getMalaysiaTime().toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const ACTION_STYLE: Record<string, { bg: string; color: string }> = {
  CREATE: { bg: "#dcfce7", color: "#16a34a" },
  UPDATE: { bg: "#dbeafe", color: "#2563eb" },
  DELETE: { bg: "#fee2e2", color: "#dc2626" },
};

const STAT_CHIPS = [
  { label: "Expired",  key: "expired"  as const, color: "#ef4444", bg: "#fee2e2", urgency: "expired" },
  { label: "Critical", key: "critical" as const, color: "#ea580c", bg: "#ffedd5", urgency: "critical" },
  { label: "Warning",  key: "warning"  as const, color: "#d97706", bg: "#fef9c3", urgency: "warning" },
  { label: "Safe",     key: "safe"     as const, color: "#16a34a", bg: "#dcfce7", urgency: "safe" },
];

export default function MobileDashboard({
  user,
  isManager,
  stats,
  healthData,
  healthLoading,
  onOpenForm,
}: Props) {
  const router = useRouter();
  const [healthExpanded, setHealthExpanded] = useState(false);
  const [recentActivity, setRecentActivity] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!isManager) return;
    fetch("/api/history?limit=3&page=1")
      .then((r) => r.json())
      .then((d) => { if (d.success) setRecentActivity((d.data as HistoryEntry[]).slice(0, 3)); })
      .catch(() => {});
  }, [isManager]);

  const dayOfWeek = getMYTDayOfWeek();
  const isSunday = dayOfWeek === 0;
  const isThurSat = dayOfWeek >= 4;

  const staleItems = healthData?.staleItems ?? [];
  const completionRates = healthData?.completionRates ?? [];
  const myRate = completionRates[0] ?? null;
  const urgentItems = healthData?.urgentItems ?? [];
  const health = healthData?.systemHealth ?? null;
  const nextSunday = healthData?.reviewDeadline?.nextSunday ?? getNextSundayDisplay();
  const daysUntilSunday = getDaysUntilSunday();

  const firstName = (user.picName || user.username).split(" ")[0];
  const reviewedItems = myRate?.reviewed_on_time ?? 0;
  const totalItems = myRate?.total ?? 0;
  const allReviewed = staleItems.length === 0;

  // Hero card appearance based on day + state
  let heroBg = "#eff6ff";
  let heroBorder = "#bfdbfe";
  let heroTitleColor = "#1e40af";
  let heroTitle = `${staleItems.length} item${staleItems.length !== 1 ? "s" : ""} to review this week`;
  let heroSubtitle = `Deadline: ${nextSunday}`;

  if (isSunday && !allReviewed) {
    heroBg = "#fff1f2"; heroBorder = "#fecdd3"; heroTitleColor = "#be123c";
    heroTitle = "⏰ Review Deadline Tonight";
    heroSubtitle = "Must complete by 11:59 PM MYT";
  } else if (isThurSat && !allReviewed) {
    heroBg = "#fffbeb"; heroBorder = "#fde68a"; heroTitleColor = "#92400e";
    heroTitle = `📋 ${staleItems.length} Item${staleItems.length !== 1 ? "s" : ""} Need Review`;
    heroSubtitle = `${daysUntilSunday} day${daysUntilSunday !== 1 ? "s" : ""} until Sunday deadline`;
  } else if (allReviewed) {
    heroBg = "#f0fdf4"; heroBorder = "#bbf7d0"; heroTitleColor = "#14532d";
    heroTitle = "✅ All caught up!";
    heroSubtitle = `Next deadline: ${nextSunday}`;
  }

  return (
    <div className="md:hidden">
      {/* ── SECTION 1: Greeting ──────────────────────────── */}
      <div className="mb-4">
        <p className="text-[13px] font-medium" style={{ color: "#94a3b8" }}>
          {getGreeting()},
        </p>
        <p className="text-[22px] font-extrabold leading-tight" style={{ color: "#0f172a" }}>
          {firstName}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "#cbd5e1" }}>
          {formatTodayMYT()}
        </p>
      </div>

      <div className="space-y-3">
        {/* ── SECTION 2: Review compliance (staff) / Team monitor (manager) ── */}
        {!isManager ? (
          healthLoading ? (
            <div className="h-36 rounded-2xl animate-pulse" style={{ background: "#f1f5f9" }} />
          ) : (
            <div
              className="rounded-2xl p-4"
              style={{ background: heroBg, border: `1.5px solid ${heroBorder}` }}
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div>
                  <p className="text-[14px] font-extrabold leading-tight" style={{ color: heroTitleColor }}>
                    {heroTitle}
                  </p>
                  <p className="text-[11px] font-medium mt-0.5" style={{ color: heroTitleColor, opacity: 0.72 }}>
                    {heroSubtitle}
                  </p>
                </div>
                {!allReviewed && staleItems.length > 0 && (
                  <span className="text-[24px] font-black leading-none flex-shrink-0" style={{ color: heroTitleColor }}>
                    {staleItems.length}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {myRate && totalItems > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-[10.5px] font-semibold mb-1" style={{ color: heroTitleColor, opacity: 0.78 }}>
                    <span>{reviewedItems} of {totalItems} reviewed</span>
                    <span>{myRate.completion_rate}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.09)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${myRate.completion_rate}%`, background: heroTitleColor }}
                    />
                  </div>
                </div>
              )}

              {/* Stale item list (up to 3) */}
              {staleItems.length > 0 && (
                <div className="space-y-1.5">
                  {staleItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2"
                      style={{ background: "rgba(255,255,255,0.62)" }}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[12px] font-bold truncate"
                          style={{ color: "#0f172a" }}
                          title={item.description}
                        >
                          {item.description}
                        </p>
                        <p className="text-[10.5px]" style={{ color: "#64748b" }}>{item.category}</p>
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/shortlist?review=${item.id}`)}
                        className="flex-shrink-0 text-[11.5px] font-bold whitespace-nowrap"
                        style={{ color: heroTitleColor }}
                      >
                        Review →
                      </button>
                    </div>
                  ))}
                  {staleItems.length > 3 && (
                    <button
                      onClick={() => router.push("/dashboard/shortlist")}
                      className="w-full text-center text-[11.5px] font-semibold pt-1"
                      style={{ color: heroTitleColor }}
                    >
                      View all {staleItems.length} items →
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        ) : (
          /* Manager: team urgent items */
          healthLoading ? (
            <div className="h-20 rounded-2xl animate-pulse" style={{ background: "#f1f5f9" }} />
          ) : (
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{
                background: urgentItems.length > 0 ? "#fff1f2" : "#f0fdf4",
                border: `1.5px solid ${urgentItems.length > 0 ? "#fecdd3" : "#bbf7d0"}`,
              }}
            >
              <div>
                <p
                  className="text-[14px] font-extrabold"
                  style={{ color: urgentItems.length > 0 ? "#be123c" : "#14532d" }}
                >
                  {urgentItems.length > 0
                    ? `⚠ ${urgentItems.length} Urgent Item${urgentItems.length !== 1 ? "s" : ""}`
                    : "✅ Inventory Clear"}
                </p>
                <p
                  className="text-[11px] font-medium mt-0.5"
                  style={{ color: urgentItems.length > 0 ? "#be123c" : "#14532d", opacity: 0.72 }}
                >
                  {urgentItems.length > 0
                    ? "Expired or critical items across team"
                    : "No expired or critical items"}
                </p>
              </div>
              <button
                onClick={() => router.push("/dashboard/shortlist")}
                className="text-[12px] font-bold ml-3 flex-shrink-0"
                style={{ color: urgentItems.length > 0 ? "#be123c" : "#14532d" }}
              >
                View →
              </button>
            </div>
          )
        )}

        {/* ── SECTION 3: Quick stats chips ─────────────────── */}
        <div>
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            {STAT_CHIPS.map((chip) => (
              <button
                key={chip.urgency}
                onClick={() => router.push(`/dashboard/shortlist?urgency=${chip.urgency}`)}
                className="flex-shrink-0 flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-bold whitespace-nowrap"
                style={{ background: chip.bg, color: chip.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: chip.color }} />
                {stats ? `${stats[chip.key]} ${chip.label}` : chip.label}
              </button>
            ))}
          </div>
          {!isManager && (
            <p className="text-[10px] mt-1.5 pl-1" style={{ color: "#94a3b8" }}>Your items only</p>
          )}
        </div>

        {/* ── SECTION 4: Recent activity (manager only) ───── */}
        {isManager && recentActivity.length > 0 && (
          <div
            className="rounded-2xl bg-white p-4"
            style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                Recent Activity
              </p>
              <button
                onClick={() => router.push("/dashboard/history-log")}
                className="text-[11.5px] font-semibold"
                style={{ color: "#1e3a5f" }}
              >
                View all →
              </button>
            </div>
            <div className="space-y-0">
              {recentActivity.map((entry, idx) => {
                const ac = ACTION_STYLE[entry.action] ?? ACTION_STYLE.CREATE;
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2.5 py-2.5"
                    style={{
                      borderBottom: idx < recentActivity.length - 1 ? "1px solid #f1f5f9" : "none",
                    }}
                  >
                    <span
                      className="mt-0.5 flex-shrink-0 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded"
                      style={{ background: ac.bg, color: ac.color }}
                    >
                      {entry.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[12px] font-semibold truncate"
                        style={{ color: "#334155" }}
                        title={entry.description ?? ""}
                      >
                        {entry.description ?? "—"}
                      </p>
                      <p className="text-[10.5px] mt-0.5" style={{ color: "#94a3b8" }}>
                        {timeAgo(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SECTION 5: Health score (collapsible) ────────── */}
        {health && (
          <div
            className="rounded-2xl bg-white overflow-hidden"
            style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}
          >
            <button
              onClick={() => setHealthExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px] font-black text-white flex-shrink-0"
                  style={{ background: health.color }}
                >
                  {health.score}
                </div>
                <div className="text-left">
                  <span className="text-[12px] font-semibold" style={{ color: "#334155" }}>
                    System Health
                  </span>
                  <span className="ml-1.5 text-[12px] font-bold" style={{ color: health.color }}>
                    · {health.label}
                  </span>
                </div>
              </div>
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"
                className="flex-shrink-0 transition-transform duration-200"
                style={{ transform: healthExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {healthExpanded && (
              <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "#f1f5f9" }}>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: "Expired",  count: health.expired.count,  adj: -health.expired.penalty,  color: "#ef4444" },
                    { label: "Critical", count: health.critical.count, adj: -health.critical.penalty, color: "#ea580c" },
                    { label: "Warning",  count: health.warning.count,  adj: -health.warning.penalty,  color: "#d97706" },
                    { label: "Safe",     count: health.safe.count,     adj: +health.safe.bonus,       color: "#16a34a" },
                  ].map((row) => (
                    <div key={row.label} className="rounded-xl px-3 py-2" style={{ background: "#f8fafc" }}>
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: row.color }}>{row.label}</p>
                      <p className="text-[20px] font-black leading-tight" style={{ color: row.color }}>{row.count}</p>
                      <p className="text-[10px]" style={{ color: "#94a3b8" }}>
                        {row.adj >= 0 ? `+${row.adj}` : row.adj} pts
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: "#94a3b8" }}>
                    {health.totalActive} active items
                  </span>
                  <span className="text-[15px] font-black" style={{ color: health.color }}>
                    {health.score}/100
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spacer above FAB */}
        <div className="h-20" />
      </div>

      {/* ── FAB ─────────────────────────────────────────────── */}
      <button
        onClick={onOpenForm}
        aria-label="Log new expiry entry"
        className="fixed z-50 flex items-center justify-center"
        style={{
          bottom: "calc(74px + env(safe-area-inset-bottom) + 16px)",
          right: "20px",
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#1e3a5f",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 18px rgba(30,58,95,0.42)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
