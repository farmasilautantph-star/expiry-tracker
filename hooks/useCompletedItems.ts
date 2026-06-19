"use client";

import { useCallback, useEffect, useState } from "react";

export interface CompletedEntry {
  id: number;
  barcode: string;
  description: string;
  category: string;
  expiry_date: string;
  pic_id: number;
  pic_name: string;
  logged_at: string;
  notes: string | null;
  stock_id: string | null;
  uom: string | null;
  quantity: number;
  original_qty: number | null;
  item_status: string;
  completed_via: string | null;
  completed_at: string | null;
  completed_notes: string | null;
  sold_at: string | null;
  sold_by: string | null;
  return_notes: string | null;
  units_sold: number | null;
  remaining_qty: number;
}

export interface CompletedSummary {
  total: number;
  sold_count: number;
  sold_units: number;
  returned_count: number;
  not_approved_count: number;
  offer_received_count: number;
  offer_rejected_count: number;
}

export interface CompletedFilters {
  completed_via: string;
  month: string;
  showAll: boolean;
  sort_by: string;
  sort_order: "asc" | "desc";
  search: string;
  pic: string;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const DEFAULT_COMPLETED_FILTERS: CompletedFilters = {
  completed_via: "",
  month: currentMonth(),
  showAll: false,
  sort_by: "completed_at",
  sort_order: "desc",
  search: "",
  pic: "",
};

const EMPTY_SUMMARY: CompletedSummary = {
  total: 0,
  sold_count: 0,
  sold_units: 0,
  returned_count: 0,
  not_approved_count: 0,
  offer_received_count: 0,
  offer_rejected_count: 0,
};

export function useCompletedItems(onCountChange?: (count: number) => void) {
  const [entries, setEntries] = useState<CompletedEntry[]>([]);
  const [summary, setSummary] = useState<CompletedSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<CompletedFilters>(DEFAULT_COMPLETED_FILTERS);

  const fetchData = useCallback(
    async (f: CompletedFilters) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (f.completed_via) params.set("completed_via", f.completed_via);
        if (f.showAll) {
          params.set("all", "true");
        } else if (f.month) {
          params.set("month", f.month);
        }
        params.set("sort_by", f.sort_by);
        params.set("sort_order", f.sort_order);
        if (f.search) params.set("search", f.search);
        if (f.pic) params.set("pic", f.pic);

        const res = await fetch(`/api/expiry/completed?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Unknown error");
        setEntries(json.data);
        const s: CompletedSummary = json.summary ?? EMPTY_SUMMARY;
        setSummary(s);
        onCountChange?.(s.total);
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

  function setFilter<K extends keyof CompletedFilters>(key: K, value: CompletedFilters[K]) {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFiltersState(DEFAULT_COMPLETED_FILTERS);
  }

  function toggleShowAll() {
    setFiltersState((prev) => ({ ...prev, showAll: !prev.showAll }));
  }

  function refresh() {
    fetchData(filters);
  }

  return { entries, summary, isLoading, error, filters, setFilter, clearFilters, toggleShowAll, refresh };
}
