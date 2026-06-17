"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ExpiryEntry, ExpiryFormData, ProductResult } from "@/hooks/useExpiry";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingEntry: ExpiryEntry | null;
  picName: string;
  onSubmit: (data: ExpiryFormData) => Promise<void>;
}

const EMPTY: ExpiryFormData = {
  stock_id: "",
  barcode: "",
  description: "",
  category: "",
  uom: "",
  expiry_date: "",
  return_status: "pending",
  return_by_date: "",
  notes: "",
};

type SearchField = "stock_id" | "barcode" | "description";

// Shared input style
const INPUT =
  "w-full px-3.5 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const INPUT_RO =
  "w-full px-3.5 py-2.5 rounded-lg bg-gray-800/40 border border-gray-700 text-gray-400 text-sm cursor-not-allowed";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-400 mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

export default function ExpiryForm({ isOpen, onClose, editingEntry, picName, onSubmit }: Props) {
  const [form, setForm] = useState<ExpiryFormData>(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Autocomplete state
  const [results, setResults] = useState<ProductResult[]>([]);
  const [activeField, setActiveField] = useState<SearchField | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (editingEntry) {
      setForm({
        stock_id:      editingEntry.stock_id ?? "",
        barcode:       editingEntry.barcode ?? "",
        description:   editingEntry.description ?? "",
        category:      editingEntry.category ?? "",
        uom:           editingEntry.uom ?? "",
        expiry_date:   editingEntry.expiry_date.split("T")[0],
        return_status: (editingEntry.return_status as ExpiryFormData["return_status"]) || "pending",
        return_by_date: editingEntry.return_by_date?.split("T")[0] ?? "",
        notes:         editingEntry.notes ?? "",
      });
    } else {
      setForm(EMPTY);
    }
    setError("");
    setResults([]);
    setActiveField(null);
  }, [isOpen, editingEntry]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setResults([]);
        setActiveField(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isOpen) return null;

  function set<K extends keyof ExpiryFormData>(field: K, value: ExpiryFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function triggerSearch(value: string, field: SearchField) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setResults([]);
      setActiveField(null);
      return;
    }
    setActiveField(field);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (data.success) setResults(data.data);
      } catch {
        /* silent — search is best-effort */
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }

  function handleSearchInput(field: SearchField, value: string) {
    set(field, value);
    triggerSearch(value, field);
  }

  function selectProduct(p: ProductResult) {
    setForm((prev) => ({
      ...prev,
      stock_id:    p.stock_id    ?? "",
      barcode:     p.barcode     ?? "",
      description: p.description ?? "",
      category:    p.category_id ?? "",
      uom:         p.uom         ?? "",
    }));
    setResults([]);
    setActiveField(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.barcode.trim())    { setError("Barcode is required."); return; }
    if (!form.description.trim()){ setError("Description is required."); return; }
    if (!form.category.trim())   { setError("Category is required."); return; }
    if (!form.expiry_date)       { setError("Expiry date is required."); return; }
    if (form.return_status === "pending" && !form.return_by_date) {
      setError("Return By Date is required for returnable items."); return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // Dropdown for a search field
  function SearchDropdown() {
    if (!activeField || results.length === 0) return null;
    return (
      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
        {isSearching && (
          <div className="px-3 py-2 text-xs text-gray-500">Searching…</div>
        )}
        {results.map((p) => (
          <button
            key={p.id}
            type="button"
            onMouseDown={() => selectProduct(p)}
            className="w-full text-left px-3 py-2.5 hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0"
          >
            <div className="flex items-center gap-2">
              {p.stock_id && (
                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                  {p.stock_id}
                </span>
              )}
              <span className="text-sm text-white truncate">{p.description}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {p.barcode && <span className="text-xs text-gray-400 font-mono">{p.barcode}</span>}
              {p.uom && <span className="text-xs text-gray-500">{p.uom}</span>}
              {p.category_id && <span className="text-xs text-gray-500">{p.category_id}</span>}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-base font-semibold text-white">
            {editingEntry ? "Edit Expiry Entry" : "Log New Expiry"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          {/* Search hint */}
          {!editingEntry && (
            <p className="text-xs text-gray-500 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2">
              💡 Type in Stock ID, Barcode, or Description to search products and auto-fill fields.
            </p>
          )}

          {/* PIC */}
          <div>
            <Label>PIC (auto-filled)</Label>
            <input type="text" readOnly value={picName} className={INPUT_RO} />
          </div>

          {/* Stock ID */}
          <div ref={activeField === "stock_id" ? dropdownRef : undefined} className="relative">
            <Label>Stock ID</Label>
            <input
              type="text"
              value={form.stock_id}
              onChange={(e) => handleSearchInput("stock_id", e.target.value)}
              placeholder="e.g. S001234"
              className={INPUT}
            />
            {activeField === "stock_id" && <SearchDropdown />}
          </div>

          {/* Barcode */}
          <div ref={activeField === "barcode" ? dropdownRef : undefined} className="relative">
            <Label required>Barcode</Label>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => handleSearchInput("barcode", e.target.value)}
              placeholder="e.g. 9556234001"
              className={INPUT}
            />
            {activeField === "barcode" && <SearchDropdown />}
          </div>

          {/* Description */}
          <div ref={activeField === "description" ? dropdownRef : undefined} className="relative">
            <Label required>Description</Label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => handleSearchInput("description", e.target.value)}
              placeholder="e.g. Dumex Mamil Gold Step 3 1.2kg"
              className={INPUT}
            />
            {activeField === "description" && <SearchDropdown />}
          </div>

          {/* Category + UOM */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Category</Label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. OTC"
                className={INPUT}
              />
            </div>
            <div>
              <Label>UOM</Label>
              <input
                type="text"
                value={form.uom}
                onChange={(e) => set("uom", e.target.value)}
                placeholder="e.g. BOX"
                className={INPUT}
              />
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <Label required>Expiry Date</Label>
            <input
              type="date"
              value={form.expiry_date}
              onChange={(e) => set("expiry_date", e.target.value)}
              className={INPUT}
            />
          </div>

          {/* Return Status */}
          <div>
            <Label>Return Status</Label>
            <div className="flex gap-2">
              {(["pending", "non-returnable"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set("return_status", val)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.return_status === val
                      ? val === "pending"
                        ? "bg-green-500/20 border-green-500/40 text-green-400"
                        : "bg-red-500/20 border-red-500/40 text-red-400"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  {val === "pending" ? "Returnable" : "Non-Returnable"}
                </button>
              ))}
            </div>
          </div>

          {/* Return By Date — only visible when returnable */}
          {form.return_status === "pending" && (
            <div>
              <Label required>Return By Date</Label>
              <input
                type="date"
                value={form.return_by_date}
                onChange={(e) => set("return_by_date", e.target.value)}
                className={INPUT}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional note…"
              className={INPUT}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-1 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {submitting ? "Saving…" : editingEntry ? "Save Changes" : "Log Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
