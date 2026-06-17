"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface CategoryBreakdown {
  category: string;
  expired: number;
  critical: number;
  warning: number;
  safe: number;
}

export interface TimelinePoint {
  month: string;
  count: number;
}

export interface ReturnStatus {
  pending: number;
  returned: number;
  overdue: number;
}

export interface UrgentItem {
  id: number;
  description: string;
  category: string;
  expiry_date: string;
  days_left: number;
  urgency: "expired" | "critical" | "warning";
  pic_name: string;
}

export interface ChartData {
  categoryBreakdown: CategoryBreakdown[];
  expiryTimeline: TimelinePoint[];
  returnStatus: ReturnStatus;
  topUrgentItems: UrgentItem[];
}

interface UseDashboardChartsReturn {
  chartData: ChartData | null;
  isLoading: boolean;
  error: string | null;
}

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useDashboardCharts(): UseDashboardChartsReturn {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCharts = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/charts");
      if (!res.ok) throw new Error("Failed to fetch chart data");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      setChartData({
        categoryBreakdown: json.categoryBreakdown,
        expiryTimeline: json.expiryTimeline,
        returnStatus: json.returnStatus,
        topUrgentItems: json.topUrgentItems,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load charts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCharts();
    intervalRef.current = setInterval(fetchCharts, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCharts]);

  return { chartData, isLoading, error };
}
