"use client";

import {
  LinkIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import type { SalesSummary } from "@/hooks/useSalesRecord";

interface Props {
  summary: SalesSummary;
  isLoading: boolean;
}

const CARDS: {
  key: keyof SalesSummary;
  label: string;
  icon: typeof LinkIcon;
  color: string;
  bg: string;
}[] = [
  { key: "total_transactions", label: "Transactions", icon: LinkIcon, color: "#7c3aed", bg: "#f5f3ff" },
  { key: "total_units_sold", label: "Units Sold", icon: ArchiveBoxIcon, color: "#16a34a", bg: "#f0fdf4" },
  { key: "partial_count", label: "Partial Sold", icon: ArrowPathIcon, color: "#ea580c", bg: "#fff7ed" },
  { key: "fully_sold_count", label: "Fully Sold", icon: CheckCircleIcon, color: "#2563eb", bg: "#eff6ff" },
];

// Desktop-only compact stat cards — replaces the bulky SalesSummaryBar card
// used on mobile. Shown to both roles (matches SalesSummaryBar's original,
// non-manager-gated visibility); the Sales Analytics charts remain
// manager-only and are rendered separately below this.
export default function SalesStatCards({ summary, isLoading }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.key}
            className="bg-white rounded-2xl p-3.5 flex items-start justify-between"
            style={{ border: "1px solid #e2e8f0" }}
          >
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#94a3b8] truncate">
                {c.label}
              </p>
              <p
                className={`text-2xl font-bold text-[#0f172a] mt-1 ${isLoading ? "animate-pulse" : ""}`}
              >
                {isLoading ? "…" : summary[c.key]}
              </p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: c.bg }}
            >
              <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: c.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
