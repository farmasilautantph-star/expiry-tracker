"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useExpiry } from "@/hooks/useExpiry";
import ExpiryForm from "@/components/expiry/ExpiryForm";
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
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    badge: "bg-red-500/20 text-red-400",
    value: "text-red-400",
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    badge: "bg-orange-500/20 text-orange-400",
    value: "text-orange-400",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    badge: "bg-yellow-500/20 text-yellow-400",
    value: "text-yellow-400",
  },
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    badge: "bg-green-500/20 text-green-400",
    value: "text-green-400",
  },
};

function StatCard({ label, value, color, icon, description }: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-xl border ${c.bg} ${c.border} p-5 flex items-start justify-between`}>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-3xl font-bold ${c.value} mt-1`}>
          {value === null ? (
            <span className="inline-block w-12 h-8 bg-gray-800 animate-pulse rounded" />
          ) : (
            value
          )}
        </p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      <div className={`p-2.5 rounded-lg ${c.badge}`}>
        {icon}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { addEntry } = useExpiry();

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const fetchStats = useCallback(() => {
    fetch("/api/expiry/stats")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data?.success) { setStats(data.data); setStatsError(false); }
        else setStatsError(true);
      })
      .catch(() => setStatsError(true));
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  async function handleAddEntry(data: ExpiryFormData) {
    await addEntry(data);
    setFormOpen(false);
    fetchStats();
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-0.5">Overview of current inventory expiry status.</p>
      </div>

      {/* Quick Log card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-blue-600/15 text-blue-400 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8h6m-6 4h6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Log New Expiry Entry</p>
            <p className="text-xs text-gray-400 mt-0.5">Record a short-expiry item for your outlet inventory</p>
          </div>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Entry
        </button>
      </div>

      {/* Stat cards */}
      {statsError ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <StatCard
            label="Critical"
            value={stats?.critical ?? null}
            color="orange"
            description="Expiring within 7 days"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            }
          />
          <StatCard
            label="Warning"
            value={stats?.warning ?? null}
            color="yellow"
            description="Expiring in 8–30 days"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Safe"
            value={stats?.safe ?? null}
            color="green"
            description="More than 30 days left"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

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
