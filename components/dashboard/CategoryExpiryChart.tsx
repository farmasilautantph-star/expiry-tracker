"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CategoryBreakdown } from "@/hooks/useDashboardCharts";

interface Props {
  data: CategoryBreakdown[];
}

const COLORS = {
  expired: "#ef4444",
  critical: "#f97316",
  warning: "#eab308",
  safe: "#22c55e",
};


export default function CategoryExpiryChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-600">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 16, left: -8, bottom: 60 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1f2937"
          vertical={false}
        />
        <XAxis
          dataKey="category"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          angle={-40}
          textAnchor="end"
          interval={0}
          tickLine={false}
          axisLine={{ stroke: "#374151" }}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "#f9fafb", fontWeight: 600, marginBottom: 4 }}
          itemStyle={{ color: "#d1d5db" }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Legend
          wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
          formatter={(value) => (
            <span style={{ color: "#9ca3af" }}>
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </span>
          )}
        />
        <Bar
          dataKey="expired"
          name="Expired"
          stackId="a"
          fill={COLORS.expired}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="critical"
          name="Critical"
          stackId="a"
          fill={COLORS.critical}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="warning"
          name="Warning"
          stackId="a"
          fill={COLORS.warning}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="safe"
          name="Safe"
          stackId="a"
          fill={COLORS.safe}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
