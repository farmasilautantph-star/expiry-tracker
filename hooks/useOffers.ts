"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface OfferEntry {
  id: number;
  description: string;
  barcode: string;
  stock_id: string | null;
  uom: string;
  quantity: number;
  category: string | null;
  notes: string | null;
  has_alert: number;
  created_at: string;
  created_by: number;
}

export interface OfferFilters {
  search: string;
  category: string;
  alert: string;
}

export interface OfferSummary {
  totalOffers: number;
  withAlert: number;
}

const EMPTY_FILTERS: OfferFilters = { search: "", category: "", alert: "" };
const EMPTY_SUMMARY: OfferSummary = { totalOffers: 0, withAlert: 0 };

export interface OfferFormData {
  description: string;
  barcode: string;
  stock_id: string;
  uom: string;
  quantity: number;
  category: string;
  notes: string;
  has_alert: boolean;
}

interface UseOffersReturn {
  entries: OfferEntry[];
  summary: OfferSummary;
  isLoading: boolean;
  error: string | null;
  filters: OfferFilters;
  setFilter: <K extends keyof OfferFilters>(key: K, value: OfferFilters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  addOffer: (data: OfferFormData) => Promise<void>;
  editOffer: (id: number, data: Partial<OfferFormData>) => Promise<void>;
  deleteOffer: (id: number) => Promise<void>;
  toggleAlert: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useOffers(): UseOffersReturn {
  const [entries, setEntries] = useState<OfferEntry[]>([]);
  const [summary, setSummary] = useState<OfferSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OfferFilters>(EMPTY_FILTERS);

  const fetchData = useCallback(async (f: OfferFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.search)   params.set("search",   f.search);
      if (f.category) params.set("category", f.category);
      if (f.alert)    params.set("alert",    f.alert);

      const res = await fetch(`/api/offers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch offers");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");

      setEntries(json.data);
      setSummary(json.summary ?? EMPTY_SUMMARY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load offers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(filters); }, [fetchData, filters]);

  function setFilter<K extends keyof OfferFilters>(key: K, value: OfferFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() { setFilters(EMPTY_FILTERS); }

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  async function addOffer(data: OfferFormData): Promise<void> {
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to add offer");
    await fetchData(filters);
  }

  async function editOffer(id: number, data: Partial<OfferFormData>): Promise<void> {
    const res = await fetch(`/api/offers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to update offer");
    await fetchData(filters);
  }

  async function deleteOffer(id: number): Promise<void> {
    const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to delete offer");
    await fetchData(filters);
  }

  async function toggleAlert(id: number): Promise<void> {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const res = await fetch(`/api/offers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ has_alert: entry.has_alert === 1 ? 0 : 1 }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to toggle alert");
    await fetchData(filters);
  }

  return {
    entries,
    summary,
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    addOffer,
    editOffer,
    deleteOffer,
    toggleAlert,
    refresh: () => fetchData(filters),
  };
}
