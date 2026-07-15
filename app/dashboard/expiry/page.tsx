"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useExpiry, ExpiryEntry } from "@/hooks/useExpiry";
import ExpiryModule from "@/components/expiry/ExpiryModule";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

export default function ExpiryPage() {
  const { user, isManager } = useAuth();
  const { entries, isLoading, error, addEntry, editEntry, deleteEntry, refresh } =
    useExpiry();
  const { toasts, showSuccess, dismiss } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExpiryEntry | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [picFilter, setPicFilter] = useState("");
  const [returnFilter, setReturnFilter] = useState("");

  const categoryOptions = useMemo(() => {
    const seen: Record<string, true> = {};
    for (const e of entries) {
      if (e.category) seen[e.category] = true;
    }
    return Object.keys(seen).sort();
  }, [entries]);

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

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        const inDesc = e.description.toLowerCase().includes(q);
        const inBarcode = e.barcode.toLowerCase().includes(q);
        const inStock = (e.stock_id ?? "").toLowerCase().includes(q);
        if (!inDesc && !inBarcode && !inStock) return false;
      }
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (picFilter && e.pic_name !== picFilter) return false;
      if (returnFilter) {
        if (returnFilter === "none" && e.return_status !== null) return false;
        if (returnFilter !== "none" && e.return_status !== returnFilter)
          return false;
      }
      return true;
    });
  }, [entries, search, categoryFilter, picFilter, returnFilter]);

  function openAdd() {
    setEditingEntry(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingEntry(null);
  }

  const hasFilter = search || categoryFilter || picFilter || returnFilter;

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1e293b]">
            Log New Expiry
          </h2>
          <p className="text-sm text-[#64748b] mt-0.5">
            {isManager
              ? "All entries across all PICs."
              : `Your entries (${user.picName}).`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Entry
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search desc, barcode, stock ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-white border border-[#e2e8f0] text-[#1e293b] placeholder-[#94a3b8] text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3b82f6] transition"
          />
        </div>

        {/* Category */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white border border-[#e2e8f0] text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3b82f6] transition"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* PIC — manager only */}
        {isManager && (
          <select
            value={picFilter}
            onChange={(e) => setPicFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-[#e2e8f0] text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3b82f6] transition"
          >
            <option value="">All PICs</option>
            {picOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}

        {/* Return status */}
        <select
          value={returnFilter}
          onChange={(e) => setReturnFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white border border-[#e2e8f0] text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3b82f6] transition"
        >
          <option value="">All Returns</option>
          <option value="pending">Returnable</option>
          <option value="non-returnable">Non-Returnable</option>
          <option value="exchangeable">Exchangeable</option>
          <option value="none">Not Set</option>
        </select>

        {/* Clear */}
        {hasFilter && (
          <button
            onClick={() => {
              setSearch("");
              setCategoryFilter("");
              setPicFilter("");
              setReturnFilter("");
            }}
            className="px-3 py-2 rounded-lg text-xs text-[#64748b] hover:text-[#1e293b] hover:bg-[#f1f5f9] border border-[#e2e8f0] hover:border-[#cbd5e1] transition-colors"
          >
            Clear
          </button>
        )}

        <span className="ml-auto text-xs text-[#94a3b8]">
          {filtered.length} of {entries.length} entries
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#ef4444]">
          {error}
        </div>
      )}

      {/* Table + form */}
      <ExpiryModule
        entries={filtered}
        isLoading={isLoading}
        isManager={isManager}
        picName={user.picName}
        onAdd={addEntry}
        onEdit={editEntry}
        onDelete={deleteEntry}
        showForm={showForm}
        onCloseForm={closeForm}
        editingEntry={editingEntry}
        onAddStockSuccess={({ additionalQty, newQty }) => {
          refresh();
          showSuccess(`Stock updated! +${additionalQty} unit(s) added. New total: ${newQty} units`);
        }}
      />
      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
