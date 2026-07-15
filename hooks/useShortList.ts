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
  quantity: number;
  return_status: string | null;
  return_by_date: string | null;
  original_qty: number | null;
  sold_at: string | null;
  sold_by: string | null;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  last_reviewed_display: string | null;
  item_status: "active" | "sold" | "completed";
  days_left: number;
  urgency: "expired" | "critical" | "warning" | "safe";
  review_status: "pending" | "early_alert" | "last_chance" | "needs_review" | "critical_stale" | "resolved";
  offer_status:
    | "not-offered"
    | "offered"
    | "accepted"
    | "rejected"
    | "completed";
  offer_id: number | null;
  total_offered: number;
  offered_qty: number;
  has_active_offer: boolean;
  remarks: string | null;
  is_push_item: boolean;
  push_item_marked_at: string | null;
  push_item_marked_by: number | null;
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
  push: number;
  total: number;
}

const EMPTY_FILTERS: ShortListFilters = {
  search: "",
  category: "",
  status: "",
  pic: "",
  return_status: "",
};

const EMPTY_COUNTS: ShortListCounts = {
  expired: 0,
  critical: 0,
  warning: 0,
  safe: 0,
  push: 0,
  total: 0,
};

interface UseShortListReturn {
  entries: ShortListEntry[];
  pushEntries: ShortListEntry[];
  counts: ShortListCounts;
  isLoading: boolean;
  error: string | null;
  filters: ShortListFilters;
  setFilter: <K extends keyof ShortListFilters>(
    key: K,
    value: ShortListFilters[K],
  ) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  refresh: () => Promise<void>;
  patchEntry: (id: number, patch: Partial<ShortListEntry>) => void;
  removeEntry: (id: number) => void;
}

export function useShortList(): UseShortListReturn {
  const [entries, setEntries] = useState<ShortListEntry[]>([]);
  const [pushEntries, setPushEntries] = useState<ShortListEntry[]>([]);
  const [counts, setCounts] = useState<ShortListCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ShortListFilters>(EMPTY_FILTERS);

  const fetchPushItems = useCallback(async () => {
    try {
      const res = await fetch("/api/shortlist?push_only=true");
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success) return;
      const data: ShortListEntry[] = json.data;
      setPushEntries(data.slice().sort((a, b) => a.days_left - b.days_left));
    } catch {
      /* silent — push items are supplemental */
    }
  }, []);

  const fetchData = useCallback(async (f: ShortListFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.search) params.set("search", f.search);
      if (f.category) params.set("category", f.category);
      if (f.status) params.set("status", f.status);
      if (f.pic) params.set("pic", f.pic);

      const url = `/api/shortlist${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch shortlist");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");

      let data: ShortListEntry[] = json.data;
      if (f.return_status === "none") {
        data = data.filter((e) => !e.return_status);
      } else if (f.return_status === "returnable") {
        // any tracked return (pending, returned, returning, not_approved — not null,
        // and not non-returnable / exchangeable which have no return workflow)
        data = data.filter(
          (e) =>
            e.return_status &&
            e.return_status !== "non-returnable" &&
            e.return_status !== "exchangeable",
        );
      } else if (f.return_status) {
        data = data.filter((e) => e.return_status === f.return_status);
      }

      setEntries(data);
      const c: ShortListCounts = {
        expired: 0,
        critical: 0,
        warning: 0,
        safe: 0,
        push: 0, // overridden with pushEntries.length at return time
        total: data.length,
      };
      for (const e of data) {
        const u = e.urgency;
        if (u === "expired" || u === "critical" || u === "warning" || u === "safe") {
          c[u]++;
        }
      }
      setCounts(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(filters);
  }, [fetchData, filters]);

  useEffect(() => {
    fetchPushItems();
  }, [fetchPushItems]);

  function setFilter<K extends keyof ShortListFilters>(
    key: K,
    value: ShortListFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const patchEntry = useCallback((id: number, patch: Partial<ShortListEntry>) => {
    let mergedEntry: ShortListEntry | undefined;
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      mergedEntry = { ...e, ...patch };
      return mergedEntry;
    }));

    if (!("is_push_item" in patch)) {
      setPushEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
      return;
    }

    // is_push_item changed: pushEntries is a separately-fetched list, so a
    // plain map won't add newly-marked items or drop newly-unmarked ones —
    // keep it (and therefore counts.push, which is derived from it) in sync.
    setPushEntries(prev => {
      const withoutId = prev.filter(e => e.id !== id);
      if (!patch.is_push_item) return withoutId;
      const source = prev.find(e => e.id === id) ?? mergedEntry;
      if (!source) return prev;
      return [...withoutId, { ...source, ...patch }].sort((a, b) => a.days_left - b.days_left);
    });
  }, []);

  const removeEntry = useCallback((id: number) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  return {
    entries,
    pushEntries,
    // push count is derived from pushEntries so it can never drift out of
    // sync with the list that actually drives the tab badge
    counts: { ...counts, push: pushEntries.length },
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    refresh: async () => {
      await Promise.all([fetchData(filters), fetchPushItems()]);
    },
    patchEntry,
    removeEntry: (id) => {
      removeEntry(id);
      setPushEntries(prev => prev.filter(e => e.id !== id));
    },
  };
}
