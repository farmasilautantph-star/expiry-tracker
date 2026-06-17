"use client";

import { useAuth } from "@/hooks/useAuth";
import { useReturns } from "@/hooks/useReturns";
import ReturnListModule from "@/components/returns/ReturnListModule";
import type { ReturnFormData } from "@/hooks/useReturns";

export default function ReturnListPage() {
  const { user, isManager } = useAuth();
  const {
    entries,
    counts,
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    addReturn,
    editReturn,
    deleteReturn,
    markReturned,
  } = useReturns();

  if (!user) return null;

  async function handleAdd(data: ReturnFormData): Promise<void> {
    await addReturn(data);
  }

  async function handleEdit(id: number, data: ReturnFormData): Promise<void> {
    await editReturn(id, data);
  }

  async function handleDelete(id: number): Promise<void> {
    await deleteReturn(id);
  }

  async function handleMarkReturned(id: number): Promise<void> {
    await markReturned(id);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Return List</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {isManager
              ? "All return entries across all PICs."
              : `Your logged returns (${user.picName}).`}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <ReturnListModule
        entries={entries}
        counts={counts}
        isLoading={isLoading}
        isManager={isManager}
        picName={user.picName}
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onMarkReturned={handleMarkReturned}
      />
    </div>
  );
}
