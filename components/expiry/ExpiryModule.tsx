"use client";

import { useState } from "react";
import ExpiryTable from "./ExpiryTable";
import ExpiryForm from "./ExpiryForm";
import { ExpiryEntry, ExpiryFormData } from "@/hooks/useExpiry";

interface Props {
  entries: ExpiryEntry[];
  isLoading: boolean;
  isManager: boolean;
  picName: string;
  onAdd: (data: ExpiryFormData) => Promise<void>;
  onEdit: (id: number, data: ExpiryFormData) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  showForm: boolean;
  onCloseForm: () => void;
  editingEntry: ExpiryEntry | null;
}

export default function ExpiryModule({
  entries,
  isLoading,
  isManager,
  picName,
  onAdd,
  onEdit,
  onDelete,
  showForm,
  onCloseForm,
  editingEntry: externalEditingEntry,
}: Props) {
  const [localEditingEntry, setLocalEditingEntry] =
    useState<ExpiryEntry | null>(null);
  const [localShowForm, setLocalShowForm] = useState(false);

  const activeEditingEntry = externalEditingEntry ?? localEditingEntry;
  const isFormOpen = showForm || localShowForm;

  function handleCloseForm() {
    onCloseForm();
    setLocalShowForm(false);
    setLocalEditingEntry(null);
  }

  function handleEditRequest(entry: ExpiryEntry) {
    setLocalEditingEntry(entry);
    setLocalShowForm(true);
  }

  async function handleDeleteRequest(entry: ExpiryEntry) {
    if (!confirm(`Delete "${entry.description}"?\n\nThis cannot be undone.`))
      return;
    await onDelete(entry.id);
  }

  async function handleSubmit(data: ExpiryFormData) {
    if (activeEditingEntry) {
      await onEdit(activeEditingEntry.id, data);
    } else {
      await onAdd(data);
    }
  }

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-[#f1f5f9] animate-pulse">
            <div className="flex gap-4">
              <div className="h-4 w-24 bg-[#f1f5f9] rounded" />
              <div className="h-4 w-16 bg-[#f1f5f9] rounded" />
              <div className="h-4 flex-1 bg-[#f1f5f9] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <ExpiryTable
        entries={entries}
        isManager={isManager}
        onEditRequest={handleEditRequest}
        onDeleteRequest={handleDeleteRequest}
      />

      <ExpiryForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        editingEntry={activeEditingEntry}
        picName={picName}
        onSubmit={handleSubmit}
      />
    </>
  );
}
