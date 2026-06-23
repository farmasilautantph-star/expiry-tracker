"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface OfferEntry {
  id: number;
  expiry_log_id: number | null;
  stock_id: string | null;
  barcode: string;
  description: string;
  category: string | null;
  uom: string | null;
  quantity: number;
  outlet_name: string;
  offer_status: "offered" | "accepted" | "rejected" | "completed";
  has_alert: boolean;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  received_at: string | null;
  rejection_notes: string | null;
  expiry_date: string | null;
  days_left: number | null;
}

export interface OfferFilters {
  search: string;
  category: string;
  status: string;
  has_alert: string;
  month: string;
}

export interface OfferCounts {
  offered: number;
  accepted: number;
  rejected: number;
  completed: number;
  total: number;
}

export interface OfferFormData {
  expiry_log_id?: number | null;
  stock_id?: string;
  barcode: string;
  description: string;
  category?: string;
  uom?: string;
  outlet_name: string;
  quantity: number;
  offer_status: string;
  has_alert: boolean;
  notes?: string;
}

const EMPTY_FILTERS: OfferFilters = {
  search: "",
  category: "",
  status: "",
  has_alert: "",
  month: "",
};
const EMPTY_COUNTS: OfferCounts = {
  offered: 0,
  accepted: 0,
  rejected: 0,
  completed: 0,
  total: 0,
};

interface UseOffersReturn {
  entries: OfferEntry[];
  counts: OfferCounts;
  isLoading: boolean;
  error: string | null;
  filters: OfferFilters;
  setFilter: <K extends keyof OfferFilters>(
    key: K,
    value: OfferFilters[K],
  ) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  addOffer: (data: OfferFormData) => Promise<void>;
  updateOffer: (id: number, data: Partial<OfferFormData>) => Promise<void>;
  deleteOffer: (id: number) => Promise<void>;
  toggleAlert: (id: number) => Promise<void>;
  updateOfferStatus: (
    id: number,
    status: "accepted" | "rejected",
    opts?: { received_at?: string; rejection_notes?: string }
  ) => Promise<{ qty_deducted: number; item_completed: boolean }>;
  refresh: () => Promise<void>;
}

export function useOffers(): UseOffersReturn {
  const [entries, setEntries] = useState<OfferEntry[]>([]);
  const [counts, setCounts] = useState<OfferCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OfferFilters>(EMPTY_FILTERS);

  const fetchData = useCallback(async (f: OfferFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.search) params.set("search", f.search);
      if (f.category) params.set("category", f.category);
      if (f.status) params.set("status", f.status);
      if (f.has_alert) params.set("has_alert", f.has_alert);
      if (f.month) params.set("month", f.month);

      const res = await fetch(`/api/offers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch offers");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");

      setEntries(json.data);
      setCounts(json.counts ?? EMPTY_COUNTS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load offers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(filters);
  }, [fetchData, filters]);

  function setFilter<K extends keyof OfferFilters>(
    key: K,
    value: OfferFilters[K],
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

  async function addOffer(data: OfferFormData): Promise<void> {
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to add offer");
    await fetchData(filters);
  }

  async function updateOffer(
    id: number,
    data: Partial<OfferFormData>,
  ): Promise<void> {
    const res = await fetch(`/api/offers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to update offer");
    await fetchData(filters);
  }

  async function deleteOffer(id: number): Promise<void> {
    const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to delete offer");
    await fetchData(filters);
  }

  async function updateOfferStatus(
    id: number,
    status: "accepted" | "rejected",
    opts?: { received_at?: string; rejection_notes?: string }
  ): Promise<{ qty_deducted: number; item_completed: boolean }> {
    const res = await fetch(`/api/offers/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_status: status, ...opts }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to update offer status");
    await fetchData(filters);
    return {
      qty_deducted: json.qty_deducted ?? 0,
      item_completed: json.item_completed ?? false,
    };
  }

  async function toggleAlert(id: number): Promise<void> {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    await updateOffer(id, { has_alert: !entry.has_alert });
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
    addOffer,
    updateOffer,
    deleteOffer,
    toggleAlert,
    updateOfferStatus,
    refresh: () => fetchData(filters),
  };
}
