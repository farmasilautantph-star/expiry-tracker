"use client";

import type { ReturnPolicyStats } from "@/hooks/useReturnPolicies";
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowsRightLeftIcon,
  XCircleIcon,
  ShieldExclamationIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

interface Props {
  stats: ReturnPolicyStats;
  isLoading: boolean;
}

interface CardSpec {
  label: string;
  value: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconBg: string;
  iconColor: string;
}

function Card({ spec, isLoading }: { spec: CardSpec; isLoading: boolean }) {
  const Icon = spec.icon;
  return (
    <div
      className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
      style={{ border: "1px solid #e2e8f0" }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
        style={{ background: spec.iconBg }}
      >
        <Icon className="w-5 h-5" style={{ color: spec.iconColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#64748b] truncate">{spec.label}</p>
        {isLoading ? (
          <div className="h-6 w-12 bg-[#f1f5f9] rounded mt-0.5 animate-pulse" />
        ) : (
          <p className="text-xl font-bold text-[#0f172a] leading-tight">{spec.value}</p>
        )}
      </div>
    </div>
  );
}

export default function PolicyStatsCards({ stats, isLoading }: Props) {
  const cards: CardSpec[] = [
    { label: "Total Policies",  value: stats.total,            icon: DocumentTextIcon,     iconBg: "#e0e7ff", iconColor: "#4338ca" },
    { label: "Returnable",      value: stats.returnable,       icon: CheckCircleIcon,      iconBg: "#dcfce7", iconColor: "#16a34a" },
    { label: "Exchangeable",    value: stats.exchangeable,     icon: ArrowsRightLeftIcon,  iconBg: "#dbeafe", iconColor: "#2563eb" },
    { label: "Non-Returnable",  value: stats.non_returnable,   icon: XCircleIcon,          iconBg: "#fee2e2", iconColor: "#dc2626" },
    { label: "Strict Suppliers", value: stats.strict_suppliers, icon: ShieldExclamationIcon, iconBg: "#ffedd5", iconColor: "#ea580c" },
    { label: "Brand Linked",    value: stats.brand_linked,     icon: LinkIcon,             iconBg: "#f3e8ff", iconColor: "#9333ea" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card key={c.label} spec={c} isLoading={isLoading} />
      ))}
    </div>
  );
}
