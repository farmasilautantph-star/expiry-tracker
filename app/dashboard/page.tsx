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

interface Stats {
  expired: number;
  critical: number;
  warning: number;
  safe: number;
}

interface StatCardProps {
  label: string;
  value: number | null;
  color: "red" | "orange" | "yellow" | "green";
  icon: React.ReactNode;
  description: string;
}

const COLOR_MAP = {
  red: {
    border: "border-l-[#ef4444]",
    iconBg: "bg-red-50 text-[#ef4444]",
    value: "text-[#ef4444]",
  },
  orange: {
    border: "border-l-[#f97316]",
    iconBg: "bg-orange-50 text-[#f97316]",
    value: "text-[#f97316]",
  },
  yellow: {
    border: "border-l-[#eab308]",
    iconBg: "bg-yellow-50 text-[#eab308]",
    value: "text-[#ca8a04]",
  },
  green: {
    border: "border-l-[#22c55e]",
    iconBg: "bg-green-50 text-[#22c55e]",
    value: "text-[#16a34a]",
  },
};

function StatCard({ label, value, color, icon, description }: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div
      className={`rounded-2xl bg-white border border-[#e2e8f0] border-l-4 ${c.border} p-5 shadow-sm flex items-start justify-between`}
    >
      <div>
        <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className={`text-4xl font-black ${c.value} mt-1 leading-none`}>
          {value === null ? (
            <span className="inline-block w-12 h-9 bg-[#f1f5f9] animate-pulse rounded" />
          ) : (
            value
          )}
        </p>
        <p className="text-xs font-medium text-[#94a3b8] mt-2">{description}</p>
      </div>
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${c.iconBg}`}
      >
        {icon}
      </div>
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
      {/* Quick Log card — gradient blue */}
      <div className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-blue-900/10 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6]">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/15 text-white flex-shrink-0 backdrop-blur-sm">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8h6m-6 4h6"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-white">
              Log New Expiry Entry
            </p>
            <p className="text-sm text-blue-100 mt-0.5">
              Record a short-expiry item for your outlet inventory
            </p>
          </div>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#1e3a8a] text-sm font-semibold transition-colors shadow-md"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
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
            label="Expired"
            value={stats?.expired ?? null}
            color="red"
            description="Past expiry date"
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            }
          />
          <StatCard
            label="Critical"
            value={stats?.critical ?? null}
            color="orange"
            description="Expiring within 7 days"
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            }
          />
          <StatCard
            label="Warning"
            value={stats?.warning ?? null}
            color="yellow"
            description="Expiring in 8–30 days"
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            label="Safe"
            value={stats?.safe ?? null}
            color="green"
            description="More than 30 days left"
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>
      )}

      {/* Health row: StaleItemsCard (60%) + SystemHealthCard (40%) */}
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

      {/* Completion rate row — full width */}
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
