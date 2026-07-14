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
import SystemImpact from "@/components/dashboard/SystemImpact";
import MonthlyTrend from "@/components/dashboard/MonthlyTrend";
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

export default function DashboardPage() {
  const { user, isManager } = useAuth();
  const { addEntry, refresh } = useExpiry();
  const { toasts, showSuccess, dismiss } = useToast();
  const { healthData, isLoading: healthLoading } = useDashboardHealth();
  const { analyticsData, analyticsLoading } = useDashboardAnalytics(isManager);

  const [stats, setStats] = useState<Stats | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingOffersCount, setPendingOffersCount] = useState<number | null>(null);
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
        if (data?.success) setStats(data.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!isManager) return;
    fetch("/api/offers")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.data)) {
          const count = (d.data as Array<{ offer_status: string }>).filter(
            (o) => o.offer_status === "offered",
          ).length;
          setPendingOffersCount(count);
        }
      })
      .catch(() => {});
  }, [isManager]);

  async function handleAddEntry(data: ExpiryFormData) {
    await addEntry(data);
    setFormOpen(false);
    fetchStats();
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
        analyticsData={analyticsData}
        analyticsLoading={analyticsLoading}
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

      {/* Manager quick actions — Push Items + Pending Offers */}
      {isManager && (
        <div className="flex gap-3">
          <button
            onClick={() => window.location.href = "/dashboard/push-items"}
            className="flex-1 flex items-center gap-3 rounded-2xl px-5 py-4 text-left transition-shadow hover:shadow-md"
            style={{ background: "linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)", boxShadow: "0 4px 16px rgba(109,40,217,0.25)" }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.18)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Push Items</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>Items flagged for outlet push</p>
            </div>
            {(stats?.push ?? 0) > 0 && (
              <span className="flex-shrink-0 min-w-[28px] h-7 rounded-full bg-white text-[#6d28d9] text-xs font-black flex items-center justify-center px-2">
                {stats!.push}
              </span>
            )}
          </button>
          <button
            onClick={() => window.location.href = "/dashboard/offers"}
            className="flex-1 flex items-center gap-3 rounded-2xl px-5 py-4 text-left transition-shadow hover:shadow-md"
            style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#eef3fa" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12V22H4V12" />
                <path d="M22 7H2v5h20V7z" />
                <path d="M12 22V7" />
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#0f172a]">Pending Offers</p>
              <p className="text-xs text-[#94a3b8] mt-0.5">Offers awaiting outlet response</p>
            </div>
            {(pendingOffersCount ?? 0) > 0 && (
              <span className="flex-shrink-0 min-w-[28px] h-7 rounded-full text-xs font-black flex items-center justify-center px-2" style={{ background: "#1d4ed8", color: "#fff" }}>
                {pendingOffersCount}
              </span>
            )}
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

      {/* System Impact — manager only */}
      {isManager && (
        <div className="mt-6">
          <SystemImpact
            data={analyticsData?.systemImpact ?? null}
            isLoading={analyticsLoading}
          />
        </div>
      )}

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
          <CategoryHeatmap
            data={analyticsData?.categoryHeatmap ?? []}
            isLoading={analyticsLoading}
          />
        </>
      )}

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
