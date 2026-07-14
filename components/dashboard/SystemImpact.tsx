"use client";

import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SystemImpact as SystemImpactData } from "@/hooks/useDashboardAnalytics";

interface Props {
  data: SystemImpactData | null;
  isLoading: boolean;
}

const CARD =
  "rounded-[18px] bg-white p-5 flex flex-col";
const CARD_BORDER = { border: "1px solid #f0f4f8" };

// ── Shared bits ──────────────────────────────────────────────────────────────

function CardShell({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={CARD} style={CARD_BORDER}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-sm font-bold text-[#0f172a]">{title}</p>
          <p className="text-xs text-[#64748b] mt-0.5">{subtitle}</p>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

function TrendPill({
  positive,
  children,
}: {
  positive: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        background: positive ? "#dcfce7" : "#fee2e2",
        color: positive ? "#15803d" : "#b91c1c",
      }}
    >
      <span aria-hidden>{positive ? "▲" : "▼"}</span>
      {children}
    </span>
  );
}

function SparkTooltip({
  active,
  payload,
  suffix,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { month: string } }>;
  suffix: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div
      className="bg-white rounded-lg shadow-lg px-2.5 py-1.5 text-[11px]"
      style={{ border: "1px solid #e2e8f0" }}
    >
      <span className="font-semibold text-[#0f172a]">{p.payload.month}</span>
      <span className="text-[#64748b]">
        {" · "}
        {p.value}
        {suffix}
      </span>
    </div>
  );
}

// ── Card 1 — Resolution Rate ─────────────────────────────────────────────────

function ResolutionCard({ d }: { d: SystemImpactData["resolutionRate"] }) {
  const donut =
    d.resolved + d.expiredUnresolved > 0
      ? [
          { name: "Resolved", value: d.resolved, color: "#16a34a" },
          { name: "Expired Unresolved", value: d.expiredUnresolved, color: "#ef4444" },
        ]
      : [{ name: "No data", value: 1, color: "#e2e8f0" }];

  return (
    <CardShell
      title="Resolution Rate"
      subtitle="Share of decided items resolved, not lost"
    >
      {/* Donut */}
      <div className="relative flex justify-center">
        <ResponsiveContainer width="100%" height={168}>
          <PieChart>
            <Pie
              data={donut}
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={donut.length > 1 ? 2 : 0}
              dataKey="value"
              stroke="none"
            >
              {donut.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[34px] font-black leading-none text-[#0f172a]">
            {d.ratePct}%
          </span>
          <span className="text-[10px] font-bold text-[#16a34a] uppercase tracking-wider mt-1">
            Resolved
          </span>
        </div>
      </div>

      {/* Trend row */}
      <div className="flex items-center justify-between mt-3 mb-1">
        <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
          Last 6 Months
        </span>
        {d.deltaPct !== 0 && (
          <TrendPill positive={d.deltaPct >= 0}>
            {d.deltaPct >= 0 ? "+" : ""}
            {d.deltaPct}% since {d.sinceLabel}
          </TrendPill>
        )}
      </div>

      {/* Sparkline */}
      <ResponsiveContainer width="100%" height={46}>
        <LineChart data={d.trend} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <Tooltip content={<SparkTooltip suffix="%" />} cursor={false} />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#16a34a" }} />
          <span className="text-[#64748b]">Resolved · sold, returned, offered</span>
          <span className="ml-auto font-bold text-[#0f172a]">{d.resolved}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#ef4444" }} />
          <span className="text-[#64748b]">Expired Unresolved · losses</span>
          <span className="ml-auto font-bold text-[#0f172a]">{d.expiredUnresolved}</span>
        </div>
      </div>

      <p className="text-[10px] text-[#94a3b8] mt-3">
        Excludes items still active — only decided outcomes counted.
      </p>
    </CardShell>
  );
}

// ── Card 2 — Avg Time to Resolution ──────────────────────────────────────────

function TimeToResolutionCard({ d }: { d: SystemImpactData["timeToResolution"] }) {
  const faster = d.deltaDays != null && d.deltaDays > 0;

  return (
    <CardShell
      title="Avg. Time to Resolution"
      subtitle="From logged to resolved"
    >
      {/* Big number */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[44px] font-black leading-none text-[#0f172a]">
            {d.avgDays != null ? d.avgDays : "—"}
          </span>
          {d.avgDays != null && (
            <span className="text-sm font-semibold text-[#64748b]">days</span>
          )}
        </div>

        {/* Trend badge */}
        <div className="mt-2 h-6 flex items-center">
          {d.deltaDays != null && d.deltaDays !== 0 ? (
            <TrendPill positive={faster}>
              {Math.abs(d.deltaDays)} day{Math.abs(d.deltaDays) === 1 ? "" : "s"}{" "}
              {faster ? "faster" : "slower"} than last quarter
            </TrendPill>
          ) : (
            <span className="text-[11px] text-[#94a3b8]">
              {d.avgDays == null ? "Not enough data" : "No change vs last quarter"}
            </span>
          )}
        </div>
      </div>

      {/* Sparkline */}
      <div className="mt-auto">
        <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
          6-Month Trend
        </span>
        <ResponsiveContainer width="100%" height={56}>
          <LineChart data={d.trend} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
            <Tooltip content={<SparkTooltip suffix="d" />} cursor={false} />
            <Line
              type="monotone"
              dataKey="days"
              stroke="#1d4ed8"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#1d4ed8", strokeWidth: 0 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-between text-[10px] text-[#94a3b8] mt-1 px-1">
          <span>
            {d.firstLabel} · {d.firstValue != null ? `${d.firstValue}d` : "—"}
          </span>
          <span>
            {d.lastLabel} · {d.lastValue != null ? `${d.lastValue}d` : "—"}
          </span>
        </div>
      </div>
    </CardShell>
  );
}

// ── Card 3 — Review Compliance Trend ─────────────────────────────────────────

function ComplianceCard({ d }: { d: SystemImpactData["complianceTrend"] }) {
  const narrative =
    d.latestPct != null && d.oldestPct != null
      ? `${d.latestPct}% team compliance in ${d.latestLabel}, ${
          d.deltaPct >= 0 ? "up" : "down"
        } from ${d.oldestPct}% six months ago.`
      : "Not enough review history to chart a trend yet.";

  return (
    <CardShell
      title="Review Compliance Trend"
      subtitle="Team-wide Sunday review discipline over time"
      badge={
        d.deltaPct !== 0 ? (
          <TrendPill positive={d.deltaPct >= 0}>
            {d.deltaPct >= 0 ? "+" : ""}
            {d.deltaPct}%
          </TrendPill>
        ) : undefined
      }
    >
      <div className="mt-1">
        <ResponsiveContainer width="100%" height={172}>
          <AreaChart data={d.trend} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="complianceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={38}
            />
            <Tooltip content={<SparkTooltip suffix="%" />} cursor={{ stroke: "#e2e8f0" }} />
            <Area
              type="monotone"
              dataKey="pct"
              stroke="#1d4ed8"
              strokeWidth={2.5}
              fill="url(#complianceFill)"
              dot={{ r: 3, fill: "#1d4ed8", strokeWidth: 0 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-[#64748b] mt-3 leading-snug">{narrative}</p>
    </CardShell>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────

export default function SystemImpact({ data, isLoading }: Props) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">
        System Impact
      </p>
      <p className="text-xs text-[#64748b] mb-3">
        How well the system is reducing expiry loss and saving effort
      </p>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-[360px] rounded-[18px] bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ResolutionCard d={data.resolutionRate} />
          <TimeToResolutionCard d={data.timeToResolution} />
          <ComplianceCard d={data.complianceTrend} />
        </div>
      )}
    </div>
  );
}
