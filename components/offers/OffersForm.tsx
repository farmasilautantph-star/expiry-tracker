"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OfferEntry, OfferFormData } from "@/hooks/useOffers";

const CATEGORIES = ["MOM & BABY", "FS", "OTC", "Poison B", "Poison C", "PET CARE", "HS"] as const;

interface ProductSuggestion {
  barcode: string;
  description: string;
  category: string;
  stock_id: string | null;
  uom: string | null;
}

const EMPTY: OfferFormData = {
  description: "",
  barcode: "",
  stock_id: "",
  uom: "",
  quantity: 1,
  category: "",
  notes: "",
  has_alert: false,
};

interface Props {
  initial?: OfferEntry;
  onSubmit: (data: OfferFormData) => Promise<void>;
  onCancel: () => void;
}

const INPUT =
  "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const LABEL = "block text-xs font-medium text-gray-400 mb-1";

export default function OffersForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<OfferFormData>(
    initial
      ? {
          description: initial.description,
          barcode:     initial.barcode,
          stock_id:    initial.stock_id ?? "",
          uom:         initial.uom,
          quantity:    initial.quantity,
          category:    initial.category ?? "",
          notes:       initial.notes ?? "",
          has_alert:   initial.has_alert === 1,
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setSuggestions(json.data);
            setShowSuggestions(true);
          }
        }
      } catch { /* ignore */ }
    }, 300);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function applySuggestion(s: ProductSuggestion) {
    setForm((f) => ({
      ...f,
      barcode:     s.barcode,
      description: s.description,
      category:    s.category || f.category,
      stock_id:    s.stock_id ?? f.stock_id,
      uom:         s.uom ?? f.uom,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function set(key: keyof OfferFormData, value: string | number | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim() || !form.barcode.trim() || !form.uom.trim()) {
      setError("Description, barcode, and UOM are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Barcode + autocomplete */}
      <div className="relative">
        <label className={LABEL}>Barcode *</label>
        <input
          type="text"
          value={form.barcode}
          onChange={(e) => { set("barcode", e.target.value); fetchSuggestions(e.target.value); }}
          placeholder="Scan or type barcode…"
          className={INPUT}
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 shadow-lg max-h-48 overflow-y-auto"
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applySuggestion(s)}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors"
              >
                <p className="text-sm text-white truncate">{s.description}</p>
                <p className="text-xs text-gray-400">{s.barcode} · {s.category}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className={LABEL}>Description *</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => { set("description", e.target.value); fetchSuggestions(e.target.value); }}
          placeholder="Product description…"
          className={INPUT}
        />
      </div>

      {/* Stock ID */}
      <div>
        <label className={LABEL}>Stock ID</label>
        <input
          type="text"
          value={form.stock_id}
          onChange={(e) => set("stock_id", e.target.value)}
          placeholder="Optional stock ID…"
          className={INPUT}
        />
      </div>

      {/* UOM + Quantity row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>UOM *</label>
          <input
            type="text"
            value={form.uom}
            onChange={(e) => set("uom", e.target.value)}
            placeholder="e.g. PCS, BOX…"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Quantity</label>
          <input
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => set("quantity", Math.max(1, Number(e.target.value)))}
            className={INPUT}
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className={LABEL}>Category</label>
        <select value={form.category} onChange={(e) => set("category", e.target.value)}
          className={INPUT}>
          <option value="">— Select category —</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className={LABEL}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          placeholder="Optional notes…"
          className={INPUT + " resize-none"}
        />
      </div>

      {/* Alert toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => set("has_alert", !form.has_alert)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            form.has_alert
              ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
              : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
          }`}
        >
          <svg className="w-4 h-4" fill={form.has_alert ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {form.has_alert ? "Alert On" : "Alert Off"}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : initial ? "Update Offer" : "Add Offer"}
        </button>
      </div>
    </form>
  );
}
