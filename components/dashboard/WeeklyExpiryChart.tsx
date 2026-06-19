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

interface WeekData {
  week: string;
  expired: number;
  critical: number;
  warning: number;
}

interface Props {
  data: WeekData[];
  isLoading: boolean;
}

export default function WeeklyExpiryChart({ data, isLoading }: Props) {
  return (
    <div
      className="rounded-2xl bg-white p-6 shadow-sm"
      style={{ border: "1px solid #e2e8f0" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
            WEEKLY EXPIRY BREAKDOWN
          </p>
          <p className="text-xs text-[#94a3b8] mt-0.5">Item counts by status per week</p>
        </div>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: "#eff6ff", color: "#2563eb" }}
        >
          Last 8 Weeks
        </span>
      </div>

      {isLoading ? (
        <div className="h-52 bg-[#f1f5f9] animate-pulse rounded-xl" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            barCategoryGap="30%"
            barGap={3}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                fontSize: "12px",
              }}
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
            />
            <Bar dataKey="expired" name="Expired" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="critical" name="Critical" fill="#ea580c" radius={[4, 4, 0, 0]} />
            <Bar dataKey="warning" name="Warning" fill="#d97706" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
