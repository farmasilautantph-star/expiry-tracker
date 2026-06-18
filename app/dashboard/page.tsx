"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useExpiry } from "@/hooks/useExpiry";
import { useDashboardHealth } from "@/hooks/useDashboardHealth";
import ExpiryForm from "@/components/expiry/ExpiryForm";
import SystemHealthCard from "@/components/dashboard/SystemHealthCard";
import StaleItemsCard from "@/components/dashboard/StaleItemsCard";
import CompletionRateCard from "@/components/dashboard/CompletionRateCard";
import type { ExpiryFormData } from "@/hooks/useExpiry";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface Stats {
  expired: number;
  critical: number;
  warning: number;
  safe: number;
}

interface StatCardProps {
  label: string;
  value: number | null;
  description: string;
  topBorderColor: string;
  gradientBg: string;
  labelColor: string;
  valueColor: string;
  iconBg: string;
  icon: React.ReactNode;
}

function StatCard({
  label,
  value,
  description,
  topBorderColor,
  gradientBg,
  labelColor,
  valueColor,
  iconBg,
  icon,
}: StatCardProps) {
  return (
    <div
      className="rounded-2xl p-5 min-h-[120px] shadow-sm"
      style={{
        background: gradientBg,
        borderTop: `4px solid ${topBorderColor}`,
        border: `1px solid #e2e8f0`,
        borderTopColor: topBorderColor,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: labelColor }}
        >
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color: topBorderColor }}
        >
          {icon}
        </div>
      </div>
      <p
        className="font-black leading-none"
        style={{ fontSize: "48px", color: valueColor }}
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

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function handleAddEntry(data: ExpiryFormData) {
    await addEntry(data);
    setFormOpen(false);
    fetchStats();
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
            topBorderColor="#ef4444"
            gradientBg="linear-gradient(to bottom, white, #fff5f5)"
            labelColor="#ef4444"
            valueColor="#ef4444"
            iconBg="rgba(239,68,68,0.12)"
            icon={<ExclamationTriangleIcon className="w-4 h-4" />}
          />
          <StatCard
            label="CRITICAL"
            value={stats?.critical ?? null}
            description="Expiring within 7 days"
            topBorderColor="#ea580c"
            gradientBg="linear-gradient(to bottom, white, #fff7ed)"
            labelColor="#ea580c"
            valueColor="#ea580c"
            iconBg="rgba(234,88,12,0.12)"
            icon={<ClockIcon className="w-4 h-4" />}
          />
          <StatCard
            label="WARNING"
            value={stats?.warning ?? null}
            description="Expiring in 8–30 days"
            topBorderColor="#d97706"
            gradientBg="linear-gradient(to bottom, white, #fefce8)"
            labelColor="#d97706"
            valueColor="#d97706"
            iconBg="rgba(217,119,6,0.12)"
            icon={<ClockIcon className="w-4 h-4" />}
          />
          <StatCard
            label="SAFE"
            value={stats?.safe ?? null}
            description="More than 30 days left"
            topBorderColor="#16a34a"
            gradientBg="linear-gradient(to bottom, white, #f0fdf4)"
            labelColor="#16a34a"
            valueColor="#16a34a"
            iconBg="rgba(22,163,74,0.12)"
            icon={<CheckCircleIcon className="w-4 h-4" />}
          />
        </div>
      )}

      {/* Health row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3">
          <StaleItemsCard
            items={healthData?.staleItems ?? []}
            isLoading={healthLoading}
          />
        </div>
        <div className="xl:col-span-2">
          <SystemHealthCard
            data={healthData?.systemHealth ?? null}
            isLoading={healthLoading}
          />
        </div>
      </div>

      {/* Completion rate */}
      <CompletionRateCard
        rates={healthData?.completionRates ?? []}
        isManager={isManager}
        isLoading={healthLoading}
      />

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
