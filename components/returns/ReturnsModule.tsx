"use client";

import { useMemo } from "react";
import ReturnsFilters from "./ReturnsFilters";
import ReturnsSummary from "./ReturnsSummary";
import ReturnsTable from "./ReturnsTable";
import type {
  ReturnEntry,
  ReturnFilters,
  ReturnCounts,
} from "@/hooks/useReturns";

interface Props {
  entries: ReturnEntry[];
  counts: ReturnCounts;
  isLoading: boolean;
  isManager: boolean;
  filters: ReturnFilters;
  setFilter: <K extends keyof ReturnFilters>(
    key: K,
    value: ReturnFilters[K],
  ) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  onMarkReturned: (id: number) => Promise<void>;
  onUpdateReturnDate: (id: number, date: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export default function ReturnsModule({
  entries,
  counts,
  isLoading,
  isManager,
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  onMarkReturned,
  onUpdateReturnDate,
  onRefresh,
}: Props) {
  const picOptions = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const e of entries) {
      if (!seen.has(e.pic_name)) {
        seen.add(e.pic_name);
        names.push(e.pic_name);
      }
    }
    return names.sort();
  }, [entries]);

  return (
    <div className="space-y-4">
      <ReturnsFilters
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        isManager={isManager}
        picOptions={picOptions}
      />

      <ReturnsSummary counts={counts} isLoading={isLoading} />

      <ReturnsTable
        entries={entries}
        isLoading={isLoading}
        isManager={isManager}
        onMarkReturned={onMarkReturned}
        onUpdateReturnDate={onUpdateReturnDate}
        onRefresh={onRefresh}
      />
    </div>
  );
}
