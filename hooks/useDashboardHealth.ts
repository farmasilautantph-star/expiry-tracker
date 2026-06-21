"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface StaleItem {
  id: number;
  description: string;
  barcode: string;
  category: string;
  pic_name: string;
  last_reviewed_at: string | null;
  days_since_review: number;
  review_status: "early_alert" | "last_chance" | "needs_review" | "critical_stale";
  urgency: "warn" | "urgent" | "missed" | "critical";
  sunday_label: string;
}

export interface ReviewDeadline {
  lastSunday: string;
  nextSunday: string;
  prevSunday: string;
  timezone: string;
}

export interface CompletionRate {
  pic_name: string;
  total: number;
  reviewed_on_time: number;
  needs_review: number;
  critical_stale: number;
  completion_rate: number;
}

export interface SystemHealth {
  score: number;
  label: string;
  color: string;
  totalActive: number;
  expired:  { count: number; penalty: number };
  critical: { count: number; penalty: number };
  warning:  { count: number; penalty: number };
  safe:     { count: number; penalty: number };
  totalPenalty: number;
}

export interface HealthData {
  systemHealth: SystemHealth;
  reviewDeadline: ReviewDeadline;
  staleItems: StaleItem[];
  completionRates: CompletionRate[];
}

interface UseDashboardHealthReturn {
  healthData: HealthData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useDashboardHealth(): UseDashboardHealthReturn {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/health");
      if (!res.ok) throw new Error("Failed to fetch health data");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      setHealthData(json.data as HealthData);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load health data",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    intervalRef.current = setInterval(fetchHealth, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchHealth]);

  return { healthData, isLoading, error, refresh: fetchHealth };
}
