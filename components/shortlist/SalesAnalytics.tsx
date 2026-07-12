"use client";

import { useMemo, type ReactNode } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { useSalesTrend, type SalesTrendPoint } from "@/hooks/useSalesTrend";
import type { SalesEntry, SalesFilters, SalesSummary } from "@/hooks/useSalesRecord";
import SalesSummaryInline from "./SalesSummaryInline";

interface Props {
  entries: SalesEntry[]; // already filtered by the page's status/month/search/pic filters
  filters: SalesFilters;
  summary: SalesSummary;
  isLoading: boolean;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-MY", { month: "long", year: "numeric" });
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #f0f4f8", borderRadius: 18, padding: "20px 22px" }}>
      {children}
    </div>
  );
}

function TrendTooltip({ active, payload }: TooltipContentProps<TooltipValueType>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as SalesTrendPoint;
  return (
    <div
      style={{
        background: "#0f172a",
        color: "#fff",
        borderRadius: 8,
        padding: "7px 10px",
        boxShadow: "0 4px 14px rgba(15,23,42,0.18)",
      }}
    >
      <div style={{ fontSize: 10.5, fontWeight: 500, color: "#94a3b8", letterSpacing: "0.02em" }}>
        {p.longLabel}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 1 }}>{p.units.toLocaleString()} units</div>
    </div>
  );
}

function SalesVolumeTrendCard() {
  const { data, isLoading } = useSalesTrend();

  const trend = useMemo(() => {
    if (data.length < 2) return null;
    const last = data[data.length - 1].units;
    const prev = data[data.length - 2].units;
    const pct = prev === 0 ? (last > 0 ? 100 : 0) : ((last - prev) / prev) * 100;
    const up = pct >= 0;
    return {
      label: `${up ? "+" : ""}${pct.toFixed(0)}% vs last period`,
      arrow: up ? "↑" : "↓",
      color: up ? "#16a34a" : "#dc2626",
      bg: up ? "#ecfdf3" : "#fef2f2",
    };
  }, [data]);

  const hasData = data.some((d) => d.units > 0);

  return (
    <CardShell>
      <div>
        <div className="flex items-center flex-wrap" style={{ gap: "8px 10px" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
            Sales Volume Trend
          </h3>
          {trend && (
            <span
              className="inline-flex items-center flex-none whitespace-nowrap"
              style={{
                gap: 3,
                fontSize: 11.5,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 999,
                background: trend.bg,
                color: trend.color,
              }}
            >
              {trend.arrow} {trend.label}
            </span>
          )}
        </div>
        <p style={{ fontSize: 12.5, color: "#64748b", margin: "4px 0 0" }}>
          Units sold over time · last 10 months
        </p>
      </div>

      <div style={{ marginTop: 16, height: 240 }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full" style={{ fontSize: 13, color: "#94a3b8" }}>
            Loading…
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-full" style={{ fontSize: 13, color: "#94a3b8" }}>
            No sales recorded yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f0f4f8" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={38}
                tickFormatter={(v: number) => v.toLocaleString()}
              />
              <Tooltip content={TrendTooltip} />
              <Area
                type="monotone"
                dataKey="units"
                stroke="#16a34a"
                strokeWidth={2.5}
                fill="url(#salesGrad)"
                dot={{ r: 3, fill: "#fff", stroke: "#16a34a", strokeWidth: 2 }}
                activeDot={{ r: 5.5, fill: "#16a34a", stroke: "#fff", strokeWidth: 2.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </CardShell>
  );
}

const SHADES = ["#16a34a", "#16a34a", "#22aa55", "#22aa55", "#3cbf6f", "#3cbf6f", "#5fce8a", "#5fce8a"];

function CategorySalesBreakdownCard({ entries, subtitle }: { entries: SalesEntry[]; subtitle: string }) {
  const rows = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const label = e.category || "Uncategorized";
      map.set(label, (map.get(label) ?? 0) + (e.units_sold ?? 0));
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [entries]);

  const maxC = Math.max(...rows.map((r) => r.count), 1);

  return (
    <CardShell>
      <div style={{ marginBottom: 4 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
          Category Sales Breakdown
        </h3>
        <p style={{ fontSize: 12.5, color: "#64748b", margin: "4px 0 0" }}>{subtitle}</p>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: 200, fontSize: 13, color: "#94a3b8" }}>
          No sales in this period
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 14, marginTop: 20 }}>
          {rows.map((r, i) => (
            <div key={r.name}>
              <div className="flex items-baseline justify-between" style={{ gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#0f172a", letterSpacing: "0.01em" }}>
                  {r.name}
                </span>
                <span className="flex-none" style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                  {r.count.toLocaleString()} units
                </span>
              </div>
              <div style={{ height: 9, borderRadius: 999, background: "#f0f4f8", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 999,
                    background: SHADES[i] ?? "#5fce8a",
                    width: `${(r.count / maxC) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

export default function SalesAnalytics({ entries, filters, summary, isLoading }: Props) {
  const periodLabel = filters.showAll ? "All Time" : monthLabel(filters.month);
  const catSubtitle = filters.showAll
    ? "Which categories move fastest"
    : `Which categories moved fastest in ${monthLabel(filters.month)}`;

  return (
    <div>
      <div className="flex items-baseline" style={{ gap: 12, marginBottom: 6 }}>
        <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>Sales Analytics</h2>
        <span style={{ fontSize: 12.5, color: "#64748b" }}>This period · {periodLabel}</span>
      </div>

      {/* Mobile — original generic subtitle, unchanged */}
      <p className="md:hidden" style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>
        Performance overview for recorded sales
      </p>

      {/* Desktop — compact stat line replaces the subtitle (Change 2: merge stats into this header) */}
      <div className="hidden md:block" style={{ margin: "4px 0 14px" }}>
        <SalesSummaryInline summary={summary} isLoading={isLoading} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
          alignItems: "stretch",
        }}
      >
        <SalesVolumeTrendCard />
        <CategorySalesBreakdownCard entries={entries} subtitle={catSubtitle} />
      </div>
    </div>
  );
}
