"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ReturnStatus } from "@/hooks/useDashboardCharts";

interface Props {
  data: ReturnStatus;
}

const SEGMENTS = [
  { key: "pending",  label: "Pending",  color: "#eab308" },
  { key: "returned", label: "Returned", color: "#22c55e" },
  { key: "overdue",  label: "Overdue",  color: "#ef4444" },
] as const;

function CenterLabel({ total }: { total: number }) {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-8" fontSize={28} fontWeight={700} fill="#f9fafb">{total}</tspan>
      <tspan x="50%" dy={22} fontSize={11} fill="#6b7280">Total Returns</tspan>
    </text>
  );
}

export default function ReturnStatusChart({ data }: Props) {
  const total = data.pending + data.returned + data.overdue;
  const chartData = SEGMENTS.map((s) => ({ name: s.label, value: data[s.key], color: s.color })).filter((d) => d.value > 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-600">
        No return records found
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", fontSize: 12 }}
            itemStyle={{ color: "#d1d5db" }}
            formatter={(value, name) => [value, name]}
          />
          <CenterLabel total={total} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-1">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-400">{s.label}: <span className="text-white font-medium">{data[s.key]}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
