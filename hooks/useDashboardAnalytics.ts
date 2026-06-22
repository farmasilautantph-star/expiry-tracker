"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface CategoryHeatmapEntry {
  category: string;
  expired: number;
  critical: number;
  warning: number;
  safe: number;
  total: number;
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
}

export interface ResolutionRate {
  total: number;
  sold: number;
  sold_pct: number;
  returned: number;
  returned_pct: number;
  offered: number;
  offered_pct: number;
  active: number;
  active_pct: number;
}

export interface MonthlyTrendEntry {
  month: string;
  logged: number;
  sold: number;
  returned: number;
  offered: number;
}

export interface AnalyticsData {
  categoryHeatmap: CategoryHeatmapEntry[];
  resolutionRate: ResolutionRate;
  monthlyTrend: MonthlyTrendEntry[];
}

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let cachedData: AnalyticsData | null = null;
let cacheTime = 0;

export function useDashboardAnalytics(isManager: boolean) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchAnalytics = useCallback(async () => {
    if (!isManager) {
      setAnalyticsLoading(false);
      return;
    }

    const now = Date.now();
    if (cachedData && now - cacheTime < CACHE_TTL) {
      setAnalyticsData(cachedData);
      setAnalyticsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/dashboard/analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      cachedData = json.data as AnalyticsData;
      cacheTime = Date.now();
      if (mountedRef.current) {
        setAnalyticsData(cachedData);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      }
    } finally {
      if (mountedRef.current) setAnalyticsLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    mountedRef.current = true;
    fetchAnalytics();
    return () => { mountedRef.current = false; };
  }, [fetchAnalytics]);

  return { analyticsData, analyticsLoading, error, refresh: fetchAnalytics };
}
