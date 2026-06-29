"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HealthData } from "@/hooks/useDashboardHealth";
import type { HistoryEntry } from "@/hooks/useHistory";
import { useShortList } from "@/hooks/useShortList";
import { getMalaysiaTime } from "@/lib/sunday-deadline-client";

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
  user: MobileUser | null;
  isManager: boolean;
  stats: Stats | null;
  healthData: HealthData | null;
  healthLoading: boolean;
}

function getGreeting(): string {
  const h = getMalaysiaTime().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDateLong(): string {
  return getMalaysiaTime().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function shortDayMonth(longDate: string | undefined): string {
  if (!longDate) return "—";
  const after = longDate.includes(",")
    ? longDate.split(",")[1]?.trim() ?? longDate
    : longDate;
  return after.split(" ").slice(0, 2).join(" ");
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

type HealthBand = "excellent" | "good" | "needs" | "critical";
function healthBand(score: number): HealthBand {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "needs";
  return "critical";
}

const HEALTH_BANDS: Record<
  HealthBand,
  { label: string; ring: string; pillBg: string; pillColor: string }
> = {
  excellent: { label: "Excellent",       ring: "#16a34a", pillBg: "#dcfce7", pillColor: "#15803d" },
  good:      { label: "Good",            ring: "#1e3a5f", pillBg: "#eef3fa", pillColor: "#1e3a5f" },
  needs:     { label: "Needs Attention", ring: "#ea580c", pillBg: "#fef3c7", pillColor: "#b45309" },
  critical:  { label: "Critical",        ring: "#dc2626", pillBg: "#fee2e2", pillColor: "#b91c1c" },
};

interface StatPillCfg {
  key: keyof Stats;
  label: string;
  bg: string;
  numColor: string;
  labelColor: string;
  urgency: string;
}

const STAT_PILLS: StatPillCfg[] = [
  { key: "expired",  label: "Expired",  bg: "#fef2f2", numColor: "#b91c1c", labelColor: "#dc2626", urgency: "expired"  },
  { key: "critical", label: "Critical", bg: "#fff7ed", numColor: "#c2410c", labelColor: "#ea580c", urgency: "critical" },
  { key: "warning",  label: "Warning",  bg: "#fffbeb", numColor: "#b45309", labelColor: "#ca8a04", urgency: "warning"  },
  { key: "safe",     label: "Safe",     bg: "#f0fdf4", numColor: "#15803d", labelColor: "#16a34a", urgency: "safe"     },
];

const STATUS_PILL: Record<string, { dot: string; bg: string; color: string }> = {
  expired:  { dot: "#dc2626", bg: "#fee2e2", color: "#b91c1c" },
  critical: { dot: "#ea580c", bg: "#ffedd5", color: "#c2410c" },
  warning:  { dot: "#ca8a04", bg: "#fef3c7", color: "#b45309" },
  safe:     { dot: "#16a34a", bg: "#dcfce7", color: "#15803d" },
};

const ACTIVITY_STYLE: Record<string, { color: string; bg: string }> = {
  CREATE: { color: "#15803d", bg: "#f0fdf4" },
  UPDATE: { color: "#1e3a5f", bg: "#eef3fa" },
  DELETE: { color: "#b91c1c", bg: "#fef2f2" },
};
const DEFAULT_ACT_STYLE = { color: "#7c3aed", bg: "#f5f3ff" };

function HealthRing({ score, color }: { score: number; color: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const offset = c * (1 - pct);
  return (
    <svg
      width="104"
      height="104"
      viewBox="0 0 100 100"
      style={{ display: "block" }}
    >
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}

function daysText(daysLeft: number): string {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return "Today!";
  return `${daysLeft}d left`;
}

export default function MobileDashboard({
  user,
  isManager: _isManager,
  stats,
  healthData,
  healthLoading,
}: Props) {
  const router = useRouter();
  const [activity, setActivity] = useState<HistoryEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [visibleAttention, setVisibleAttention] = useState(5);
  const [visibleActivity, setVisibleActivity] = useState(4);
  const { entries: shortlistEntries, isLoading: shortlistLoading } = useShortList();

  useEffect(() => {
    setActivityLoading(true);
    fetch("/api/activity/recent")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setActivity(d.data as HistoryEntry[]);
      })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, []);

  if (!user) return null;

  const firstName = (user.picName || user.username).split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();

  const sh = healthData?.systemHealth;
  const score = sh?.score ?? 0;
  const counts: Stats = sh
    ? {
        expired: sh.expired.count,
        critical: sh.critical.count,
        warning: sh.warning.count,
        safe: sh.safe.count,
      }
    : stats ?? { expired: 0, critical: 0, warning: 0, safe: 0 };
  const urgent = counts.expired + counts.critical + counts.warning;
  const total = urgent + counts.safe;

  const band = healthBand(score);
  const bandCfg = HEALTH_BANDS[band];
  const nextDeadline = shortDayMonth(healthData?.reviewDeadline?.nextSunday);

  const needsAttention = shortlistEntries
    .filter(
      (e) =>
        e.urgency === "expired" ||
        e.urgency === "critical" ||
        e.urgency === "warning",
    )
    .sort((a, b) => a.days_left - b.days_left);

  return (
    <div
      className="md:hidden"
      style={{ background: "#f4f7fb", minHeight: "100vh", overflowX: "hidden", width: "100%" }}
    >
      {/* Header */}
      <div style={{ background: "#fff", padding: "20px 16px 16px", borderBottom: "1px solid #f0f4f8" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                color: "#94a3b8",
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              {getGreeting()},
            </div>
            <div
              style={{
                fontSize: 21,
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
                marginBottom: 6,
                letterSpacing: -0.5,
              }}
            >
              {firstName}
            </div>
            <div
              style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}
            >
              {formatDateLong()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button
              aria-label="Notifications"
              style={{
                position: "relative",
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #eef1f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0f172a"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {urgent > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 9,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#dc2626",
                    border: "1.5px solid #fff",
                  }}
                />
              )}
            </button>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "#1e3a5f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: 0.2,
              }}
            >
              {initial}
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ background: "#fff", padding: "12px 16px", borderBottom: "1px solid #f0f4f8", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
          <button
            onClick={() => router.push("/dashboard/shortlist")}
            style={{
              flex: 1,
              minWidth: 0,
              height: 44,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 16px",
              borderRadius: 999,
              background: "#f4f7fb",
              border: "1px solid #eef1f6",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <span style={{ color: "#94a3b8", fontSize: 13.5, fontWeight: 500 }}>
              Search items, category or PIC...
            </span>
          </button>
          <button
            aria-label="Filter"
            onClick={() => router.push("/dashboard/shortlist")}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#1e3a5f",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M7 12h10M11 18h2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Health Card */}
      <div style={{ padding: "12px 16px 12px" }}>
        {healthLoading ? (
          <div
            className="animate-pulse"
            style={{
              borderRadius: 18,
              height: 132,
              background: "#fff",
              border: "1px solid #f1f5f9",
            }}
          />
        ) : (
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: "16px 18px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
              display: "flex",
              gap: 14,
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: 104,
                height: 104,
                flexShrink: 0,
              }}
            >
              <HealthRing score={score} color={bandCfg.ring} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: "#0f172a",
                    lineHeight: 1,
                    letterSpacing: -1,
                  }}
                >
                  {score}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#94a3b8",
                    fontWeight: 600,
                    marginTop: 3,
                  }}
                >
                  / 100
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0f172a",
                    lineHeight: 1.15,
                  }}
                >
                  Inventory
                  <br />
                  Health
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: bandCfg.pillColor,
                    background: bandCfg.pillBg,
                    padding: "3px 9px",
                    borderRadius: 999,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {bandCfg.label}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}
                >
                  {urgent} item{urgent === 1 ? "" : "s"} need action now
                </div>
                <div
                  style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}
                >
                  {urgent}/{total}
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M3 10h18M8 2v4M16 2v4" />
                </svg>
                <span
                  style={{ fontSize: 11.5, color: "#64748b", fontWeight: 500 }}
                >
                  Next deadline{" "}
                  <strong style={{ color: "#0f172a", fontWeight: 700 }}>
                    {nextDeadline}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stat pills (4 in a row) */}
      <div style={{ padding: "0 16px 18px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {STAT_PILLS.map((c) => (
            <button
              key={c.key}
              onClick={() =>
                router.push(`/dashboard/shortlist?urgency=${c.urgency}`)
              }
              style={{
                background: c.bg,
                borderRadius: 12,
                padding: "10px 6px 11px",
                border: "none",
                cursor: "pointer",
                textAlign: "center",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: c.numColor,
                  lineHeight: 1,
                  marginBottom: 5,
                  letterSpacing: -0.5,
                }}
              >
                {counts[c.key]}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: c.labelColor,
                }}
              >
                {c.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Needs Attention */}
      <div style={{ padding: "0 16px 18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              Needs Attention
            </div>
            {needsAttention.length > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#fff",
                  background: "#b91c1c",
                  borderRadius: 999,
                  padding: "1px 7px",
                }}
              >
                {needsAttention.length}
              </span>
            )}
          </div>
          <button
            onClick={() => router.push("/dashboard/shortlist")}
            style={{
              fontSize: 12,
              color: "#94a3b8",
              fontWeight: 600,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            See all →
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shortlistLoading ? (
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{ background: "#fff", borderRadius: 14, height: 60, border: "1px solid #f1f5f9" }}
              />
            ))
          ) : needsAttention.length === 0 ? (
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "20px 16px",
                border: "1px solid #f1f5f9",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              All clear — no items need attention
            </div>
          ) : (
            <>
              {needsAttention.slice(0, visibleAttention).map((item) => {
                const pill = STATUS_PILL[item.urgency] ?? STATUS_PILL.warning;
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(`/dashboard/shortlist?review=${item.id}`)}
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      padding: "12px 14px",
                      border: "1px solid #f1f5f9",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      textAlign: "left",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
                      fontFamily: "inherit",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: pill.dot,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#0f172a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.description}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          fontWeight: 500,
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.category} · {item.pic_name}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 999,
                        background: pill.bg,
                        color: pill.color,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {daysText(item.days_left)}
                    </div>
                  </button>
                );
              })}
              {visibleAttention < needsAttention.length && (
                <button
                  onClick={() => setVisibleAttention((n) => n + 5)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 14,
                    background: "#f4f7fb",
                    border: "1px solid #eef1f6",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1e3a5f",
                    fontFamily: "inherit",
                  }}
                >
                  Show more ({needsAttention.length - visibleAttention} remaining)
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ padding: "0 16px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
            Recent Activity
          </div>
          <button
            onClick={() => router.push("/dashboard/history-log")}
            style={{
              fontSize: 12,
              color: "#94a3b8",
              fontWeight: 600,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            View all →
          </button>
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #f1f5f9",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
          }}
        >
          {activityLoading ? (
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderTop: i > 0 ? "1px solid #f8fafc" : "none",
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#f1f5f9", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, background: "#f1f5f9", borderRadius: 6, marginBottom: 6, width: "70%" }} />
                  <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, width: "40%" }} />
                </div>
              </div>
            ))
          ) : activity.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
              No recent activity
            </div>
          ) : (
            <>
              {activity.slice(0, visibleActivity).map((entry, idx) => {
                const s = ACTIVITY_STYLE[entry.action] ?? DEFAULT_ACT_STYLE;
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderTop: idx > 0 ? "1px solid #f8fafc" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        flexShrink: 0,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: s.bg,
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "#0f172a",
                          lineHeight: 1.4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={entry.description ?? ""}
                      >
                        {entry.description ?? "—"}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {timeAgo(entry.timestamp)}
                    </div>
                  </div>
                );
              })}
              {visibleActivity < activity.length && (
                <button
                  onClick={() => setVisibleActivity((n) => n + 4)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    background: "#f4f7fb",
                    border: "none",
                    borderTop: "1px solid #f1f5f9",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1e3a5f",
                    fontFamily: "inherit",
                  }}
                >
                  Show more ({activity.length - visibleActivity} remaining)
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Spacer for bottom nav */}
      <div style={{ height: 90 }} />
    </div>
  );
}
