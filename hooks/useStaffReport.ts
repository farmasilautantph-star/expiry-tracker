"use client";

import { useCallback, useEffect, useState } from "react";
import type { MonthValue } from "@/components/ui/MonthPicker";

export interface StaffReportRow {
  pic_name: string;
  items_logged: number;
  items_reviewed: number;
  review_rate: number;
  items_sold: number;
  units_sold: number;
  items_returned: number;
  items_offered: number;
  items_active: number;
  missed_sundays: number;
  completion_rate: number;
}

export interface StaffReportData {
  staffReport: StaffReportRow[];
  period: string;
  month: string;
}

export function useStaffReport() {
  const [data, setData] = useState<StaffReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<MonthValue | null>(null);
  // Default to All Time: Active/Missed-Sundays are date-unfiltered, so a
  // current-month default makes every other stat read 0 whenever there's no
  // activity logged this month — producing a logically impossible report
  // (e.g. Active > Logged). All Time keeps the whole report consistent.
  const [allTime, setAllTime] = useState(true);

  const fetch_ = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = "/api/staff-report";
      if (allTime) {
        url += "?all=true";
      } else if (monthFilter) {
        const mo = String(monthFilter.month).padStart(2, "0");
        url += `?month=${monthFilter.year}-${mo}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch staff report");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      setData(json.data as StaffReportData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [monthFilter, allTime]);

  useEffect(() => { fetch_(); }, [fetch_]);

  function setFilter(month: MonthValue | null, isAllTime = false) {
    setAllTime(isAllTime);
    setMonthFilter(isAllTime ? null : month);
  }

  return { data, isLoading, error, monthFilter, allTime, setFilter, refresh: fetch_ };
}
