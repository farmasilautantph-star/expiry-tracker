"use client";

import { useMemo, useState } from "react";
import ShortListTable from "./ShortListTable";
import ShortListFilters from "./ShortListFilters";
import ShortListSummary from "./ShortListSummary";
import ExpiryForm from "@/components/expiry/ExpiryForm";
import OfferForm from "@/components/offers/OfferForm";
import type {
  ShortListEntry,
  ShortListFilters as Filters,
  ShortListCounts,
} from "@/hooks/useShortList";
import type { ExpiryFormData } from "@/hooks/useExpiry";
import type { OfferFormData } from "@/hooks/useOffers";

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
  onAddOffer: (data: OfferFormData) => Promise<void>;
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
  onAddOffer,
}: Props) {
  const [editingEntry, setEditingEntry] = useState<ShortListEntry | null>(null);
  const [offeringEntry, setOfferingEntry] = useState<ShortListEntry | null>(
    null,
  );

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

  const offerSource = offeringEntry
    ? {
        expiry_log_id: offeringEntry.id,
        stock_id: offeringEntry.stock_id,
        barcode: offeringEntry.barcode,
        description: offeringEntry.description,
        category: offeringEntry.category,
        uom: offeringEntry.uom,
        expiry_date: offeringEntry.expiry_date,
        quantity: offeringEntry.quantity,
        total_offered: offeringEntry.total_offered,
      }
    : undefined;

  return (
    <div className="space-y-4">
      <ShortListFilters
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        isManager={isManager}
        picOptions={picOptions}
      />

      <ShortListSummary counts={counts} isLoading={isLoading} />

      <ShortListTable
        entries={entries}
        isLoading={isLoading}
        isManager={isManager}
        onEditRequest={setEditingEntry}
        onDeleteRequest={handleDeleteRequest}
        onOfferRequest={setOfferingEntry}
      />

      {isManager && (
        <>
          <ExpiryForm
            isOpen={editingEntry !== null}
            onClose={() => setEditingEntry(null)}
            editingEntry={editingEntry}
            picName={picName}
            onSubmit={handleFormSubmit}
          />

          <OfferForm
            isOpen={offeringEntry !== null}
            onClose={() => setOfferingEntry(null)}
            source={offerSource}
            onSubmit={async (data) => {
              await onAddOffer(data);
              setOfferingEntry(null);
            }}
          />
        </>
      )}
    </div>
  );
}
