"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ExpiryEntry, ExpiryFormData, ProductResult } from "@/hooks/useExpiry";
import { XMarkIcon, MagnifyingGlassIcon, CheckIcon, SparklesIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import AddStockModal, { ExistingEntry } from "./AddStockModal";

interface PolicyMatch {
  brand: string;
  supplier_name: string;
  return_type: string; // RETURNABLE | NON_RETURNABLE | EXCHANGEABLE | UNKNOWN
  months_before_expiry: number | null;
  special_conditions: string | null;
}

function statusFromReturnType(t: string): ExpiryFormData["return_status"] | null {
  if (t === "RETURNABLE") return "pending";
  if (t === "NON_RETURNABLE") return "non-returnable";
  if (t === "EXCHANGEABLE") return "exchangeable";
  return null; // UNKNOWN — leave form untouched
}

// Subtract N months from an ISO (yyyy-MM-dd) date, returning yyyy-MM-dd.
function subMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  const dt = new Date(y, m - 1 - months, d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingEntry: ExpiryEntry | null;
  picName: string;
  isManager?: boolean;
  onSubmit: (data: ExpiryFormData) => Promise<void>;
  onAddStockSuccess?: (result: { additionalQty: number; newQty: number }) => void;
}

const CATEGORIES = [
  "FOOD AND BEVERAGE",
  "FOOD SUPPLEMENT",
  "HEALTH SUPPLEMENT",
  "HOUSEHOLD PRODUCT",
  "MEDICAL DEVICE",
  "MOM AND BABY",
  "OTC MEDICINE",
  "PERSONAL CARE",
  "PET CARE",
  "POISON A MEDICINE",
  "POISON B MEDICINE",
  "POISON C MEDICINE",
  "PREMIUMS",
  "REHAB",
  "TRADITIONAL MEDICINE",
  "NA",
] as const;

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

type DuplicateStatus = "idle" | "checking" | "clear" | "exists" | "warning";

interface DuplicateInfo {
  description: string;
  barcode: string;
  expiry_date: string;
  logged_at: string;
  pic_name: string;
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

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dupStatus, setDupStatus] = useState<DuplicateStatus>("idle");
  const [dupInfo, setDupInfo] = useState<DuplicateInfo | null>(null);
  const [dupConfirmed, setDupConfirmed] = useState(false);
  const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [existingEntryForStock, setExistingEntryForStock] = useState<ExistingEntry | null>(null);

  // Return-policy auto-prefill (new entries only)
  const [policyMatch, setPolicyMatch] = useState<PolicyMatch | null>(null);
  const [autoStatus, setAutoStatus] = useState(false); // return_status came from policy match
  const [autoDate, setAutoDate] = useState(false);      // return_by_date came from policy match
  const matchSeqRef = useRef(0);

  function clearPolicyAutofill() {
    matchSeqRef.current++;
    setPolicyMatch(null);
    setAutoStatus(false);
    setAutoDate(false);
  }

  type EntryMode = "search" | "manual";
  const [entryMode, setEntryMode] = useState<EntryMode>("search");
  const [noResultsFound, setNoResultsFound] = useState(false);

  const productSelected = !!(form.barcode || form.description);

  useEffect(() => {
    if (!isOpen) {
      setDupStatus("idle");
      setDupInfo(null);
      setDupConfirmed(false);
      setShowAddStockModal(false);
      setExistingEntryForStock(null);
      clearPolicyAutofill();
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
          (editingEntry.return_status as ExpiryFormData["return_status"]) || "pending",
        return_by_date: editingEntry.return_by_date?.split("T")[0] ?? "",
        notes: editingEntry.notes ?? "",
      });
    } else {
      setForm(EMPTY);
    }
    setSearchQuery("");
    setResults([]);
    setShowDropdown(false);
    setError("");
    setDupStatus("idle");
    setDupInfo(null);
    setDupConfirmed(false);
    setEntryMode("search");
    setNoResultsFound(false);
    clearPolicyAutofill();
  }, [isOpen, editingEntry]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setResults([]);
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

  // Auto-compute Return By Date from a RETURNABLE policy match once an expiry
  // date is present (staff picks the product before entering the expiry date).
  const policyReturnType = policyMatch?.return_type;
  const policyMonths = policyMatch?.months_before_expiry;
  const expiryDateForCalc = form.expiry_date;
  useEffect(() => {
    if (!autoStatus) return;
    if (policyReturnType !== "RETURNABLE") return;
    if (policyMonths == null) return;
    if (!expiryDateForCalc) return;
    const computed = subMonthsISO(expiryDateForCalc, policyMonths);
    setForm((prev) =>
      prev.return_by_date === computed ? prev : { ...prev, return_by_date: computed },
    );
    setAutoDate(true);
  }, [autoStatus, policyReturnType, policyMonths, expiryDateForCalc]);

  if (!isOpen) return null;

  function set<K extends keyof ExpiryFormData>(field: K, value: ExpiryFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function triggerSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data);
          setShowDropdown(data.data.length > 0);
          setNoResultsFound(data.data.length === 0);
        }
      } catch {
        /* silent */
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    setNoResultsFound(false);
    if (productSelected) {
      setForm((prev) => ({ ...prev, stock_id: "", barcode: "", description: "", category: "", uom: "" }));
      clearPolicyAutofill();
    }
    triggerSearch(val);
  }

  function enterManualMode() {
    setEntryMode("manual");
    setShowDropdown(false);
    setResults([]);
    clearPolicyAutofill();
    setForm((prev) => ({
      ...prev,
      barcode: searchQuery.trim(),
      description: "",
      category: "",
      uom: "",
      stock_id: "",
    }));
  }

  function returnToSearch() {
    setEntryMode("search");
    setNoResultsFound(false);
    setForm((prev) => ({ ...prev, stock_id: "", barcode: "", description: "", category: "", uom: "" }));
    setSearchQuery("");
    clearPolicyAutofill();
  }

  // Look up the selected product's brand in the Return Policy table and, if a
  // policy matches, auto-prefill Return Status (and Return By Date for
  // returnable items once an expiry date is known). Never locks the fields —
  // staff can always override. No match → leave the form as-is.
  async function applyPolicyAutofill(description: string) {
    const seq = ++matchSeqRef.current;
    try {
      const res = await fetch("/api/return-policies/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (seq !== matchSeqRef.current) return; // a newer selection superseded this
      const match: PolicyMatch | null = data?.success ? data.data : null;
      if (!match) return;
      const status = statusFromReturnType(match.return_type);
      if (!status) return; // UNKNOWN policy type — no change
      setPolicyMatch(match);
      setAutoStatus(true);
      setForm((prev) => ({
        ...prev,
        return_status: status,
        // Clear any stale return-by date unless this is a returnable policy
        // (the effect fills it in once an expiry date is present).
        return_by_date: status === "pending" ? prev.return_by_date : "",
      }));
    } catch {
      /* silent — auto-fill is best-effort */
    }
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
    setSearchQuery("");
    setResults([]);
    setShowDropdown(false);
    clearPolicyAutofill();
    if (p.description) applyPolicyAutofill(p.description);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.barcode.trim()) { setError("Barcode is required."); return; }
    if (!form.description.trim()) { setError("Description is required."); return; }
    if (!form.category.trim()) { setError("Category is required."); return; }
    if (entryMode === "manual" && !form.uom.trim()) { setError("UOM is required for manual entries."); return; }
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

  function handleAddStockSuccess(result: {
    additionalQty: number;
    newQty: number;
    previous_qty?: number;
    additional_qty?: number;
    new_qty?: number;
    reason?: string;
  }) {
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
    dupStatus === "warning" && !dupConfirmed ? "#eab308" : "#e2e8f0";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div
          className="relative w-full max-w-[480px] mx-4 bg-white flex flex-col max-h-[90vh]"
          style={{ borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0"
            style={{ borderBottom: "1px solid #f1f5f9" }}
          >
            <div>
              <h2 className="text-lg font-bold text-[#0f172a]">
                {editingEntry ? "Edit Expiry Entry" : "Log New Expiry Entry"}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">Record a short-expiry item</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-[#64748b] hover:bg-slate-100 flex-shrink-0 mt-0.5"
            >
              <XMarkIcon className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 flex-1">

            {/* SECTION 2 — Product Search (new entry only) */}
            {!editingEntry && entryMode === "search" && (
              <div ref={dropdownRef}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Product Search
                </p>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by barcode or product description..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 placeholder:text-slate-400"
                  />
                  {showDropdown && (results.length > 0 || isSearching) && (
                    <div
                      className="absolute z-50 left-0 right-0 top-full mt-1 bg-white overflow-hidden max-h-[200px] overflow-y-auto rounded-xl shadow-lg"
                      style={{ border: "1px solid #e2e8f0" }}
                    >
                      {isSearching && (
                        <div className="px-4 py-2.5 text-xs text-[#94a3b8]">Searching…</div>
                      )}
                      {results.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => selectProduct(p)}
                          className="w-full text-left px-4 py-2.5 transition-colors border-b border-[#f1f5f9] last:border-0"
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "#eff6ff";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "";
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-[#0f172a] truncate">
                              {p.description}
                            </span>
                            <span className="text-xs text-[#94a3b8] font-mono flex-shrink-0">
                              {p.barcode}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {p.category_id && (
                              <span className="text-xs text-[#64748b]">{p.category_id}</span>
                            )}
                            {p.uom && (
                              <span className="text-xs text-[#64748b]">· {p.uom}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {noResultsFound && !isSearching ? (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-500">Product not found in database.</p>
                    <button
                      type="button"
                      onClick={enterManualMode}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
                    >
                      Fill in manually
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">
                    Type barcode or name to auto-fill product details
                  </p>
                )}
              </div>
            )}

            {/* SECTION 3 — Product Details */}
            <div className={!editingEntry ? "mt-4" : ""}>
              {entryMode === "manual" ? (
                <>
                  {/* Manual mode header with back link */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Product Details
                    </p>
                    <button
                      type="button"
                      onClick={returnToSearch}
                      className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1"
                    >
                      ← Search again
                    </button>
                  </div>

                  {/* Manual mode banner */}
                  <div className="mb-3 rounded-xl border border-yellow-200 bg-yellow-50 px-3.5 py-2.5 flex items-center gap-2">
                    <span className="text-sm text-yellow-700 font-medium">⚠️ Manual entry — product not in database</span>
                  </div>

                  {/* Editable fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        placeholder="e.g. PANADOL EXTRA 500MG 20 TAB"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-colors"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">
                        Category *
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) => set("category", e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-colors bg-white"
                      >
                        <option value="">Select category…</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">
                          UOM *
                        </label>
                        <input
                          type="text"
                          value={form.uom}
                          onChange={(e) => set("uom", e.target.value)}
                          placeholder="e.g. BOX, TC, ST"
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">
                          Barcode
                        </label>
                        <input
                          type="text"
                          value={form.barcode}
                          onChange={(e) => set("barcode", e.target.value)}
                          placeholder="Barcode / SKU"
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">
                        Stock ID{" "}
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={form.stock_id}
                        onChange={(e) => set("stock_id", e.target.value)}
                        placeholder="Internal stock ID"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-colors"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Product Details
                  </p>
                  {productSelected ? (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">
                            Barcode
                          </p>
                          <p className="text-sm font-semibold text-slate-800">
                            {form.barcode || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">
                            Category
                          </p>
                          <p className="text-sm font-semibold text-slate-800">
                            {form.category || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">
                          Description
                        </p>
                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                          {form.description || "—"}
                        </p>
                      </div>
                      {form.uom && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">
                            Unit of Measure
                          </p>
                          <p className="text-sm font-semibold text-slate-800">{form.uom}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200 text-center">
                      <p className="text-sm text-slate-400">
                        Search for a product above to auto-fill details
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* SECTION 4 — Expiry Details */}
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Expiry Details{" "}
                <span className="text-red-500 ml-0.5">*</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Expiry Date */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-600">
                      Expiry Date *
                    </label>
                    {dupStatus === "checking" && (
                      <span className="flex items-center gap-1 text-[10px] text-[#64748b]">
                        <svg className="animate-spin w-2.5 h-2.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Checking…
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => set("expiry_date", e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-50 transition-colors"
                    style={{ borderColor: expiryBorderColor }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#2563eb";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = expiryBorderColor;
                    }}
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity ?? 1}
                    onChange={(e) =>
                      set("quantity", Math.max(1, Math.round(Number(e.target.value))))
                    }
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-colors"
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#2563eb";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                    }}
                  />
                </div>
              </div>

              {/* Duplicate warning */}
              {dupStatus === "warning" && dupInfo && !dupConfirmed && (
                <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3.5 space-y-2">
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

            {/* SECTION 5 — Return Status */}
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Return Status
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { set("return_status", "non-returnable"); setAutoStatus(false); }}
                  className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.return_status === "non-returnable"
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  Non-Returnable
                </button>
                <button
                  type="button"
                  onClick={() => { set("return_status", "pending"); setAutoStatus(false); }}
                  className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.return_status === "pending"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  Returnable
                </button>
                <button
                  type="button"
                  onClick={() => { set("return_status", "exchangeable"); setAutoStatus(false); }}
                  className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.return_status === "exchangeable"
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                  }`}
                >
                  Exchangeable
                </button>
              </div>

              {/* Auto-fill indicator */}
              {autoStatus && policyMatch && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <SparklesIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span>
                    Auto-filled from return policy
                    {policyMatch.brand ? ` · ${policyMatch.brand}` : ""}
                  </span>
                </div>
              )}

              {/* Special conditions caveat from the matched policy */}
              {autoStatus && policyMatch?.special_conditions && (
                <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-2">
                  <InformationCircleIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-px" />
                  <p className="text-[11px] text-amber-700 leading-snug">
                    {policyMatch.special_conditions}
                  </p>
                </div>
              )}

              {form.return_status === "pending" && (
                <div className="mt-3">
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Return By Date *
                  </label>
                  <input
                    type="date"
                    value={form.return_by_date}
                    onChange={(e) => { set("return_by_date", e.target.value); setAutoDate(false); }}
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm bg-blue-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-colors"
                  />
                  {autoDate && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <SparklesIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span>
                        Auto-calculated from return policy
                        {policyMatch?.months_before_expiry != null
                          ? ` (${policyMatch.months_before_expiry} month${policyMatch.months_before_expiry === 1 ? "" : "s"} before expiry)`
                          : ""}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 6 — Notes + PIC */}
            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Notes{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Add any additional notes..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-colors"
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold">
                  {picName?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Logging as{" "}
                <span className="font-semibold text-slate-700">{picName}</span>
              </p>
            </div>

            {/* Validation error */}
            {error && (
              <div className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-[#ef4444] text-sm">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* SECTION 7 — Footer (sticky) */}
            <div className="flex gap-3 pt-4 mt-4 border-t border-slate-100 sticky bottom-0 bg-white pb-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || isDupBlocked}
                className="flex-1 py-2.5 px-6 rounded-xl text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center shadow-sm transition-colors"
                style={{ background: "#2563eb" }}
                onMouseEnter={(e) => {
                  if (!submitting && !isDupBlocked)
                    (e.currentTarget as HTMLElement).style.background = "#1d4ed8";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#2563eb";
                }}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    {editingEntry ? "Save Changes" : "Log Entry"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* AddStockModal — rendered above ExpiryForm */}
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
