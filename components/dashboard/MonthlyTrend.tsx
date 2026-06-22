"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyTrendEntry } from "@/hooks/useDashboardAnalytics";

interface Props {
  data: MonthlyTrendEntry[];
  isLoading: boolean;
  inline?: boolean;
}

const LINES = [
  { key: "logged",   label: "Logged",   color: "#2563eb", dash: "" },
  { key: "sold",     label: "Sold",     color: "#16a34a", dash: "" },
  { key: "returned", label: "Returned", color: "#ea580c", dash: "5 5" },
  { key: "offered",  label: "Offered",  color: "#8b5cf6", dash: "5 5" },
] as const;

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg px-4 py-3 text-xs" style={{ border: "1px solid #e2e8f0" }}>
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-bold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function MonthlyTrend({ data, isLoading, inline = false }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    month: d.month.replace(" 20", " '"),
  }));

  const inner = (
    <>
      {!inline && (
        <div className="mb-4">
          <p className="text-sm font-bold text-[#0f172a]">Monthly Activity Trend</p>
          <p className="text-xs text-slate-400 mt-0.5">Last 12 months</p>
        </div>
      )}
      {isLoading ? (
        <div className="h-52 bg-slate-100 animate-pulse rounded-xl" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            />
            {LINES.map((l) => (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                name={l.label}
                stroke={l.color}
                strokeWidth={2}
                strokeDasharray={l.dash || undefined}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </>
  );

  if (inline) return <>{inner}</>;

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6" style={{ border: "1px solid #e2e8f0" }}>
      {inner}
    </div>
  );
}
