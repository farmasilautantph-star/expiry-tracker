"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import type { TimelinePoint } from "@/hooks/useDashboardCharts";

interface Props {
  data: TimelinePoint[];
}

export default function ExpiryTimelineChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-600">
        No upcoming expiries in next 6 months
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 16, left: -8, bottom: 4 }}
      >
        <defs>
          <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1f2937"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
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
          itemStyle={{ color: "#60a5fa" }}
          cursor={{ stroke: "#374151" }}
          formatter={(value) => [value, "Items expiring"]}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#blueGrad)"
          dot={<Dot r={4} fill="#3b82f6" stroke="#1e3a5f" strokeWidth={2} />}
          activeDot={{
            r: 5,
            fill: "#60a5fa",
            stroke: "#1e3a5f",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
