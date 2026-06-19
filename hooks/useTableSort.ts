"use client";

import { useCallback, useEffect, useState } from "react";

export type SortDirection = "asc" | "desc" | null;
export type SortConfig = { column: string | null; direction: SortDirection };

const STORAGE_KEY = "shortlist-sort";

function loadFromStorage(): SortConfig {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SortConfig;
  } catch {}
  return { column: null, direction: null };
}

export function useTableSort() {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: null });

  // Hydrate from sessionStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    setSortConfig(loadFromStorage());
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sortConfig));
  }, [sortConfig]);

  const handleSort = useCallback((column: string) => {
    setSortConfig((prev) => {
      if (prev.column !== column) return { column, direction: "asc" };
      if (prev.direction === "asc") return { column, direction: "desc" };
      return { column: null, direction: null };
    });
  }, []);

  const clearSort = useCallback(() => {
    setSortConfig({ column: null, direction: null });
  }, []);

  const sortData = useCallback(
    <T extends Record<string, unknown>>(data: T[]): T[] => {
      const { column, direction } = sortConfig;
      if (!column || !direction) return data;
      return [...data].sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        let cmp: number;
        if (typeof av === "number" && typeof bv === "number") {
          cmp = av - bv;
        } else {
          cmp = String(av).toLowerCase().localeCompare(String(bv).toLowerCase());
        }
        return direction === "asc" ? cmp : -cmp;
      });
    },
    [sortConfig],
  );

  return { sortConfig, handleSort, clearSort, sortData };
}
