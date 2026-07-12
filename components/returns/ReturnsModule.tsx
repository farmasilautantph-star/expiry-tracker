"use client";

import { useMemo } from "react";
import ReturnsFilters from "./ReturnsFilters";
import ReturnsSummary from "./ReturnsSummary";
import ReturnAnalytics from "./ReturnAnalytics";
import ReturnsTable from "./ReturnsTable";
import type {
  ReturnEntry,
  ReturnFilters,
  ReturnCounts,
} from "@/hooks/useReturns";
import type { MonthValue } from "@/components/ui/MonthPicker";

interface Props {
  entries: ReturnEntry[];
  allEntries: ReturnEntry[];
  counts: ReturnCounts;
  isLoading: boolean;
  isManager: boolean;
  mode: "active" | "history";
  filters: ReturnFilters;
  setFilter: <K extends keyof ReturnFilters>(
    key: K,
    value: ReturnFilters[K],
  ) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  activeMonth?: MonthValue | null;
  onActiveMonthChange?: (val: MonthValue | null) => void;
  historyMonth?: MonthValue | null;
  onHistoryMonthChange?: (val: MonthValue | null) => void;
  onMarkReturned: (id: number, notes?: string) => Promise<void>;
  onMarkNotApproved: (id: number, notes?: string) => Promise<void>;
  onUpdateReturnDate: (id: number, date: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export default function ReturnsModule({
  entries,
  allEntries,
  counts,
  isLoading,
  isManager,
  mode,
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  activeMonth,
  onActiveMonthChange,
  historyMonth,
  onHistoryMonthChange,
  onMarkReturned,
  onMarkNotApproved,
  onUpdateReturnDate,
  onRefresh,
}: Props) {
  const picOptions = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const e of allEntries) {
      if (!seen.has(e.pic_name)) {
        seen.add(e.pic_name);
        names.push(e.pic_name);
      }
    }
    return names.sort();
  }, [allEntries]);

  const categoryOptions = useMemo(() => {
    const seen: Record<string, true> = {};
    for (const e of allEntries) {
      if (e.category) seen[e.category] = true;
    }
    return Object.keys(seen).sort();
  }, [allEntries]);

  return (
    <div className="space-y-4">
      <ReturnsFilters
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        isManager={isManager}
        picOptions={picOptions}
        categoryOptions={categoryOptions}
        mode={mode}
        activeMonth={activeMonth}
        onActiveMonthChange={onActiveMonthChange}
        historyMonth={historyMonth}
        onHistoryMonthChange={onHistoryMonthChange}
      />

      <ReturnsSummary counts={counts} isLoading={isLoading} />

      {mode === "active" && !isLoading && (
        <ReturnAnalytics entries={entries} counts={counts} />
      )}

      <ReturnsTable
        entries={entries}
        isLoading={isLoading}
        isManager={isManager}
        mode={mode}
        onMarkReturned={onMarkReturned}
        onMarkNotApproved={onMarkNotApproved}
        onUpdateReturnDate={onUpdateReturnDate}
        onRefresh={onRefresh}
      />
    </div>
  );
}
