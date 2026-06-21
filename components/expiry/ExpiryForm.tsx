"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ExpiryEntry, ExpiryFormData, ProductResult } from "@/hooks/useExpiry";
import { XMarkIcon } from "@heroicons/react/24/outline";
import AddStockModal, { ExistingEntry } from "./AddStockModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingEntry: ExpiryEntry | null;
  picName: string;
  isManager?: boolean;
  onSubmit: (data: ExpiryFormData) => Promise<void>;
  onAddStockSuccess?: (result: { additionalQty: number; newQty: number }) => void;
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
type DuplicateStatus = "idle" | "checking" | "clear" | "exists" | "warning";

interface DuplicateInfo {
  description: string;
  barcode: string;
  expiry_date: string;
  logged_at: string;
  pic_name: string;
}

const INPUT_BASE =
  "w-full border border-[#e2e8f0] bg-white text-[#0f172a] placeholder-[#94a3b8] text-sm font-medium transition-colors focus:outline-none";
const INPUT_RO =
  "w-full border border-[#f1f5f9] bg-[#f8fafc] text-[#64748b] text-sm cursor-not-allowed";
const INPUT_STYLE = { borderRadius: "10px", padding: "10px 16px" };
const INPUT_RO_STYLE = { borderRadius: "10px", padding: "10px 16px" };

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-[#374151] mb-1.5">
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
  onAddStockSuccess,
}: Props) {
  const [form, setForm] = useState<ExpiryFormData>(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [results, setResults] = useState<ProductResult[]>([]);
  const [activeField, setActiveField] = useState<SearchField | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dupStatus, setDupStatus] = useState<DuplicateStatus>("idle");
  const [dupInfo, setDupInfo] = useState<DuplicateInfo | null>(null);
  const [dupConfirmed, setDupConfirmed] = useState(false);
  const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [existingEntryForStock, setExistingEntryForStock] = useState<ExistingEntry | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDupStatus("idle");
      setDupInfo(null);
      setDupConfirmed(false);
      setShowAddStockModal(false);
      setExistingEntryForStock(null);
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

  const { barcode: dupBarcode, stock_id: dupStockId, description: dupDescription, expiry_date: dupExpiryDate } = form;
  useEffect(() => {
    if (!isOpen || editingEntry) return;
    const barcode = dupBarcode, stock_id = dupStockId, description = dupDescription, expiry_date = dupExpiryDate;
    const hasItem = barcode.trim() || stock_id.trim();
    if (!hasItem || !expiry_date) {
      setDupStatus("idle");
      setDupInfo(null);
      setDupConfirmed(false);
      return;
    }
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
          const type = data.data.type as DuplicateStatus;
          setDupStatus(type);
          if (type === "exists" && data.data.existing) {
            setExistingEntryForStock(data.data.existing as ExistingEntry);
            setShowAddStockModal(true);
            // Keep ExpiryForm open behind AddStockModal
          } else {
            setDupInfo(data.data.existing ?? null);
          }
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
  }, [dupBarcode, dupStockId, dupDescription, dupExpiryDate, isOpen, editingEntry]);

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
        /* silent */
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
    if (!form.barcode.trim()) { setError("Barcode is required."); return; }
    if (!form.description.trim()) { setError("Description is required."); return; }
    if (!form.category.trim()) { setError("Category is required — select a product from the search results."); return; }
    if (!form.expiry_date) { setError("Expiry date is required."); return; }
    if ((form.quantity ?? 1) < 1) { setError("Quantity must be at least 1."); return; }
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

  function handleAddStockSuccess(result: { additionalQty: number; newQty: number; previous_qty?: number; additional_qty?: number; new_qty?: number; reason?: string }) {
    setShowAddStockModal(false);
    setExistingEntryForStock(null);
    onClose();
    onAddStockSuccess?.({
      additionalQty: result.additionalQty ?? result.additional_qty ?? 0,
      newQty: result.newQty ?? result.new_qty ?? 0,
    });
  }

  const isDupBlocked =
    !editingEntry &&
    (dupStatus === "checking" ||
      dupStatus === "exists" ||
      (dupStatus === "warning" && !dupConfirmed));

  const expiryBorderColor =
    dupStatus === "warning" && !dupConfirmed
      ? "#eab308"
      : "#e2e8f0";

  function SearchDropdown() {
    if (!activeField || results.length === 0) return null;
    return (
      <div
        className="absolute z-50 left-0 right-0 top-full mt-1 bg-white overflow-hidden max-h-[200px] overflow-y-auto"
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
        }}
      >
        {isSearching && (
          <div className="px-4 py-2.5 text-xs text-[#94a3b8]">Searching…</div>
        )}
        {results.map((p) => (
          <button
            key={p.id}
            type="button"
            onMouseDown={() => selectProduct(p)}
            className="w-full text-left px-4 py-2.5 text-sm text-[#334155] transition-colors border-b border-[#f1f5f9] last:border-0"
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#eff6ff")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "")
            }
          >
            <div className="flex items-center gap-2">
              {p.stock_id && (
                <span className="text-xs font-mono text-[#2563eb] bg-[#dbeafe] px-1.5 py-0.5 rounded flex-shrink-0">
                  {p.stock_id}
                </span>
              )}
              <span className="text-sm text-[#334155] truncate">{p.description}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {p.barcode && <span className="text-xs text-[#64748b] font-mono">{p.barcode}</span>}
              {p.uom && <span className="text-xs text-[#94a3b8]">{p.uom}</span>}
              {p.category_id && <span className="text-xs text-[#94a3b8]">{p.category_id}</span>}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div
          className="relative w-full max-w-[480px] mx-4 bg-white flex flex-col max-h-[90vh]"
          style={{ borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0"
            style={{ borderBottom: "1px solid #f1f5f9" }}
          >
            <h2 className="text-lg font-bold text-[#0f172a]">
              {editingEntry ? "Edit Expiry Entry" : "Log New Expiry"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-[#64748b]"
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#f1f5f9")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "")
              }
            >
              <XMarkIcon className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Scrollable body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
            {/* Search hint */}
            {!editingEntry && (
              <p className="text-xs text-[#2563eb] bg-[#eff6ff] border border-blue-200 rounded-lg px-3 py-2">
                Type in Stock ID, Barcode, or Description to search products and auto-fill fields.
              </p>
            )}

            {/* PIC */}
            <div>
              <Label>PIC (auto-filled)</Label>
              <input type="text" readOnly value={picName} className={INPUT_RO} style={INPUT_RO_STYLE} />
            </div>

            {/* Stock ID */}
            <div ref={activeField === "stock_id" ? dropdownRef : undefined} className="relative">
              <Label>Stock ID</Label>
              <input
                type="text"
                value={form.stock_id}
                onChange={(e) => handleSearchInput("stock_id", e.target.value)}
                placeholder="e.g. S001234"
                className={INPUT_BASE}
                style={INPUT_STYLE}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "";
                }}
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
                className={INPUT_BASE}
                style={INPUT_STYLE}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "";
                }}
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
                className={INPUT_BASE}
                style={INPUT_STYLE}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "";
                }}
              />
              {activeField === "description" && <SearchDropdown />}
            </div>

            {/* Category + UOM */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Category</Label>
                <input type="text" value={form.category} readOnly placeholder="Auto-filled from search" className={INPUT_RO} style={INPUT_RO_STYLE} />
              </div>
              <div>
                <Label>UOM</Label>
                <input type="text" value={form.uom} readOnly placeholder="Auto-filled from search" className={INPUT_RO} style={INPUT_RO_STYLE} />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <Label required>Quantity</Label>
              <input
                type="number"
                min={1}
                value={form.quantity ?? 1}
                onChange={(e) => set("quantity", Math.max(1, Math.round(Number(e.target.value))))}
                className={INPUT_BASE}
                style={INPUT_STYLE}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "";
                }}
              />
            </div>

            {/* Expiry Date */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label required>Expiry Date</Label>
                {dupStatus === "checking" && (
                  <span className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Checking for duplicates…
                  </span>
                )}
              </div>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) => set("expiry_date", e.target.value)}
                className={INPUT_BASE}
                style={{ ...INPUT_STYLE, borderColor: expiryBorderColor }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = expiryBorderColor;
                  e.currentTarget.style.boxShadow = "";
                }}
              />

              {dupStatus === "warning" && dupInfo && !dupConfirmed && (
                <div className="mt-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#ca8a04] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-semibold text-[#ca8a04]">Similar Item Found</p>
                  </div>
                  <ul className="text-xs text-[#92400e] space-y-0.5 pl-1">
                    <li>• {dupInfo.description}</li>
                    <li>• Previous Expiry: {fmtDate(dupInfo.expiry_date)}</li>
                    <li>• Logged on: {fmtDate(dupInfo.logged_at)}</li>
                  </ul>
                  <p className="text-xs text-[#92400e]">Continue only if this is a different batch.</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-yellow-300 text-[#92400e] hover:bg-yellow-100 transition-colors">
                      Cancel
                    </button>
                    <button type="button" onClick={() => setDupConfirmed(true)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-[#ca8a04] hover:bg-[#b45309] text-white transition-colors">
                      Yes, Different Batch
                    </button>
                  </div>
                </div>
              )}

              {dupStatus === "warning" && dupConfirmed && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#16a34a]">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
                    className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
                    style={
                      form.return_status === val
                        ? val === "pending"
                          ? { background: "#dcfce7", borderColor: "#86efac", color: "#16a34a" }
                          : { background: "#fee2e2", borderColor: "#fca5a5", color: "#ef4444" }
                        : { background: "white", borderColor: "#e2e8f0", color: "#64748b" }
                    }
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
                  className={INPUT_BASE}
                  style={INPUT_STYLE}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#2563eb";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "";
                  }}
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
                className={INPUT_BASE}
                style={INPUT_STYLE}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "";
                }}
              />
            </div>

            {/* Validation error */}
            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-[#ef4444] text-sm">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-3 pt-4 pb-1"
              style={{ borderTop: "1px solid #f1f5f9" }}
            >
              <button
                type="button"
                onClick={onClose}
                className="bg-white border border-[#e2e8f0] text-[#374151] font-semibold rounded-xl px-5 py-2.5 text-sm hover:bg-[#f8fafc] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || isDupBlocked}
                className="text-white font-semibold rounded-xl px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  background: "#2563eb",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!submitting && !isDupBlocked)
                    (e.currentTarget as HTMLElement).style.background = "#1d4ed8";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#2563eb";
                }}
              >
                {submitting ? "Saving…" : editingEntry ? "Save Changes" : "Log Entry"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* AddStockModal — rendered as portal, appears above ExpiryForm */}
      {existingEntryForStock && (
        <AddStockModal
          isOpen={showAddStockModal}
          onClose={() => {
            setShowAddStockModal(false);
            setExistingEntryForStock(null);
            setDupStatus("idle");
          }}
          existingEntry={existingEntryForStock}
          onSuccess={(result) =>
            handleAddStockSuccess({
              additionalQty: result.additional_qty,
              newQty: result.new_qty,
            })
          }
        />
      )}
    </>
  );
}
