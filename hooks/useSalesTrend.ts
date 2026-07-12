"use client";

import { useEffect, useState } from "react";

export interface SalesTrendPoint {
  month: string;
  label: string;
  longLabel: string;
  units: number;
}

interface UseSalesTrendReturn {
  data: SalesTrendPoint[];
  isLoading: boolean;
}

// Fixed rolling 10-month window — fetched once and never re-fetched on filter
// changes, since Sales Volume Trend is intentionally filter-independent.
export function useSalesTrend(): UseSalesTrendReturn {
  const [data, setData] = useState<SalesTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/expiry/sales/trend");
        const json = await res.json();
        if (!cancelled && json.success) setData(json.data);
      } catch {
        /* silent — trend chart is supplemental */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading };
}
