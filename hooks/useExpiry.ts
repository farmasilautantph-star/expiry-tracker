"use client";

import { useCallback, useEffect, useState } from "react";

export interface ExpiryEntry {
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
  return_status: string | null;
  return_by_date: string | null;
}

export interface ExpiryFormData {
  barcode: string;
  description: string;
  category: string;
  expiry_date: string;
  notes: string;
  stock_id: string;
  uom: string;
  quantity: number;
  return_status: "pending" | "non-returnable" | "";
  return_by_date: string;
}

export interface ProductResult {
  id: number;
  stock_id: string | null;
  barcode: string | null;
  description: string | null;
  uom: string | null;
  category_id: string | null;
}

interface UseExpiryReturn {
  entries: ExpiryEntry[];
  isLoading: boolean;
  error: string | null;
  addEntry: (data: ExpiryFormData) => Promise<void>;
  editEntry: (id: number, data: ExpiryFormData) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
}

export function useExpiry(): UseExpiryReturn {
  const [entries, setEntries] = useState<ExpiryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/expiry");
      if (!res.ok) throw new Error("Failed to fetch entries");
      const data = await res.json();
      if (data.success) setEntries(data.data);
      else throw new Error(data.error ?? "Unknown error");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function addEntry(data: ExpiryFormData): Promise<void> {
    const res = await fetch("/api/expiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to add entry");
    await fetchEntries();
  }

  async function editEntry(id: number, data: ExpiryFormData): Promise<void> {
    const res = await fetch(`/api/expiry/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to update entry");
    await fetchEntries();
  }

  async function deleteEntry(id: number): Promise<void> {
    const res = await fetch(`/api/expiry/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.error ?? "Failed to delete entry");
    await fetchEntries();
  }

  return { entries, isLoading, error, addEntry, editEntry, deleteEntry };
}
