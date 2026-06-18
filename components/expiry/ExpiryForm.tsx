"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ExpiryEntry, ExpiryFormData, ProductResult } from "@/hooks/useExpiry";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingEntry: ExpiryEntry | null;
  picName: string;
  isManager?: boolean;
  onSubmit: (data: ExpiryFormData) => Promise<void>;
}

const EMPTY: ExpiryFormData = {
  stock_id: "",
  barcode: "",
  description: "",
  category: "",
  uom: "",
  quantity: 1,
  expiry_date: "",
  return_status: "pending",
  return_by_date: "",
  notes: "",
};

type SearchField = "stock_id" | "barcode" | "description";
type DuplicateStatus = "idle" | "checking" | "clear" | "exact" | "warning";

interface DuplicateInfo {
  description: string;
  barcode: string;
  expiry_date: string;
  logged_at: string;
  pic_name: string;
}

const INPUT =
  "w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#e2e8f0] text-[#1e293b] placeholder-[#94a3b8] text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3b82f6] transition";
const INPUT_RO =
  "w-full px-3.5 py-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#64748b] text-sm cursor-not-allowed";
const INPUT_ERROR =
  "w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#ef4444] text-[#1e293b] placeholder-[#94a3b8] text-sm focus:outline-none focus:ring-2 focus:ring-red-100 transition";
const INPUT_WARN =
  "w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#eab308] text-[#1e293b] placeholder-[#94a3b8] text-sm focus:outline-none focus:ring-2 focus:ring-yellow-100 transition";

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-medium text-[#374151] mb-1.5">
      {children}
      {required && <span className="text-[#ef4444] ml-0.5">*</span>}
    </label>
  );
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function ExpiryForm({
  isOpen,
  onClose,
  editingEntry,
  picName,
  isManager = false,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<ExpiryFormData>(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Autocomplete state
  const [results, setResults] = useState<ProductResult[]>([]);
  const [activeField, setActiveField] = useState<SearchField | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Duplicate check state
  const [dupStatus, setDupStatus] = useState<DuplicateStatus>("idle");
  const [dupInfo, setDupInfo] = useState<DuplicateInfo | null>(null);
  const [dupConfirmed, setDupConfirmed] = useState(false);
  const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setDupStatus("idle");
      setDupInfo(null);
      setDupConfirmed(false);
      if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
      return;
    }
    if (editingEntry) {
      setForm({
        stock_id: editingEntry.stock_id ?? "",
        barcode: editingEntry.barcode ?? "",
        description: editingEntry.description ?? "",
        category: editingEntry.category ?? "",
        uom: editingEntry.uom ?? "",
        quantity: editingEntry.quantity ?? 1,
        expiry_date: editingEntry.expiry_date.split("T")[0],
        return_status:
          (editingEntry.return_status as ExpiryFormData["return_status"]) ||
          "pending",
        return_by_date: editingEntry.return_by_date?.split("T")[0] ?? "",
        notes: editingEntry.notes ?? "",
      });
    } else {
      setForm(EMPTY);
    }
    setError("");
    setResults([]);
    setActiveField(null);
    setDupStatus("idle");
    setDupInfo(null);
    setDupConfirmed(false);
  }, [isOpen, editingEntry]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setResults([]);
        setActiveField(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Duplicate check — fires whenever item identity or expiry date changes
  const { barcode: dupBarcode, stock_id: dupStockId, description: dupDescription, expiry_date: dupExpiryDate } = form;
  useEffect(() => {
    // Only check for new entries, not edits, and not for managers
    if (!isOpen || editingEntry || isManager) return;

    const barcode = dupBarcode, stock_id = dupStockId, description = dupDescription, expiry_date = dupExpiryDate;
    const hasItem =
      barcode.trim() || stock_id.trim() || description.trim();

    if (!hasItem || !expiry_date) {
      setDupStatus("idle");
      setDupInfo(null);
      setDupConfirmed(false);
      return;
    }

    // Reset confirmation whenever any field changes
    setDupConfirmed(false);
    setDupStatus("checking");

    if (dupTimerRef.current) clearTimeout(dupTimerRef.current);

    dupTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/expiry/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stock_id, barcode, description, expiry_date }),
        });
        const data = await res.json();
        if (data.success) {
          setDupStatus(data.data.type as DuplicateStatus);
          setDupInfo(data.data.existing ?? null);
        } else {
          setDupStatus("clear");
        }
      } catch {
        setDupStatus("clear");
      }
    }, 500);

    return () => {
      if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
    };
  }, [
    dupBarcode,
    dupStockId,
    dupDescription,
    dupExpiryDate,
    isOpen,
    editingEntry,
    isManager,
  ]);

  if (!isOpen) return null;

  function set<K extends keyof ExpiryFormData>(
    field: K,
    value: ExpiryFormData[K],
  ) {
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
        const res = await fetch(
          `/api/products/search?q=${encodeURIComponent(value)}`,
        );
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
      stock_id: p.stock_id ?? "",
      barcode: p.barcode ?? "",
      description: p.description ?? "",
      category: p.category_id ?? "",
      uom: p.uom ?? "",
    }));
    setResults([]);
    setActiveField(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.barcode.trim()) {
      setError("Barcode is required.");
      return;
    }
    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!form.category.trim()) {
      setError(
        "Category is required — select a product from the search results.",
      );
      return;
    }
    if (!form.expiry_date) {
      setError("Expiry date is required.");
      return;
    }
    if ((form.quantity ?? 1) < 1) {
      setError("Quantity must be at least 1.");
      return;
    }
    if (form.return_status === "pending" && !form.return_by_date) {
      setError("Return By Date is required for returnable items.");
      return;
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

  // Submit is blocked when: checking, exact match, or warning not yet confirmed
  const isDupBlocked =
    !editingEntry &&
    !isManager &&
    (dupStatus === "checking" ||
      dupStatus === "exact" ||
      (dupStatus === "warning" && !dupConfirmed));

  // Expiry date field border state
  const expiryInputClass =
    dupStatus === "exact"
      ? INPUT_ERROR
      : dupStatus === "warning" && !dupConfirmed
        ? INPUT_WARN
        : INPUT;

  // Dropdown for a search field
  function SearchDropdown() {
    if (!activeField || results.length === 0) return null;
    return (
      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-[#e2e8f0] rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
        {isSearching && (
          <div className="px-3 py-2 text-xs text-[#94a3b8]">Searching…</div>
        )}
        {results.map((p) => (
          <button
            key={p.id}
            type="button"
            onMouseDown={() => selectProduct(p)}
            className="w-full text-left px-3 py-2.5 hover:bg-[#f0f4ff] transition-colors border-b border-[#f1f5f9] last:border-0"
          >
            <div className="flex items-center gap-2">
              {p.stock_id && (
                <span className="text-xs font-mono text-[#1e3a8a] bg-[#dbeafe] px-1.5 py-0.5 rounded flex-shrink-0">
                  {p.stock_id}
                </span>
              )}
              <span className="text-sm text-[#1e293b] truncate">
                {p.description}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {p.barcode && (
                <span className="text-xs text-[#64748b] font-mono">
                  {p.barcode}
                </span>
              )}
              {p.uom && <span className="text-xs text-[#94a3b8]">{p.uom}</span>}
              {p.category_id && (
                <span className="text-xs text-[#94a3b8]">{p.category_id}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white border border-[#e2e8f0] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] flex-shrink-0">
          <h2 className="text-lg font-bold text-[#1e293b]">
            {editingEntry ? "Edit Expiry Entry" : "Log New Expiry"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-[#1e293b] hover:bg-[#f1f5f9] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto px-6 py-5 space-y-4 flex-1"
        >
          {/* Search hint */}
          {!editingEntry && (
            <p className="text-xs text-[#1e3a8a] bg-[#eff6ff] border border-blue-200 rounded-lg px-3 py-2">
              💡 Type in Stock ID, Barcode, or Description to search products
              and auto-fill fields.
            </p>
          )}

          {/* PIC */}
          <div>
            <Label>PIC (auto-filled)</Label>
            <input type="text" readOnly value={picName} className={INPUT_RO} />
          </div>

          {/* Stock ID */}
          <div
            ref={activeField === "stock_id" ? dropdownRef : undefined}
            className="relative"
          >
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
          <div
            ref={activeField === "barcode" ? dropdownRef : undefined}
            className="relative"
          >
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
          <div
            ref={activeField === "description" ? dropdownRef : undefined}
            className="relative"
          >
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
                readOnly
                placeholder="Auto-filled from search"
                className={INPUT_RO}
              />
            </div>
            <div>
              <Label>UOM</Label>
              <input
                type="text"
                value={form.uom}
                readOnly
                placeholder="Auto-filled from search"
                className={INPUT_RO}
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <Label required>Quantity</Label>
            <input
              type="number"
              min={1}
              value={form.quantity ?? 1}
              onChange={(e) =>
                set("quantity", Math.max(1, Math.round(Number(e.target.value))))
              }
              className={INPUT}
            />
          </div>

          {/* Expiry Date — with duplicate check indicator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label required>Expiry Date</Label>
              {dupStatus === "checking" && (
                <span className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
                  <svg
                    className="animate-spin w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
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
                  Checking for duplicates…
                </span>
              )}
            </div>
            <input
              type="date"
              value={form.expiry_date}
              onChange={(e) => set("expiry_date", e.target.value)}
              className={expiryInputClass}
            />

            {/* Exact duplicate banner — BLOCK */}
            {dupStatus === "exact" && dupInfo && (
              <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#ef4444] flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm font-semibold text-[#ef4444]">
                    Duplicate Entry Detected
                  </p>
                </div>
                <p className="text-xs text-[#b91c1c]">
                  You already logged this item:
                </p>
                <ul className="text-xs text-[#b91c1c] space-y-0.5 pl-1">
                  <li>• {dupInfo.description}</li>
                  <li>• Barcode: {dupInfo.barcode}</li>
                  <li>• Expiry Date: {fmtDate(dupInfo.expiry_date)}</li>
                  <li>• Logged on: {fmtDate(dupInfo.logged_at)}</li>
                </ul>
                <p className="text-xs font-semibold text-[#ef4444]">
                  Cannot submit duplicate entry.
                </p>
              </div>
            )}

            {/* Warning banner — different date */}
            {dupStatus === "warning" && dupInfo && !dupConfirmed && (
              <div className="mt-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#ca8a04] flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm font-semibold text-[#ca8a04]">
                    Similar Item Found
                  </p>
                </div>
                <p className="text-xs text-[#92400e]">
                  You previously logged this item with a different expiry date:
                </p>
                <ul className="text-xs text-[#92400e] space-y-0.5 pl-1">
                  <li>• {dupInfo.description}</li>
                  <li>• Barcode: {dupInfo.barcode}</li>
                  <li>• Previous Expiry: {fmtDate(dupInfo.expiry_date)}</li>
                  <li>• Logged on: {fmtDate(dupInfo.logged_at)}</li>
                </ul>
                <p className="text-xs text-[#92400e]">
                  Continue only if this is a different batch.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-yellow-300 text-[#92400e] hover:bg-yellow-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDupConfirmed(true)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-[#ca8a04] hover:bg-[#b45309] text-white transition-colors"
                  >
                    Yes, Different Batch ✓
                  </button>
                </div>
              </div>
            )}

            {/* Confirmed badge */}
            {dupStatus === "warning" && dupConfirmed && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[#16a34a]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Confirmed as different batch — ready to submit.
              </div>
            )}
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
                        ? "bg-green-50 border-green-300 text-[#16a34a]"
                        : "bg-red-50 border-red-300 text-[#ef4444]"
                      : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
                  }`}
                >
                  {val === "pending" ? "Returnable" : "Non-Returnable"}
                </button>
              ))}
            </div>
          </div>

          {/* Return By Date */}
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

          {/* Validation error */}
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[#ef4444] text-sm">
              <svg
                className="w-4 h-4 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-1 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-[#64748b] hover:text-[#1e293b] hover:bg-[#f1f5f9] border border-[#e2e8f0] hover:border-[#cbd5e1] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isDupBlocked}
              className="px-4 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {submitting
                ? "Saving…"
                : editingEntry
                  ? "Save Changes"
                  : "Log Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
