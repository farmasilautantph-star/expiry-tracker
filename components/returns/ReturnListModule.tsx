"use client";

import { useMemo, useState } from "react";
import ReturnListTable from "./ReturnListTable";
import ReturnListFilters from "./ReturnListFilters";
import ReturnForm from "./ReturnForm";
import type { ReturnEntry, ReturnFilters, ReturnFormData, ReturnCounts } from "@/hooks/useReturns";

interface Props {
  entries: ReturnEntry[];
  counts: ReturnCounts;
  isLoading: boolean;
  isManager: boolean;
  picName: string;
  filters: ReturnFilters;
  setFilter: <K extends keyof ReturnFilters>(key: K, value: ReturnFilters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  onAdd: (data: ReturnFormData) => Promise<void>;
  onEdit: (id: number, data: ReturnFormData) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onMarkReturned: (id: number) => Promise<void>;
}

export default function ReturnListModule({
  entries,
  counts,
  isLoading,
  isManager,
  picName,
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  onAdd,
  onEdit,
  onDelete,
  onMarkReturned,
}: Props) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ReturnEntry | null>(null);

  const picOptions = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const e of entries) {
      if (!seen.has(e.pic_name)) { seen.add(e.pic_name); names.push(e.pic_name); }
    }
    return names.sort();
  }, [entries]);

  function handleEditRequest(entry: ReturnEntry) {
    setEditingEntry(entry);
    setIsFormOpen(true);
  }

  async function handleDeleteRequest(entry: ReturnEntry) {
    if (!confirm(`Delete return for "${entry.description}"?\n\nThis cannot be undone.`)) return;
    await onDelete(entry.id);
  }

  async function handleMarkReturnedRequest(entry: ReturnEntry) {
    if (!confirm(`Mark "${entry.description}" as returned?`)) return;
    await onMarkReturned(entry.id);
  }

  async function handleFormSubmit(data: ReturnFormData) {
    if (editingEntry) {
      await onEdit(editingEntry.id, data);
    } else {
      await onAdd(data);
    }
  }

  function handleFormClose() {
    setIsFormOpen(false);
    setEditingEntry(null);
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-yellow-500/10 border-yellow-500/20 text-yellow-400">
          <span className="text-xs font-medium opacity-80">🟡 Pending</span>
          {isLoading
            ? <span className="w-5 h-4 rounded bg-current opacity-20 animate-pulse" />
            : <span className="text-sm font-bold">{counts.pending}</span>}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-green-500/10 border-green-500/20 text-green-400">
          <span className="text-xs font-medium opacity-80">✅ Returned</span>
          {isLoading
            ? <span className="w-5 h-4 rounded bg-current opacity-20 animate-pulse" />
            : <span className="text-sm font-bold">{counts.returned}</span>}
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 self-center pr-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          {isLoading ? "…" : `${counts.total} total`}
        </div>
      </div>

      {/* Filters row + Log Return button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <ReturnListFilters
            filters={filters}
            setFilter={setFilter}
            clearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
            isManager={isManager}
            picOptions={picOptions}
          />
        </div>
        <button
          onClick={() => { setEditingEntry(null); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Return
        </button>
      </div>

      <ReturnListTable
        entries={entries}
        isLoading={isLoading}
        isManager={isManager}
        onEditRequest={handleEditRequest}
        onDeleteRequest={handleDeleteRequest}
        onMarkReturnedRequest={handleMarkReturnedRequest}
      />

      <ReturnForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        picName={picName}
        editingEntry={editingEntry}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
