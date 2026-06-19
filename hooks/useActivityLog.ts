"use client";

import { useMemo, useState } from "react";

export interface TimelineEvent {
  id: string;
  date: string;
  event_type: string;
  title: string;
  description: string;
  pic_name: string;
  color: string;
  icon: string;
}

export interface ActivityEntry {
  entry_id: number;
  barcode: string;
  description: string;
  stock_id: string | null;
  category: string;
  uom: string | null;
  pic_name: string;
  logged_at: string;
  current_qty: number;
  original_qty: number | null;
  expiry_date: string;
  days_left: number;
  urgency: string;
  item_status: string;
  timeline: TimelineEvent[];
}

export interface ActivitySearchResult {
  found: boolean;
  access_denied?: boolean;
  entries: ActivityEntry[];
  multiple: boolean;
  message?: string;
}

const RECENT_KEY = "activity-log-recent";

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useActivityLog() {
  const [barcode, setBarcode] = useState("");
  const [searchResult, setSearchResult] = useState<ActivitySearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecent);

  const currentEntry = useMemo((): ActivityEntry | null => {
    if (!searchResult?.found || !searchResult.entries.length) return null;
    if (selectedEntryId != null) {
      return (
        searchResult.entries.find((e) => e.entry_id === selectedEntryId) ?? null
      );
    }
    return null;
  }, [searchResult, selectedEntryId]);

  const currentTimeline = useMemo(
    () => currentEntry?.timeline ?? [],
    [currentEntry],
  );

  function addToRecent(bc: string) {
    const trimmed = bc.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((r) => r !== trimmed)].slice(0, 5);
      try {
        sessionStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  async function searchBarcode(bc: string) {
    const trimmed = bc.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setError(null);
    setSearchResult(null);
    setSelectedEntryId(null);
    try {
      const res = await fetch(
        `/api/expiry/activity?barcode=${encodeURIComponent(trimmed)}`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to search");
      const result = json as ActivitySearchResult;
      setSearchResult(result);
      if (result.found) {
        addToRecent(trimmed);
        // Auto-select single entry; leave null for multiple (show selector)
        if (!result.multiple && result.entries.length === 1) {
          setSelectedEntryId(result.entries[0].entry_id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  }

  function selectEntry(id: number) {
    setSelectedEntryId(id);
  }

  function clearSearch() {
    setBarcode("");
    setSearchResult(null);
    setError(null);
    setSelectedEntryId(null);
  }

  return {
    barcode,
    setBarcode,
    searchResult,
    isLoading,
    error,
    selectedEntryId,
    currentEntry,
    currentTimeline,
    recentSearches,
    searchBarcode,
    selectEntry,
    clearSearch,
  };
}
