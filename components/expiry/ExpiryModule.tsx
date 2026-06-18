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
      <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-[#e2e8f0] shadow-sm">
        <div className="flex items-center gap-3 text-[#64748b]">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm">Loading entries…</span>
        </div>
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
