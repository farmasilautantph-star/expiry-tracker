"use client";

import OffersFilters from "./OffersFilters";
import OffersSummary from "./OffersSummary";
import OffersTable from "./OffersTable";
import type {
  OfferEntry,
  OfferFilters,
  OfferCounts,
  OfferFormData,
} from "@/hooks/useOffers";

interface Props {
  entries: OfferEntry[];
  counts: OfferCounts;
  isLoading: boolean;
  filters: OfferFilters;
  setFilter: <K extends keyof OfferFilters>(
    key: K,
    value: OfferFilters[K],
  ) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  onUpdate: (id: number, data: Partial<OfferFormData>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onToggleAlert: (id: number) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export default function OffersModule({
  entries,
  counts,
  isLoading,
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  onUpdate,
  onDelete,
  onToggleAlert,
  onRefresh,
}: Props) {
  return (
    <div className="space-y-4">
      <OffersSummary counts={counts} isLoading={isLoading} />

      <OffersFilters
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
      />

      <OffersTable
        entries={entries}
        isLoading={isLoading}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onToggleAlert={onToggleAlert}
        onRefresh={onRefresh}
      />
    </div>
  );
}
