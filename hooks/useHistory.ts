"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface HistoryEntry {
  id: number;
  action: "CREATE" | "UPDATE" | "DELETE";
  module: string;
  record_id: number | null;
  pic_id: number | null;
  pic_name: string | null;
  description: string | null;
  timestamp: string;
  date: string;
}

export interface HistoryFilters {
  module: string;
  action: string;
  pic: string;
  month: string;
  search: string;
}

export interface HistoryCounts {
  total: number;
  creates: number;
  updates: number;
  deletes: number;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const EMPTY_FILTERS: HistoryFilters = {
  module: "",
  action: "",
  pic: "",
  month: currentMonth(),
  search: "",
};

const EMPTY_COUNTS: HistoryCounts = {
  total: 0,
  creates: 0,
  updates: 0,
  deletes: 0,
};

interface UseHistoryReturn {
  entries: HistoryEntry[];
  isLoading: boolean;
  error: string | null;
  filters: HistoryFilters;
  setFilter: <K extends keyof HistoryFilters>(
    key: K,
    value: HistoryFilters[K],
  ) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  counts: HistoryCounts;
  picNames: string[];
  page: number;
  totalPages: number;
  total: number;
  setPage: (p: number) => void;
  refresh: () => void;
}

export function useHistory(): UseHistoryReturn {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_FILTERS);
  const [counts, setCounts] = useState<HistoryCounts>(EMPTY_COUNTS);
  const [picNames, setPicNames] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async (f: HistoryFilters, p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.module) params.set("module", f.module);
      if (f.action) params.set("action", f.action);
      if (f.pic) params.set("pic", f.pic);
      if (f.month) params.set("month", f.month);
      if (f.search) params.set("search", f.search);
      params.set("page", String(p));
      params.set("limit", "50");

      const res = await fetch(`/api/history?${params}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");

      setEntries(json.data);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
      setCounts(json.counts ?? EMPTY_COUNTS);
      setPicNames(json.picNames ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(filters, page);
  }, [fetchData, filters, page, tick]);

  function setFilter<K extends keyof HistoryFilters>(
    key: K,
    value: HistoryFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(([k, v]) => k !== "month" && Boolean(v))
        .length,
    [filters],
  );

  return {
    entries,
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    counts,
    picNames,
    page,
    totalPages,
    total,
    setPage,
    refresh: () => setTick((t) => t + 1),
  };
}
