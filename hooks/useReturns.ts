"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface ReturnEntry {
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
  return_status: string;
  return_by_date: string | null;
  return_notes: string | null;
  completed_at: string | null;
  overdue: boolean;
}

export interface ReturnFilters {
  month: string;
  status: string;
  category: string;
  pic: string;
  search: string;
}

export interface ReturnCounts {
  pending: number;
  overdue: number;
  returned: number;
  not_approved: number;
  total: number;
}

const EMPTY_FILTERS: ReturnFilters = {
  month: "",
  status: "",
  category: "",
  pic: "",
  search: "",
};

const EMPTY_COUNTS: ReturnCounts = {
  pending: 0,
  overdue: 0,
  returned: 0,
  not_approved: 0,
  total: 0,
};

interface UseReturnsReturn {
  entries: ReturnEntry[];
  counts: ReturnCounts;
  isLoading: boolean;
  error: string | null;
  filters: ReturnFilters;
  setFilter: <K extends keyof ReturnFilters>(
    key: K,
    value: ReturnFilters[K],
  ) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  markReturned: (id: number, notes?: string) => Promise<void>;
  markNotApproved: (id: number, notes?: string) => Promise<void>;
  updateReturnDate: (id: number, date: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReturns(): UseReturnsReturn {
  const [entries, setEntries] = useState<ReturnEntry[]>([]);
  const [counts, setCounts] = useState<ReturnCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReturnFilters>(EMPTY_FILTERS);

  const fetchData = useCallback(async (f: ReturnFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.month) params.set("month", f.month);
      if (f.status) params.set("status", f.status);
      if (f.category) params.set("category", f.category);
      if (f.pic) params.set("pic", f.pic);
      if (f.search) params.set("search", f.search);

      const res = await fetch(`/api/returns?${params}`);
      if (!res.ok) throw new Error("Failed to fetch returns");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");

      setEntries(json.data);
      setCounts(json.counts ?? EMPTY_COUNTS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(filters);
  }, [fetchData, filters]);

  function setFilter<K extends keyof ReturnFilters>(
    key: K,
    value: ReturnFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  async function markReturned(id: number, notes?: string): Promise<void> {
    const res = await fetch(`/api/returns/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ return_status: "returned", return_notes: notes }),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to mark as returned");
    await fetchData(filters);
  }

  async function markNotApproved(id: number, notes?: string): Promise<void> {
    const res = await fetch(`/api/returns/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        return_status: "not_approved",
        return_notes: notes,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to mark as not approved");
    await fetchData(filters);
  }

  async function updateReturnDate(id: number, date: string): Promise<void> {
    const res = await fetch(`/api/returns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ return_by_date: date }),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to update return date");
    await fetchData(filters);
  }

  return {
    entries,
    counts,
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    markReturned,
    markNotApproved,
    updateReturnDate,
    refresh: () => fetchData(filters),
  };
}
