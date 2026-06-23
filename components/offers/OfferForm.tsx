"use client";

import { useEffect, useState } from "react";
import type { OfferEntry, OfferFormData } from "@/hooks/useOffers";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface SourceItem {
  expiry_log_id: number;
  stock_id: string | null;
  barcode: string;
  description: string;
  category: string;
  uom: string | null;
  expiry_date: string;
  quantity: number;
  total_offered: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  source?: SourceItem;
  editingOffer?: OfferEntry;
  onSubmit: (data: OfferFormData) => Promise<void>;
}

const INPUT =
  "w-full border border-[#e2e8f0] bg-white text-[#0f172a] placeholder-[#94a3b8] text-sm font-medium transition-colors focus:outline-none";
const INPUT_RO =
  "w-full border border-[#f1f5f9] bg-[#f8fafc] text-[#64748b] text-sm cursor-not-allowed";
const INPUT_STYLE = { borderRadius: "10px", padding: "10px 16px" };

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

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

export default function OfferForm({
  isOpen,
  onClose,
  source,
  editingOffer,
  onSubmit,
}: Props) {
  const [outletName, setOutletName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [offerStatus, setOfferStatus] = useState<string>("offered");
  const [hasAlert, setHasAlert] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existingOffers, setExistingOffers] = useState<
    Array<{ outlet_name: string; quantity: number }>
  >([]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingOffer) {
      setOutletName(editingOffer.outlet_name);
      setQuantity(editingOffer.quantity);
      setOfferStatus(editingOffer.offer_status);
      setHasAlert(!!editingOffer.has_alert);
      setNotes(editingOffer.notes ?? "");
      setExistingOffers([]);
    } else {
      setOutletName("");
      setQuantity(1);
      setOfferStatus("offered");
      setHasAlert(false);
      setNotes("");
    }
    setError("");
  }, [isOpen, editingOffer]);

  // Fetch existing offers for this expiry_log_id so we can display them
  useEffect(() => {
    if (!isOpen || !source?.expiry_log_id) {
      setExistingOffers([]);
      return;
    }
    fetch(`/api/offers?expiry_log_id=${source.expiry_log_id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setExistingOffers(
            json.data.map((o: { outlet_name: string; quantity: number }) => ({
              outlet_name: o.outlet_name,
              quantity: o.quantity,
            })),
          );
        }
      })
      .catch(() => {
        /* silent */
      });
  }, [isOpen, source?.expiry_log_id]);

  if (!isOpen) return null;

  const isEditMode = !!editingOffer;
  const displayItem =
    source ??
    (editingOffer
      ? {
          expiry_log_id: editingOffer.expiry_log_id ?? 0,
          stock_id: editingOffer.stock_id,
          barcode: editingOffer.barcode,
          description: editingOffer.description,
          category: editingOffer.category ?? "",
          uom: editingOffer.uom,
          expiry_date: "",
        }
      : null);

  const remaining = source ? source.quantity - source.total_offered : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outletName.trim()) {
      setError("Outlet name is required.");
      return;
    }
    if (quantity < 1) {
      setError("Quantity must be at least 1.");
      return;
    }
    if (remaining !== null && quantity > remaining) {
      setError(
        `Cannot offer more than ${remaining} remaining unit${remaining === 1 ? "" : "s"}.`,
      );
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (isEditMode) {
        await onSubmit({
          barcode: editingOffer!.barcode,
          description: editingOffer!.description,
          outlet_name: outletName,
          quantity,
          offer_status: offerStatus,
          has_alert: hasAlert,
          notes,
        });
      } else if (source) {
        await onSubmit({
          expiry_log_id: source.expiry_log_id,
          stock_id: source.stock_id ?? "",
          barcode: source.barcode,
          description: source.description,
          category: source.category,
          uom: source.uom ?? "",
          outlet_name: outletName,
          quantity,
          offer_status: offerStatus,
          has_alert: hasAlert,
          notes,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save offer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Modal */}
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
            {isEditMode ? "Edit Offer" : "Offer to Outlet"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-[#64748b]"
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f1f5f9")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
          >
            <XMarkIcon className="w-[18px] h-[18px]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-[#ef4444] text-sm">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Read-only item info */}
            {displayItem && (
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-3">
                <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Item Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Stock ID</Label>
                    <input type="text" value={displayItem.stock_id ?? "—"} readOnly className={INPUT_RO} style={INPUT_STYLE} />
                  </div>
                  <div>
                    <Label>Barcode</Label>
                    <input type="text" value={displayItem.barcode} readOnly className={INPUT_RO} style={INPUT_STYLE} />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <input type="text" value={displayItem.description} readOnly className={INPUT_RO} style={INPUT_STYLE} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Category</Label>
                    <input type="text" value={displayItem.category} readOnly className={INPUT_RO} style={INPUT_STYLE} />
                  </div>
                  <div>
                    <Label>UOM</Label>
                    <input type="text" value={displayItem.uom ?? "—"} readOnly className={INPUT_RO} style={INPUT_STYLE} />
                  </div>
                  {displayItem.expiry_date && (
                    <div>
                      <Label>Expiry Date</Label>
                      <input type="text" value={formatDate(displayItem.expiry_date)} readOnly className={INPUT_RO} style={INPUT_STYLE} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Availability summary */}
            {source && (
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                    Availability
                  </p>
                  <span className={`text-xs font-bold ${remaining === 0 ? "text-[#ef4444]" : "text-[#16a34a]"}`}>
                    {remaining} of {source.quantity} unit{source.quantity === 1 ? "" : "s"} remaining
                  </span>
                </div>
                {existingOffers.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-[#e2e8f0]">
                    <p className="text-xs text-[#94a3b8]">Already offered:</p>
                    {existingOffers.map((o, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-[#334155]">{o.outlet_name}</span>
                        <span className="text-[#94a3b8]">{o.quantity} unit{o.quantity === 1 ? "" : "s"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manager fills */}
            <div>
              <Label required>Outlet Name</Label>
              <input
                type="text"
                value={outletName}
                onChange={(e) => setOutletName(e.target.value)}
                placeholder="Enter outlet name…"
                className={INPUT}
                style={INPUT_STYLE}
                autoFocus
                onFocus={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = ""; }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>
                  Quantity{remaining !== null ? ` (max ${remaining})` : ""}
                </Label>
                <input
                  type="number"
                  min={1}
                  max={remaining ?? undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className={INPUT}
                  style={INPUT_STYLE}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = ""; }}
                />
              </div>
              <div>
                <Label>Offer Status</Label>
                <select
                  value={offerStatus}
                  onChange={(e) => setOfferStatus(e.target.value)}
                  className={INPUT}
                  style={INPUT_STYLE}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = ""; }}
                >
                  <option value="offered">Offered</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes…"
                className={INPUT + " resize-none"}
                style={INPUT_STYLE}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = ""; }}
              />
            </div>

            {/* Alert toggle */}
            <button
              type="button"
              onClick={() => setHasAlert((v) => !v)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                hasAlert
                  ? "bg-yellow-50 border-yellow-300 text-[#ca8a04]"
                  : "bg-white border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
              }`}
            >
              <svg className="w-4 h-4" fill={hasAlert ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {hasAlert ? "Alert On — will be flagged" : "Alert Off"}
            </button>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-6 pb-6 pt-4 flex-shrink-0"
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
              disabled={saving}
              className="text-white font-semibold rounded-xl px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ background: "#2563eb", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}
              onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLElement).style.background = "#1d4ed8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#2563eb"; }}
            >
              {saving ? "Saving…" : isEditMode ? "Update Offer" : "Submit Offer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
