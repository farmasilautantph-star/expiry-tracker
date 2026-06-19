"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useExpiry } from "@/hooks/useExpiry";
import { useDashboardHealth } from "@/hooks/useDashboardHealth";
import ExpiryForm from "@/components/expiry/ExpiryForm";
import SystemHealthCard from "@/components/dashboard/SystemHealthCard";
import StaleItemsCard from "@/components/dashboard/StaleItemsCard";
import CompletionRateCard from "@/components/dashboard/CompletionRateCard";
import WeeklyExpiryChart from "@/components/dashboard/WeeklyExpiryChart";
import type { ExpiryFormData } from "@/hooks/useExpiry";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

interface Stats {
  expired: number;
  critical: number;
  warning: number;
  safe: number;
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

interface StatCardProps {
  label: string;
  value: number | null;
  description: string;
  color: string;
  trend?: number;
  trendInverse?: boolean;
}

function TrendBadge({ value, inverse = false }: { value: number; inverse?: boolean }) {
  const isUp = value > 0;
  const isGood = inverse ? isUp : !isUp;
  const color = value === 0 ? "#94a3b8" : isGood ? "#16a34a" : "#dc2626";
  const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "—";
  return (
    <span className="text-xs font-bold flex items-center gap-0.5" style={{ color }}>
      {arrow} {Math.abs(value)}%
    </span>
  );
}

function StatCard({ label, value, description, color, trend, trendInverse }: StatCardProps) {
  return (
    <div
      className="rounded-2xl bg-white p-5 shadow-sm relative"
      style={{
        border: "1px solid #e2e8f0",
        borderBottom: `4px solid ${color}`,
      }}
    >
      {trend !== undefined && (
        <div className="absolute top-4 right-4">
          <TrendBadge value={trend} inverse={trendInverse} />
        </div>
      )}
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.1em]"
        style={{ color }}
      >
        {label}
      </p>
      <p
        className="font-black leading-none mt-2"
        style={{ fontSize: "48px", color }}
      >
        {value === null ? (
          <span className="inline-block w-12 h-10 bg-[#f1f5f9] animate-pulse rounded" />
        ) : (
          value
        )}
      </p>
      <p className="text-xs font-medium text-[#94a3b8] mt-2">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isManager } = useAuth();
  const { addEntry } = useExpiry();
  const { healthData, isLoading: healthLoading } = useDashboardHealth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<Trend | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

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
    <div className="space-y-6">
      {/* Quick Log card */}
      <div
        className="rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)",
          boxShadow: "0 4px 16px rgba(37,99,235,0.25)",
        }}
      >
        <div className="flex items-center gap-4">
          <ClipboardDocumentListIcon className="w-6 h-6 text-white flex-shrink-0" />
          <div>
            <p className="text-base font-bold text-white">Log New Expiry Entry</p>
            <p className="text-sm text-[#bfdbfe] mt-0.5">
              Record a short-expiry item for your outlet inventory
            </p>
          </div>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex-shrink-0 flex items-center justify-center gap-2 font-semibold text-[#2563eb] transition-colors"
          style={{
            background: "white",
            borderRadius: "10px",
            padding: "10px 20px",
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

      {/* Stat cards */}
      {statsError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Failed to load expiry stats. Please refresh.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
            trend={weeklyTrend?.critical}
          />
          <StatCard
            label="WARNING"
            value={stats?.warning ?? null}
            description="3 to 8 months left"
            color="#d97706"
            trend={weeklyTrend?.warning}
          />
          <StatCard
            label="SAFE"
            value={stats?.safe ?? null}
            description="More than 8 months left"
            color="#16a34a"
            trendInverse
          />
        </div>
      )}

      {/* Priority row: System Health | Items Needing Review | Completion Rate */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SystemHealthCard
          data={healthData?.systemHealth ?? null}
          isLoading={healthLoading}
        />
        <StaleItemsCard
          items={healthData?.staleItems ?? []}
          isLoading={healthLoading}
        />
        <CompletionRateCard
          rates={healthData?.completionRates ?? []}
          isManager={isManager}
          isLoading={healthLoading}
        />
      </div>

      {/* Weekly chart */}
      <WeeklyExpiryChart data={weeklyData} isLoading={weeklyLoading} />

      {/* ExpiryForm modal */}
      <ExpiryForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        editingEntry={null}
        picName={user?.picName ?? user?.username ?? ""}
        onSubmit={handleAddEntry}
      />
    </div>
  );
}
