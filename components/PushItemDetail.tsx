"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  BanknotesIcon,
  ArrowRightCircleIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import type { FullItemDetail } from "@/components/shortlist/ItemReviewModal";
import type { ShortListEntry } from "@/hooks/useShortList";

// ─── Helpers (same visual language as ItemReviewModal) ──────────────────────

const URGENCY: Record<string, { bg: string; color: string; label: string }> = {
  expired:  { bg: "#fee2e2", color: "#dc2626", label: "Expired"  },
  critical: { bg: "#ffedd5", color: "#ea580c", label: "Critical" },
  warning:  { bg: "#fef9c3", color: "#ca8a04", label: "Warning"  },
  safe:     { bg: "#dcfce7", color: "#16a34a", label: "Safe"     },
};

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function daysLabel(n: number): string {
  if (n < 0) return "Expired";
  if (n === 0) return "Today";
  if (n <= 30) return `${n}d left`;
  return `${Math.round(n / 30)}mo left`;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entryId: number | null;
  isManager: boolean;
  onPatchEntry?: (id: number, patch: Partial<ShortListEntry>) => void;
  onRemoveEntry?: (id: number) => void;
  onToast?: (msg: string) => void;
}

export default function PushItemDetail({
  isOpen,
  onClose,
  entryId,
  isManager,
  onPatchEntry,
  onRemoveEntry,
  onToast,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [item, setItem] = useState<FullItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Action forms
  const [form, setForm] = useState<"idle" | "sell" | "transfer">("idle");
  const [unitsInput, setUnitsInput] = useState("1");
  const [outletName, setOutletName] = useState("");
  const [transferQtyInput, setTransferQtyInput] = useState("1");
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unmarking, setUnmarking] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen || !entryId) return;
    setItem(null);
    setForm("idle");
    setActionError(null);
    setIsLoading(true);
    fetch(`/api/expiry/${entryId}/full-detail`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setItem(data.data as FullItemDetail);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isOpen, entryId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const u = item ? (URGENCY[item.urgency] ?? URGENCY.safe) : URGENCY.safe;
  const maxQty = item?.qty ?? 0;
  const units = parseInt(unitsInput, 10);
  const transferQty = parseInt(transferQtyInput, 10);
  const sellValid = !isNaN(units) && units >= 1 && units <= maxQty;
  const transferValid =
    outletName.trim().length > 0 && !isNaN(transferQty) && transferQty >= 1 && transferQty <= maxQty;
  const canAct = !!item && item.item_status === "active" && item.qty > 0;

  // ── Actions (same APIs as the standard Item Review popup) ─────────────────

  async function confirmSell() {
    if (!item) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/expiry/${item.id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units_sold: units }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      const newQty = json.fully_sold ? 0 : (json.remaining as number ?? 0);
      if (newQty === 0) {
        // Fully sold — drop from the push list immediately
        onRemoveEntry?.(item.id);
        onToast?.("Sale recorded — all units sold");
        onClose();
      } else {
        setItem((prev) => (prev ? { ...prev, qty: newQty } : prev));
        onPatchEntry?.(item.id, { quantity: newQty });
        setForm("idle");
        onToast?.("Sale recorded & marked reviewed");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmTransfer() {
    if (!item) return;
    const name = outletName.trim();
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/expiry/${item.id}/outlet-transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_name: name, qty_transferred: transferQty }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      const newQty: number = json.new_qty;
      if (newQty === 0) {
        onRemoveEntry?.(item.id);
      } else {
        onPatchEntry?.(item.id, { quantity: newQty });
      }
      onToast?.(`Transferred to ${name} successfully`);
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to record transfer");
    } finally {
      setSubmitting(false);
    }
  }

  async function unmarkPushItem() {
    if (!item) return;
    setUnmarking(true);
    try {
      const res = await fetch(`/api/expiry/${item.id}/push-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark: false }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      // is_push_item: false removes it from the push list via useShortList
      onPatchEntry?.(item.id, {
        is_push_item: false,
        push_item_marked_at: null,
        push_item_marked_by: null,
      });
      onToast?.("Unmarked as Push Item");
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setUnmarking(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center md:items-center p-0 md:p-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="bg-white shadow-xl w-full md:max-w-md flex flex-col rounded-t-2xl rounded-b-none md:rounded-2xl max-h-[92vh] md:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex-shrink-0 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#7c3aed" }}>
              Push Item
            </p>
            {item && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: u.bg, color: u.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: u.color }} />
                {u.label} · {daysLabel(item.days_left)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-slate-100"
          >
            <XMarkIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-44 bg-slate-100 rounded-2xl" />
              <div className="h-5 w-3/4 bg-slate-100 rounded" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
              <div className="h-16 bg-slate-100 rounded-xl" />
            </div>
          ) : !item ? (
            <p className="text-sm text-slate-400 text-center py-12">
              Failed to load item details.
            </p>
          ) : (
            <>
              {/* Product image — the visual hero */}
              <div
                className="rounded-2xl flex items-center justify-center overflow-hidden mb-4"
                style={{ background: "#f8fafc", border: "1px solid #f1f5f9", height: 190 }}
              >
                {item.push_product_image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.push_product_image}
                    alt={item.description}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-300">
                    <CubeIcon className="w-14 h-14" />
                    <span className="text-[11px] font-medium">No product photo</span>
                  </div>
                )}
              </div>

              {/* Description + info row */}
              <h2 className="text-lg font-bold text-slate-900 leading-snug">
                {item.description}
              </h2>
              <p className="text-xs text-slate-400 mt-1 truncate">
                {item.category} · {item.pic_name} ·{" "}
                <span className="font-mono">{item.barcode}</span>
              </p>

              {/* Active ingredient — hidden entirely when empty */}
              {item.push_active_ingredient && (
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Active Ingredient
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {item.push_active_ingredient}
                  </p>
                </div>
              )}

              {/* Selling points — hidden entirely when empty */}
              {item.push_selling_points && (
                <div
                  className="mt-4 rounded-xl px-4 py-3"
                  style={{ background: "#faf5ff", border: "1px solid #ede9fe" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#7c3aed" }}>
                    Why Push This
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {item.push_selling_points}
                  </p>
                </div>
              )}

              {/* Quick facts — supporting info, compact */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: "Quantity", value: `${item.qty}${item.uom ? ` ${item.uom}` : ""}` },
                  { label: "Expiry", value: fmtDate(item.expiry_date) },
                  { label: "Days Left", value: daysLabel(item.days_left) },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="rounded-xl px-2.5 py-2 text-center"
                    style={{ background: "#f8fafc", border: "1px solid #f1f5f9" }}
                  >
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                      {f.label}
                    </p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* ── Action forms ── */}
              {form === "sell" && (
                <div className="mt-4 rounded-xl p-3 space-y-3" style={{ border: "1px solid #e2e8f0" }}>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Units Sold <span className="normal-case font-normal">(max {maxQty})</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={unitsInput}
                    onChange={(e) => setUnitsInput(e.target.value)}
                    className="w-full text-sm font-medium text-slate-800 rounded-lg px-3 py-2 outline-none"
                    style={{
                      border: sellValid ? "1px solid #e2e8f0" : "1px solid #dc2626",
                      background: sellValid ? "white" : "#fff5f5",
                    }}
                    autoFocus
                  />
                  {actionError && <p className="text-[10px] text-red-500">{actionError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setForm("idle"); setActionError(null); }}
                      disabled={submitting}
                      className="h-8 px-3 rounded-lg text-xs font-semibold disabled:opacity-50"
                      style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmSell}
                      disabled={!sellValid || submitting}
                      className="h-8 px-3 rounded-lg text-xs font-semibold disabled:opacity-50"
                      style={{ background: "#dcfce7", color: "#16a34a" }}
                    >
                      {submitting ? "Saving…" : "Confirm Sold"}
                    </button>
                  </div>
                </div>
              )}

              {form === "transfer" && (
                <div className="mt-4 rounded-xl p-3 space-y-3" style={{ border: "1px solid #bfdbfe", background: "#f8faff" }}>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Outlet Name *
                    </label>
                    <input
                      type="text"
                      value={outletName}
                      onChange={(e) => { setOutletName(e.target.value); setActionError(null); }}
                      placeholder="Enter outlet name..."
                      className="w-full text-sm text-slate-800 rounded-lg px-3 py-2 outline-none"
                      style={{ border: "1px solid #e2e8f0", background: "white" }}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Qty to Transfer * <span className="normal-case font-normal text-slate-400">(max {maxQty})</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={maxQty}
                      value={transferQtyInput}
                      onChange={(e) => { setTransferQtyInput(e.target.value); setActionError(null); }}
                      className="w-full text-sm font-medium text-slate-800 rounded-lg px-3 py-2 outline-none"
                      style={{ border: "1px solid #e2e8f0", background: "white" }}
                    />
                  </div>
                  {actionError && <p className="text-[10px] text-red-500">{actionError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setForm("idle"); setActionError(null); }}
                      disabled={submitting}
                      className="h-8 px-3 rounded-lg text-xs font-semibold disabled:opacity-50"
                      style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmTransfer}
                      disabled={!transferValid || submitting}
                      className="h-8 px-3 rounded-lg text-xs font-semibold disabled:opacity-50"
                      style={{ background: "#eff6ff", color: "#2563eb" }}
                    >
                      {submitting ? "Saving…" : "Confirm Transfer"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer actions ── */}
        {item && !isLoading && (
          <div className="border-t border-slate-100 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] md:pb-4 flex-shrink-0 space-y-2">
            {canAct && form === "idle" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setUnitsInput("1"); setActionError(null); setForm("sell"); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
                  style={{ background: "#2563eb" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#1d4ed8"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#2563eb"; }}
                >
                  <BanknotesIcon className="w-4 h-4" />
                  Mark Sold
                </button>
                <button
                  type="button"
                  onClick={() => { setOutletName(""); setTransferQtyInput("1"); setActionError(null); setForm("transfer"); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ border: "1px solid #2563eb", color: "#2563eb", background: "white" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#eff6ff"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "white"; }}
                >
                  <ArrowRightCircleIcon className="w-4 h-4" />
                  Outlet Transfer
                </button>
              </div>
            )}
            {isManager && item.is_push_item && (
              <button
                type="button"
                onClick={unmarkPushItem}
                disabled={unmarking}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                style={{ background: "#ede9fe", color: "#7c3aed", border: "1px solid #ddd6fe" }}
              >
                {unmarking ? "Saving…" : "Unmark as Push Item"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "#f1f5f9", color: "#64748b" }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
