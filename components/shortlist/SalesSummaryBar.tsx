"use client";

import type { SalesSummary } from "@/hooks/useSalesRecord";
import { formatRM } from "@/lib/formatCurrency";

interface Props {
  summary: SalesSummary;
  isLoading: boolean;
}

export default function SalesSummaryBar({ summary, isLoading }: Props) {
  const stats = [
    { label: "Transactions", value: isLoading ? "…" : String(summary.total_transactions) },
    { label: "Units Sold",   value: isLoading ? "…" : String(summary.total_units_sold) },
    { label: "Partial",      value: isLoading ? "…" : String(summary.partial_count) },
    { label: "Fully Sold",   value: isLoading ? "…" : String(summary.fully_sold_count) },
    { label: "Total Sales",  value: isLoading ? "…" : formatRM(summary.total_sales_rm) },
  ];

  return (
    <div
      className="flex flex-wrap gap-0 rounded-xl bg-white overflow-hidden"
      style={{ border: "1px solid #e2e8f0" }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="flex flex-col px-5 py-3"
          style={{ borderRight: i < stats.length - 1 ? "1px solid #e2e8f0" : "none" }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
            {s.label}
          </span>
          <span
            className={`text-sm font-bold text-[#0f172a] mt-0.5 ${isLoading ? "animate-pulse" : ""}`}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}
