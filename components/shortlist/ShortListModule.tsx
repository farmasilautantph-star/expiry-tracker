"use client";

import { useMemo, useState } from "react";
import ShortListTable from "./ShortListTable";
import ShortListFilters from "./ShortListFilters";
import ShortListSummary from "./ShortListSummary";
import ExpiryForm from "@/components/expiry/ExpiryForm";
import type {
  ShortListEntry,
  ShortListFilters as Filters,
  ShortListCounts,
} from "@/hooks/useShortList";

import type { ExpiryFormData } from "@/hooks/useExpiry";

interface Props {
  entries: ShortListEntry[];
  counts: ShortListCounts;
  isLoading: boolean;
  isManager: boolean;
  picName: string;
  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  onEdit: (id: number, data: ExpiryFormData) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => Promise<void>;
  onPatchEntry?: (id: number, patch: Partial<ShortListEntry>) => void;
  onSwitchToSales?: () => void;
}

export default function ShortListModule({
  entries,
  counts,
  isLoading,
  isManager,
  picName,
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  onEdit,
  onDelete,
  onRefresh,
  onPatchEntry,
  onSwitchToSales,
}: Props) {
  const [editingEntry, setEditingEntry] = useState<ShortListEntry | null>(null);

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

  const categoryOptions = useMemo(() => {
    const seen: Record<string, true> = {};
    for (const e of entries) {
      if (e.category) seen[e.category] = true;
    }
    return Object.keys(seen).sort();
  }, [entries]);

  async function handleDeleteRequest(entry: ShortListEntry) {
    if (!confirm(`Delete "${entry.description}"?\n\nThis cannot be undone.`))
      return;
    await onDelete(entry.id);
  }

  async function handleFormSubmit(data: ExpiryFormData) {
    if (!editingEntry) return;
    await onEdit(editingEntry.id, data);
    setEditingEntry(null);
  }

  return (
    <div className="space-y-4">
      <ShortListFilters
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        isManager={isManager}
        picOptions={picOptions}
        categoryOptions={categoryOptions}
      />

      <ShortListSummary counts={counts} isLoading={isLoading} />

      <ShortListTable
        entries={entries}
        isLoading={isLoading}
        isManager={isManager}
        currentPicName={picName}
        onEditRequest={setEditingEntry}
        onDeleteRequest={handleDeleteRequest}
        onMarkReviewed={onRefresh}
        onPatchEntry={onPatchEntry}
        onSwitchToSales={onSwitchToSales}
      />

      {isManager && (
        <ExpiryForm
          isOpen={editingEntry !== null}
          onClose={() => setEditingEntry(null)}
          editingEntry={editingEntry}
          picName={picName}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}
