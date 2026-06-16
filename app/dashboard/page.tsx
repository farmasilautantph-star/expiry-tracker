"use client";

import { useEffect, useState } from "react";

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
    icon: "text-red-400",
    value: "text-red-400",
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    badge: "bg-orange-500/20 text-orange-400",
    icon: "text-orange-400",
    value: "text-orange-400",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    badge: "bg-yellow-500/20 text-yellow-400",
    icon: "text-yellow-400",
    value: "text-yellow-400",
  },
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    badge: "bg-green-500/20 text-green-400",
    icon: "text-green-400",
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

const MODULE_CARDS = [
  {
    label: "Log New Expiry",
    description: "Record short-expiry items with barcode, date, and PIC.",
    href: "/dashboard/expiry",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    label: "Item Short List",
    description: "View all logged expiry items, filterable by PIC and category.",
    href: "/dashboard/item-short-list",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    label: "Offer Ke Outlet",
    description: "Track items offered to outlet with UOM and quantity.",
    href: "/dashboard/offer-ke-outlet",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    label: "Return List",
    description: "Items returned, tracked by PIC and category.",
    href: "/dashboard/return-list",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
  },
  {
    label: "History Log",
    description: "Full audit trail of all create, update, and delete actions.",
    href: "/dashboard/history-log",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Remote Control",
    description: "Send stock and return reminder emails to staff.",
    href: "/dashboard/remote-control",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    fetch("/api/expiry/stats")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data?.success) setStats(data.data);
        else setStatsError(true);
      })
      .catch(() => setStatsError(true));
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-0.5">Overview of current inventory expiry status.</p>
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

      {/* Module cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {MODULE_CARDS.map((mod) => (
            <div
              key={mod.href}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-start gap-4"
            >
              <div className="p-2.5 rounded-lg bg-gray-800 text-gray-400 flex-shrink-0">
                {mod.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{mod.label}</p>
                <p className="text-xs text-gray-500 mt-1">{mod.description}</p>
                <span className="inline-block mt-2 text-xs text-gray-600 bg-gray-800 border border-gray-700 rounded-md px-2 py-0.5">
                  Coming soon
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
