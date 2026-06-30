"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useExpiry } from "@/hooks/useExpiry";
import { useDashboardHealth } from "@/hooks/useDashboardHealth";
import ExpiryForm from "@/components/expiry/ExpiryForm";
import SystemHealthCard from "@/components/dashboard/SystemHealthCard";
import StaleItemsCard from "@/components/dashboard/StaleItemsCard";
import StaffComplianceSection from "@/components/dashboard/StaffComplianceSection";
import CategoryHeatmap from "@/components/dashboard/CategoryHeatmap";
import ResolutionRate from "@/components/dashboard/ResolutionRate";
import MonthlyTrend from "@/components/dashboard/MonthlyTrend";
import WeeklyExpiryChart from "@/components/dashboard/WeeklyExpiryChart";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import type { ExpiryFormData } from "@/hooks/useExpiry";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import MobileDashboard from "@/components/mobile/MobileDashboard";
import { triggerPushSubscription } from "@/lib/usePushNotifications";

interface Stats {
  expired: number;
  critical: number;
  warning: number;
  safe: number;
  push: number;
}

interface WeeklyData {
  week: string;
  expired: number;
  critical: number;
  warning: number;
}

interface Trend {
  expired: number;
  critical: number;
  warning: number;
}

// Pill badge for EXPIRED trend — negative trend = improvement = green
function TrendBadge({ value }: { value: number }) {
  const improved = value <= 0;
  const pct = Math.abs(value);
  if (pct === 0) return null;
  const color  = improved ? "#16a34a" : "#dc2626";
  const bg     = improved ? "#dcfce7" : "#fee2e2";
  const prefix = improved ? "+" : "-";
  return (
    <span
      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}
    >
      {prefix}{pct}%
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: number | null;
  description: string;
  color: string;
  trend?: number;
  rangeLabel?: string;
  onClick?: () => void;
}

function StatCard({ label, value, description, color, trend, rangeLabel, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-white px-4 pt-3 pb-4 md:px-5 md:pt-4 md:pb-5 shadow-sm ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      style={{ border: "1px solid #e2e8f0" }}
    >
      {/* Top row: dot + label / badge */}
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ color }}
          >
            {label}
          </span>
        </div>
        {trend !== undefined ? (
          <TrendBadge value={trend} />
        ) : rangeLabel ? (
          <span className="text-[11px] font-medium text-[#94a3b8]">{rangeLabel}</span>
        ) : null}
      </div>

      {/* Big number */}
      <p
        className="font-black leading-none text-[32px] md:text-[46px]"
        style={{ color }}
      >
        {value === null ? (
          <span className="inline-block w-10 h-7 md:w-12 md:h-9 bg-[#f1f5f9] animate-pulse rounded" />
        ) : (
          value
        )}
      </p>

      {/* Description */}
      <p className="text-[11px] md:text-xs font-medium text-[#94a3b8] mt-1.5 md:mt-2">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isManager } = useAuth();
  const { addEntry, refresh } = useExpiry();
  const { toasts, showSuccess, dismiss } = useToast();
  const { healthData, isLoading: healthLoading } = useDashboardHealth();
  const { analyticsData, analyticsLoading } = useDashboardAnalytics(isManager);

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<Trend | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [desktopNotifPermission, setDesktopNotifPermission] = useState<NotificationPermission | null>(null);
  const [desktopBannerDismissed, setDesktopBannerDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) setDesktopNotifPermission(Notification.permission);
    setDesktopBannerDismissed(sessionStorage.getItem("push_banner_dismissed") === "1");
  }, []);

  const fetchStats = useCallback(() => {
    fetch("/api/expiry/stats")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data?.success) {
          setStats(data.data);
          setStatsError(false);
        } else setStatsError(true);
      })
      .catch(() => setStatsError(true));
  }, []);

  const fetchWeekly = useCallback(() => {
    setWeeklyLoading(true);
    fetch("/api/dashboard/weekly")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data?.success) {
          setWeeklyData(data.weeks);
          setWeeklyTrend(data.trend);
        }
      })
      .catch(() => {})
      .finally(() => setWeeklyLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
    fetchWeekly();
  }, [fetchStats, fetchWeekly]);

  async function handleAddEntry(data: ExpiryFormData) {
    await addEntry(data);
    setFormOpen(false);
    fetchStats();
    fetchWeekly();
  }

  return (
    <>
      {/* Mobile dashboard — below md */}
      <MobileDashboard
        user={user}
        isManager={isManager}
        stats={stats}
        healthData={healthData}
        healthLoading={healthLoading}
        onOpenForm={() => setFormOpen(true)}
      />

      {/* Desktop dashboard — md and up */}
      <div className="hidden md:block space-y-4">

      {/* Enable Notifications banner — desktop Chrome, not yet asked */}
      {!desktopBannerDismissed && desktopNotifPermission === "default" && (
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "#eef3fa", border: "1px solid #bfdbfe" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-[#1d4ed8]">Enable Notifications</span>
            <span className="text-sm text-[#3b82f6] font-medium ml-2">Get alerted when items need action</span>
          </div>
          <button
            onClick={async () => {
              const granted = await triggerPushSubscription();
              if (granted) setDesktopNotifPermission("granted");
            }}
            className="flex-shrink-0 text-sm font-bold text-white px-4 py-1.5 rounded-lg"
            style={{ background: "#1d4ed8" }}
          >
            Enable
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem("push_banner_dismissed", "1");
              setDesktopBannerDismissed(true);
            }}
            className="flex-shrink-0 text-sm font-semibold text-[#1d4ed8] px-3 py-1.5 rounded-lg border border-[#bfdbfe]"
          >
            Later
          </button>
        </div>
      )}

      {/* Quick Log banner — staff only */}
      {!isManager && (
        <div
          className="rounded-2xl px-4 py-4 md:px-6 md:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4"
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
            boxShadow: "0 4px 20px rgba(37,99,235,0.30)",
          }}
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div
              className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.18)" }}
            >
              <ClipboardDocumentListIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm md:text-base font-bold text-white">Log New Expiry Entry</p>
              <p className="text-xs md:text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>
                Record a short-expiry item for your outlet inventory
              </p>
            </div>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            className="flex-shrink-0 flex items-center justify-center gap-2 font-semibold text-[#2563eb] transition-colors text-sm md:text-base px-5 py-2.5 md:px-[22px] md:py-[10px]"
            style={{
              background: "white",
              borderRadius: "12px",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#eff6ff")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "white")
            }
          >
            <PlusIcon className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      )}

      {/* Stat cards */}
      {statsError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Failed to load expiry stats. Please refresh.
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4">
            <StatCard
              label="EXPIRED"
              value={stats?.expired ?? null}
              description="Past expiry date"
              color="#ef4444"
              trend={weeklyTrend?.expired}
            />
            <StatCard
              label="CRITICAL"
              value={stats?.critical ?? null}
              description="Expiring within 3 months"
              color="#ea580c"
              rangeLabel="3 mo"
            />
            <StatCard
              label="WARNING"
              value={stats?.warning ?? null}
              description="3 to 8 months left"
              color="#d97706"
              rangeLabel="3–8 mo"
            />
            <StatCard
              label="SAFE"
              value={stats?.safe ?? null}
              description="More than 8 months left"
              color="#16a34a"
              rangeLabel="8 mo+"
            />
            <StatCard
              label="PUSH ITEMS"
              value={stats?.push ?? null}
              description="Manager-flagged for priority sales"
              color="#7c3aed"
              onClick={() => {
                window.location.href = "/dashboard/shortlist?tab=push";
              }}
            />
          </div>
          {!isManager && (
            <p className="text-xs text-[#94a3b8] text-right mt-2">
              Showing your items only
            </p>
          )}
        </div>
      )}

      {/* INVENTORY HEALTH */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#94a3b8]">
          Inventory Health
        </p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
          <SystemHealthCard
            data={healthData?.systemHealth ?? null}
            isLoading={healthLoading}
            isManager={isManager}
          />
          {isManager ? (
            <StaleItemsCard
              isManager={true}
              urgentItems={healthData?.urgentItems ?? []}
              isLoading={healthLoading}
            />
          ) : (
            <StaleItemsCard
              isManager={false}
              staleItems={healthData?.staleItems ?? []}
              isLoading={healthLoading}
              rates={healthData?.completionRates ?? []}
              reviewDeadline={healthData?.reviewDeadline}
            />
          )}
        </div>
      </div>

      {/* Staff Overview — manager only */}
      {isManager && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#94a3b8] mb-3 mt-6">
            Staff Overview
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
            <StaffComplianceSection
              completionRates={healthData?.completionRates ?? []}
              weekRange={healthData?.reviewDeadline ?? { lastSunday: "—", nextSunday: "—" }}
              isLoading={healthLoading}
            />
            <MonthlyTrend
              data={analyticsData?.monthlyTrend ?? []}
              isLoading={analyticsLoading}
            />
          </div>
        </div>
      )}

      {/* Analytics section — manager only */}
      {isManager && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#94a3b8] mb-3 mt-6">
            Analytics
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <CategoryHeatmap
              data={analyticsData?.categoryHeatmap ?? []}
              isLoading={analyticsLoading}
            />
            <ResolutionRate
              data={analyticsData?.resolutionRate ?? null}
              isLoading={analyticsLoading}
            />
          </div>
        </>
      )}

      {/* Weekly chart */}
      <WeeklyExpiryChart data={weeklyData} isLoading={weeklyLoading} />

      </div>{/* end hidden md:block */}

      {/* Shared: ExpiryForm modal + Toast (used by both mobile FAB and desktop banner) */}
      <ExpiryForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        editingEntry={null}
        picName={user?.picName ?? user?.username ?? ""}
        onSubmit={handleAddEntry}
        onAddStockSuccess={({ additionalQty, newQty }) => {
          setFormOpen(false);
          refresh();
          fetchStats();
          showSuccess(`Stock updated! +${additionalQty} unit(s) added. New total: ${newQty} units`);
        }}
      />
      <Toast toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
