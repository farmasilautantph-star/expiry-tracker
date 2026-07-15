"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  QrCodeIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

interface CheckResult {
  product: { barcode: string | null; description: string } | null;
  policy: {
    brand: string;
    supplier_name: string;
    return_type: string;
    months_before_expiry: number | null;
    special_conditions: string | null;
  } | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** When set, the modal auto-runs a search for this query as soon as it opens. */
  initialQuery?: string;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  RETURNABLE: { bg: "#16a34a", color: "#ffffff", label: "Returnable" },
  NON_RETURNABLE: { bg: "#fee2e2", color: "#b91c1c", label: "Non-Returnable" },
  EXCHANGEABLE: { bg: "#fbbf24", color: "#451a03", label: "Exchangeable" },
};

export default function QuickPolicyCheckModal({ isOpen, onClose, initialQuery }: Props) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setSearched(false);
      setLoading(false);
      return;
    }
    setQuery(initialQuery ?? "");
    if (initialQuery?.trim()) {
      void runSearch(initialQuery.trim());
    } else {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialQuery]);

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/return-policy/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const json = await res.json();
      setResult(json?.success ? json.data : { product: null, policy: null });
    } catch {
      setResult({ product: null, policy: null });
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runSearch(query);
  }

  if (!mounted || !isOpen) return null;

  const status = result?.policy ? STATUS_STYLE[result.policy.return_type] : undefined;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center md:items-center p-0 md:p-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="bg-white shadow-xl w-full md:max-w-md flex flex-col rounded-t-2xl rounded-b-none md:rounded-2xl max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-5 pt-4 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Quick Return Policy Check</h2>
            <p className="text-xs text-slate-400 mt-0.5">Scan or search — read-only lookup</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <XMarkIcon className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="px-5 pt-4 flex-shrink-0">
          <form onSubmit={handleSubmit} className="relative">
            <QrCodeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Barcode or product name…"
              className="w-full pl-10 pr-11 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              title="Search"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : !searched ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <QrCodeIcon className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Enter a barcode or product name to check its return policy.</p>
            </div>
          ) : result?.policy && status ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                  Product
                </p>
                <p className="text-sm font-semibold text-slate-900 leading-snug">
                  {result.product?.description}
                </p>
                {result.product?.barcode && (
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Barcode: {result.product.barcode}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                  Return Status
                </p>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: status.bg, color: status.color }}
                >
                  {status.label}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1 border-t border-slate-200">
                <Row
                  label="Months Before Expiry"
                  value={
                    result.policy.months_before_expiry != null
                      ? `${result.policy.months_before_expiry} month${result.policy.months_before_expiry === 1 ? "" : "s"}`
                      : "—"
                  }
                />
                <Row label="Special Conditions" value={result.policy.special_conditions || "—"} />
                <Row label="Supplier" value={result.policy.supplier_name || "—"} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-medium text-slate-500">
                No return policy found for this item.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-slate-700 font-medium text-right">{value}</span>
    </div>
  );
}
