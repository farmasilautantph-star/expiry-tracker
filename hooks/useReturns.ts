"use client";

import { useCallback, useEffect, useState } from "react";

export interface ReturnEntry {
  id: number;
  logged_date: string;
  pic_id: number;
  pic_name: string;
  category: string;
  description: string;
  barcode: string;
  created_at: string;
  stock_id: string | null;
  uom: string | null;
  return_by_date: string | null;
  notes: string | null;
  status: string;
}

export interface ReturnFormData {
  logged_date: string;
  barcode: string;
  description: string;
  category: string;
  stock_id: string;
  uom: string;
  return_by_date: string;
  notes: string;
}

export interface ReturnFilters {
  search: string;
  category: string;
  pic: string;
  status: string;
}

export interface ReturnCounts {
  pending: number;
  returned: number;
  total: number;
}

const EMPTY_FILTERS: ReturnFilters = { search: "", category: "", pic: "", status: "" };
const EMPTY_COUNTS: ReturnCounts = { pending: 0, returned: 0, total: 0 };

interface UseReturnsReturn {
  entries: ReturnEntry[];
  counts: ReturnCounts;
  isLoading: boolean;
  error: string | null;
  filters: ReturnFilters;
  setFilter: <K extends keyof ReturnFilters>(key: K, value: ReturnFilters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  addReturn: (data: ReturnFormData) => Promise<void>;
  editReturn: (id: number, data: ReturnFormData) => Promise<void>;
  deleteReturn: (id: number) => Promise<void>;
  markReturned: (id: number) => Promise<void>;
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
      if (f.search)   params.set("search",   f.search);
      if (f.category) params.set("category", f.category);
      if (f.pic)      params.set("pic",      f.pic);
      if (f.status)   params.set("status",   f.status);

      const url = `/api/returns${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
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

  useEffect(() => { fetchData(filters); }, [fetchData, filters]);

  function setFilter<K extends keyof ReturnFilters>(key: K, value: ReturnFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() { setFilters(EMPTY_FILTERS); }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  async function addReturn(data: ReturnFormData): Promise<void> {
    const res = await fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to log return");
    await fetchData(filters);
  }

  async function editReturn(id: number, data: ReturnFormData): Promise<void> {
    const res = await fetch(`/api/returns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to update return");
    await fetchData(filters);
  }

  async function deleteReturn(id: number): Promise<void> {
    const res = await fetch(`/api/returns/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to delete return");
    await fetchData(filters);
  }

  async function markReturned(id: number): Promise<void> {
    const res = await fetch(`/api/returns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "returned" }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to mark as returned");
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
    addReturn,
    editReturn,
    deleteReturn,
    markReturned,
    refresh: () => fetchData(filters),
  };
}
