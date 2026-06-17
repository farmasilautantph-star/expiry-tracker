"use client";

import { useState } from "react";
import OffersFilters from "./OffersFilters";
import OffersForm from "./OffersForm";
import OffersTable from "./OffersTable";
import type { OfferEntry, OfferFilters, OfferFormData, OfferSummary } from "@/hooks/useOffers";

interface Props {
  entries: OfferEntry[];
  summary: OfferSummary;
  isLoading: boolean;
  filters: OfferFilters;
  setFilter: <K extends keyof OfferFilters>(key: K, value: OfferFilters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  onAdd: (data: OfferFormData) => Promise<void>;
  onEdit: (id: number, data: Partial<OfferFormData>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onToggleAlert: (id: number) => Promise<void>;
}

export default function OffersModule({
  entries,
  summary,
  isLoading,
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  onAdd,
  onEdit,
  onDelete,
  onToggleAlert,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5">
          <span className="text-xs text-gray-400">Total Offers</span>
          <span className="text-sm font-bold text-white">{summary.totalOffers}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5">
          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="text-xs text-gray-400">With Alert</span>
          <span className="text-sm font-bold text-amber-400">{summary.withAlert}</span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showAddForm ? "Cancel" : "Add Offer"}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">New Offer</h3>
          <OffersForm
            onSubmit={async (data) => { await onAdd(data); setShowAddForm(false); }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      <OffersFilters
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
      />

      <OffersTable
        entries={entries}
        isLoading={isLoading}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleAlert={onToggleAlert}
      />
    </div>
  );
}
