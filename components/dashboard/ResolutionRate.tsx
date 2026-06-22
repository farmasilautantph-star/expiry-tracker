"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ResolutionRate as ResolutionRateData } from "@/hooks/useDashboardAnalytics";

interface Props {
  data: ResolutionRateData | null;
  isLoading: boolean;
}

const SEGMENTS = [
  { key: "sold",     label: "Sold",     pctKey: "sold_pct",     color: "#2563eb" },
  { key: "returned", label: "Returned", pctKey: "returned_pct", color: "#16a34a" },
  { key: "offered",  label: "Offered",  pctKey: "offered_pct",  color: "#8b5cf6" },
  { key: "active",   label: "Active",   pctKey: "active_pct",   color: "#94a3b8" },
] as const;

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white rounded-xl shadow-lg px-3 py-2 text-xs" style={{ border: "1px solid #e2e8f0" }}>
      <p className="font-semibold" style={{ color: item.payload.color }}>{item.name}</p>
      <p className="text-slate-600">{item.value} items</p>
    </div>
  );
}

export default function ResolutionRate({ data, isLoading }: Props) {
  const chartData = data
    ? SEGMENTS.map((s) => ({
        name: s.label,
        value: data[s.key as keyof ResolutionRateData] as number,
        color: s.color,
      })).filter((d) => d.value > 0)
    : [];

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6" style={{ border: "1px solid #e2e8f0" }}>
      <div className="mb-4">
        <p className="text-sm font-bold text-[#0f172a]">Item Resolution Rate</p>
        <p className="text-xs text-slate-400 mt-0.5">How items are being resolved</p>
      </div>

      {isLoading || !data ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-36 h-36 rounded-full bg-slate-100 animate-pulse" />
          <div className="grid grid-cols-2 gap-3 w-full">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Donut chart */}
          <div className="relative flex justify-center mb-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData.length > 0 ? chartData : [{ name: "No data", value: 1, color: "#e2e8f0" }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {(chartData.length > 0 ? chartData : [{ color: "#e2e8f0" }]).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800">{data.total}</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Items</span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2">
            {SEGMENTS.map((s) => {
              const count = data[s.key as keyof ResolutionRateData] as number;
              const pct   = data[s.pctKey as keyof ResolutionRateData] as number;
              return (
                <div key={s.key} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "#f8fafc" }}>
                  <span className="w-3 h-3 rounded-sm flex-shrink-0 mt-0.5" style={{ background: s.color }} />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{s.label}</p>
                    <p className="text-[11px] text-slate-400">
                      <span className="font-bold text-slate-700">{count}</span> items · {pct}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
