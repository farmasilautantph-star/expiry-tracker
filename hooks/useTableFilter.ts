"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "shortlist-column-filters";

function loadFromStorage(): Record<string, string[]> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string[]>;
  } catch {}
  return {};
}

export function useTableFilter() {
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});

  // Hydrate from sessionStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    setColumnFilters(loadFromStorage());
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(columnFilters));
  }, [columnFilters]);

  const setColumnFilter = useCallback((column: string, values: string[]) => {
    setColumnFilters((prev) => {
      if (values.length === 0) {
        const next = { ...prev };
        delete next[column];
        return next;
      }
      return { ...prev, [column]: values };
    });
  }, []);

  const clearColumnFilter = useCallback((column: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[column];
      return next;
    });
  }, []);

  const clearAllColumnFilters = useCallback(() => {
    setColumnFilters({});
  }, []);

  const filterData = useCallback(
    <T extends Record<string, unknown>>(data: T[]): T[] => {
      const active = Object.entries(columnFilters).filter(([, v]) => v.length > 0);
      if (active.length === 0) return data;
      return data.filter((row) =>
        active.every(([col, values]) => {
          const val = row[col];
          const str = val === null || val === undefined ? "—" : String(val);
          return values.includes(str);
        }),
      );
    },
    [columnFilters],
  );

  const getUniqueValues = useCallback(
    <T extends Record<string, unknown>>(data: T[], column: string): string[] => {
      const seen = new Set<string>();
      for (const row of data) {
        const val = row[column];
        seen.add(val === null || val === undefined ? "—" : String(val));
      }
      return Array.from(seen).sort((a, b) => {
        if (a === "—") return 1;
        if (b === "—") return -1;
        return a.localeCompare(b);
      });
    },
    [],
  );

  return {
    columnFilters,
    setColumnFilter,
    clearColumnFilter,
    clearAllColumnFilters,
    filterData,
    getUniqueValues,
  };
}
