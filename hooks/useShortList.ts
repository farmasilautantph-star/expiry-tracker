"use client";

import { useCallback, useEffect, useState } from "react";

export interface ShortListEntry {
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
  return_status: string | null;
  return_by_date: string | null;
  days_left: number;
  urgency: "expired" | "critical" | "warning" | "safe";
  offer_status: "not-offered" | "offered" | "accepted" | "rejected" | "completed";
  offer_id: number | null;
}

export interface ShortListFilters {
  search: string;
  category: string;
  status: string;
  pic: string;
  return_status: string;
}

export interface ShortListCounts {
  expired: number;
  critical: number;
  warning: number;
  safe: number;
  total: number;
}

const EMPTY_FILTERS: ShortListFilters = {
  search: "",
  category: "",
  status: "",
  pic: "",
  return_status: "",
};

const EMPTY_COUNTS: ShortListCounts = { expired: 0, critical: 0, warning: 0, safe: 0, total: 0 };

interface UseShortListReturn {
  entries: ShortListEntry[];
  counts: ShortListCounts;
  isLoading: boolean;
  error: string | null;
  filters: ShortListFilters;
  setFilter: <K extends keyof ShortListFilters>(key: K, value: ShortListFilters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  refresh: () => Promise<void>;
}

export function useShortList(): UseShortListReturn {
  const [entries, setEntries] = useState<ShortListEntry[]>([]);
  const [counts, setCounts] = useState<ShortListCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ShortListFilters>(EMPTY_FILTERS);

  const fetchData = useCallback(async (f: ShortListFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.search)   params.set("search",   f.search);
      if (f.category) params.set("category", f.category);
      if (f.status)   params.set("status",   f.status);
      if (f.pic)      params.set("pic",      f.pic);

      const url = `/api/shortlist${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch shortlist");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");

      let data: ShortListEntry[] = json.data;
      if (f.return_status) {
        data = f.return_status === "none"
          ? data.filter((e) => !e.return_status)
          : data.filter((e) => e.return_status === f.return_status);
      }

      setEntries(data);
      const c = { expired: 0, critical: 0, warning: 0, safe: 0, total: data.length };
      for (const e of data) {
        const u = e.urgency as keyof typeof c;
        if (u in c) (c[u] as number)++;
      }
      setCounts(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(filters); }, [fetchData, filters]);

  function setFilter<K extends keyof ShortListFilters>(key: K, value: ShortListFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() { setFilters(EMPTY_FILTERS); }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return {
    entries,
    counts,
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    refresh: () => fetchData(filters),
  };
}
