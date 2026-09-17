"use client";

import { useCallback, useEffect, useState } from "react";

export type SaleStatus = "all" | "partial" | "fully_sold";

export interface SalesEntry {
  id: number;
  description: string;
  barcode: string;
  stock_id: string | null;
  category: string;
  uom: string | null;
  pic_name: string;
  expiry_date: string;
  logged_at: string;
  original_qty: number | null;
  current_qty: number;
  units_sold: number | null;
  sale_status: "partial" | "fully_sold";
  last_sold_at: string | null;
  notes: string | null;
  unit_price: number | null;
  amount: number | null;
}

export interface SalesSummary {
  total_transactions: number;
  total_units_sold: number;
  partial_count: number;
  fully_sold_count: number;
  total_sales_rm: number;
}

export interface SalesFilters {
  status: SaleStatus;
  month: string;
  showAll: boolean;
  search: string;
  pic: string;
  sort_by: string;
  sort_order: "asc" | "desc";
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const DEFAULT_SALES_FILTERS: SalesFilters = {
  status: "all",
  month: currentMonth(),
  showAll: false,
  search: "",
  pic: "",
  sort_by: "last_sold_at",
  sort_order: "desc",
};

const EMPTY_SUMMARY: SalesSummary = {
  total_transactions: 0,
  total_units_sold: 0,
  partial_count: 0,
  fully_sold_count: 0,
  total_sales_rm: 0,
};

export function useSalesRecord(onCountChange?: (count: number) => void) {
  const [entries, setEntries] = useState<SalesEntry[]>([]);
  const [summary, setSummary] = useState<SalesSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<SalesFilters>(DEFAULT_SALES_FILTERS);

  const fetchData = useCallback(
    async (f: SalesFilters) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (f.status !== "all") params.set("status", f.status);
        if (f.showAll) {
          params.set("all", "true");
        } else if (f.month) {
          params.set("month", f.month);
        }
        if (f.search) params.set("search", f.search);
        if (f.pic) params.set("pic", f.pic);
        params.set("sort_by", f.sort_by);
        params.set("sort_order", f.sort_order);

        const res = await fetch(`/api/expiry/sales?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Unknown error");
        setEntries(json.data);
        const s: SalesSummary = json.summary ?? EMPTY_SUMMARY;
        setSummary(s);
        onCountChange?.(s.total_transactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    },
    [onCountChange],
  );

  useEffect(() => {
    fetchData(filters);
  }, [fetchData, filters]);

  function setFilter<K extends keyof SalesFilters>(key: K, value: SalesFilters[K]) {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFiltersState(DEFAULT_SALES_FILTERS);
  }

  function toggleShowAll() {
    setFiltersState((prev) => ({ ...prev, showAll: !prev.showAll }));
  }

  function refresh() {
    fetchData(filters);
  }

  return { entries, summary, isLoading, error, filters, setFilter, clearFilters, toggleShowAll, refresh };
}
