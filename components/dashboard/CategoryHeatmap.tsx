"use client";

import type { CategoryHeatmapEntry } from "@/hooks/useDashboardAnalytics";

interface Props {
  data: CategoryHeatmapEntry[];
  isLoading: boolean;
}

const RISK = {
  high:   { badgeCls: "bg-red-100 text-red-700",    borderColor: "#ef4444", title: "#dc2626", gradFrom: "#fee2e2", gradTo: "#fecaca" },
  medium: { badgeCls: "bg-orange-100 text-orange-700", borderColor: "#fb923c", title: "#ea580c", gradFrom: "#ffedd5", gradTo: "#fed7aa" },
  low:    { badgeCls: "bg-green-100 text-green-700",  borderColor: "#4ade80", title: "#16a34a", gradFrom: "#f0fdf4", gradTo: "#dcfce7" },
};

const DOTS = [
  { key: "expired",  label: "Expired",  color: "#dc2626" },
  { key: "critical", label: "Critical", color: "#ea580c" },
  { key: "warning",  label: "Warning",  color: "#ca8a04" },
  { key: "safe",     label: "Safe",     color: "#16a34a" },
] as const;

function HeatmapCard({ entry }: { entry: CategoryHeatmapEntry }) {
  const r = RISK[entry.riskLevel];
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: `linear-gradient(135deg, ${r.gradFrom} 0%, ${r.gradTo} 100%)`,
        border: `1px solid #e2e8f0`,
        borderLeft: `4px solid ${r.borderColor}`,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${r.badgeCls}`}>
          {entry.riskLevel}
        </span>
        <span className="text-[10px] text-slate-400">{entry.total} items</span>
      </div>
      <p className="text-sm font-bold mt-1 mb-2 leading-snug" style={{ color: r.title }}>
        {entry.category}
      </p>
      <div className="h-px bg-black/5 mb-2" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {DOTS.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[11px] text-slate-600">{label}</span>
            <span className="text-[11px] font-bold text-slate-800 ml-auto">
              {entry[key as keyof CategoryHeatmapEntry] as number}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 text-right mt-2">
        Risk Score: {entry.riskScore} pts
      </p>
    </div>
  );
}

export default function CategoryHeatmap({ data, isLoading }: Props) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-6" style={{ border: "1px solid #e2e8f0" }}>
      <div className="mb-4">
        <p className="text-sm font-bold text-[#0f172a]">Category Risk Heatmap</p>
        <p className="text-xs text-slate-400 mt-0.5">Risk level by expiry urgency</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-slate-400">
          No category data available.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
          {data.slice(0, 8).map((entry) => (
            <HeatmapCard key={entry.category} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
