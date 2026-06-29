"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HealthData } from "@/hooks/useDashboardHealth";
import type { HistoryEntry } from "@/hooks/useHistory";
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

function formatTopDate(): string {
  return getMalaysiaTime()
    .toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .replace(",", " ·");
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

const ACTIVITY_STYLE: Record<string, { color: string; bg: string }> = {
  CREATE: { color: "#15803d", bg: "#f0fdf4" },
  UPDATE: { color: "#1e3a5f", bg: "#eef3fa" },
  DELETE: { color: "#b91c1c", bg: "#fef2f2" },
};
const DEFAULT_ACT_STYLE = { color: "#7c3aed", bg: "#f5f3ff" };

function healthGradient(score: number): string {
  if (score >= 80) return "linear-gradient(135deg,#15803d,#166534)";
  if (score >= 60) return "linear-gradient(135deg,#1e3a5f,#2d5490)";
  if (score >= 40) return "linear-gradient(135deg,#92400e,#b45309)";
  return "linear-gradient(135deg,#991b1b,#b91c1c)";
}

function healthLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good Standing";
  if (score >= 40) return "Needs Attention";
  return "Critical Risk";
}

interface StatCardCfg {
  key: keyof Stats;
  label: string;
  bg: string;
  iconBg: string;
  iconColor: string;
  numColor: string;
  labelColor: string;
  urgency: string;
  iconPath: React.ReactNode;
}

const STAT_CARDS: StatCardCfg[] = [
  {
    key: "expired",
    label: "Expired",
    bg: "#fef2f2",
    iconBg: "#fee2e2",
    iconColor: "#b91c1c",
    numColor: "#b91c1c",
    labelColor: "#dc2626",
    urgency: "expired",
    iconPath: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </>
    ),
  },
  {
    key: "critical",
    label: "Critical",
    bg: "#fff7ed",
    iconBg: "#ffedd5",
    iconColor: "#c2410c",
    numColor: "#c2410c",
    labelColor: "#ea580c",
    urgency: "critical",
    iconPath: (
      <>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
  },
  {
    key: "warning",
    label: "Warning",
    bg: "#fffbeb",
    iconBg: "#fef3c7",
    iconColor: "#b45309",
    numColor: "#b45309",
    labelColor: "#ca8a04",
    urgency: "warning",
    iconPath: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </>
    ),
  },
  {
    key: "safe",
    label: "Safe",
    bg: "#f0fdf4",
    iconBg: "#dcfce7",
    iconColor: "#15803d",
    numColor: "#15803d",
    labelColor: "#16a34a",
    urgency: "safe",
    iconPath: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
];

export default function MobileDashboard({
  user,
  isManager: _isManager,
  stats,
  healthData,
  healthLoading,
}: Props) {
  const router = useRouter();
  const [activity, setActivity] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    fetch("/api/history?limit=4&page=1")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setActivity((d.data as HistoryEntry[]).slice(0, 4));
      })
      .catch(() => {});
  }, []);

  if (!user) return null;

  const firstName = (user.picName || user.username).split(" ")[0];
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

  const myRate = healthData?.completionRates?.[0];
  const stale = healthData?.staleItems ?? [];
  const itemsDue = stale.length;
  const overdue = stale.filter(
    (s) => s.urgency === "missed" || s.urgency === "critical",
  ).length;
  const completionPct = myRate?.completion_rate ?? 0;

  return (
    <div className="md:hidden" style={{ background: "#f4f7fb", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          background: "#fff",
          padding: "20px 20px 18px",
          borderBottom: "1px solid #f0f4f8",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.2,
                color: "#94a3b8",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {formatTopDate()}
            </div>
            <div
              style={{
                fontSize: 21,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: -0.5,
                lineHeight: 1.2,
              }}
            >
              {getGreeting()},
              <br />
              {firstName} 👋
            </div>
          </div>
          <button
            aria-label="Notifications"
            className="relative flex-shrink-0"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#1e3a5f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
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
                  top: 2,
                  right: 2,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "#dc2626",
                  border: "1.5px solid #fff",
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Health Score Card */}
      <div style={{ padding: "16px 16px 0", background: "#fff" }}>
        {healthLoading ? (
          <div
            className="animate-pulse"
            style={{ borderRadius: 20, height: 138, background: "#f1f5f9" }}
          />
        ) : (
          <div
            style={{
              borderRadius: 20,
              padding: "22px 22px 18px",
              position: "relative",
              overflow: "hidden",
              background: healthGradient(score),
            }}
          >
            <div
              style={{
                position: "absolute",
                right: -20,
                top: -20,
                width: 130,
                height: 130,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.07)",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 70,
                bottom: -36,
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
              }}
            />
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.6,
                color: "rgba(255,255,255,0.55)",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Inventory Health Score
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 4,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1,
                  letterSpacing: -3,
                }}
              >
                {score}
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: 9,
                  paddingLeft: 2,
                }}
              >
                /100
              </span>
            </div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "rgba(255,255,255,0.8)",
                marginBottom: 14,
              }}
            >
              {healthLabel(score)} · {urgent} items need action
            </div>
            <div
              style={{
                height: 5,
                background: "rgba(255,255,255,0.15)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "rgba(255,255,255,0.85)",
                  borderRadius: 3,
                  width: `${score}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2x2 stat cards */}
      <div style={{ padding: "12px 16px 0", background: "#fff" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {STAT_CARDS.map((c) => (
            <button
              key={c.key}
              onClick={() =>
                router.push(`/dashboard/shortlist?urgency=${c.urgency}`)
              }
              style={{
                background: c.bg,
                borderRadius: 16,
                padding: "14px 15px",
                border: "none",
                minHeight: 100,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: c.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={c.iconColor}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {c.iconPath}
                  </svg>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={c.iconColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: c.numColor,
                  letterSpacing: -1.5,
                  lineHeight: 1,
                }}
              >
                {counts[c.key]}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: c.labelColor,
                  marginTop: 3,
                }}
              >
                {c.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 12, background: "#fff" }} />

      {/* Weekly review */}
      <div style={{ background: "#fff", padding: "16px 16px 18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a" }}>
            Items to Review This Week
          </div>
          <button
            onClick={() => router.push("/dashboard/shortlist")}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#1e3a5f",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            See all
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 7,
              background: "#f1f5f9",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${completionPct}%`,
                height: "100%",
                background: "linear-gradient(90deg,#1e3a5f,#3d6fa3)",
                borderRadius: 4,
              }}
            />
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#1e3a5f",
              whiteSpace: "nowrap",
            }}
          >
            {completionPct}%
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
              style={{ fontSize: 12.5, color: "#64748b", fontWeight: 500 }}
            >
              {itemsDue} item{itemsDue !== 1 ? "s" : ""} due this week
            </span>
          </div>
          {overdue > 0 && (
            <span style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>
              {overdue} overdue
            </span>
          )}
        </div>
      </div>

      <div style={{ height: 8, background: "#f4f7fb" }} />

      {/* Recent activity */}
      <div style={{ background: "#fff", paddingBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 16px 10px",
          }}
        >
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a" }}>
            Recent Activity
          </div>
          <button
            onClick={() => router.push("/dashboard/history-log")}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#1e3a5f",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            View all
          </button>
        </div>
        {activity.length === 0 ? (
          <div
            style={{
              padding: "8px 16px 20px",
              fontSize: 12.5,
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            No recent activity
          </div>
        ) : (
          activity.map((entry) => {
            const s = ACTIVITY_STYLE[entry.action] ?? DEFAULT_ACT_STYLE;
            return (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderTop: "1px solid #f8fafc",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: s.bg,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: s.color,
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
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
                <div
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {timeAgo(entry.timestamp)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Spacer for bottom nav */}
      <div style={{ height: 90 }} />
    </div>
  );
}
