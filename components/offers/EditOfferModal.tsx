"use client";

import { useState } from "react";
import type { OfferEntry, OfferFormData } from "@/hooks/useOffers";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

interface Props {
  offer: OfferEntry;
  onClose: () => void;
  onSave: (data: Partial<OfferFormData>) => Promise<void>;
}

const INPUT_CLS =
  "w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-sm text-[#0f172a] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]";
const LABEL_CLS = "block text-xs font-semibold text-[#64748b] uppercase tracking-wide";

export default function EditOfferModal({ offer, onClose, onSave }: Props) {
  const [quantity, setQuantity] = useState(String(offer.quantity));
  const [outletName, setOutletName] = useState(offer.outlet_name);
  const [notes, setNotes] = useState(offer.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAccepted = offer.offer_status === "accepted";

  async function handleSave() {
    const qty = Math.round(Number(quantity));
    if (!Number.isFinite(qty) || qty < 1) {
      setError("Quantity must be at least 1");
      return;
    }
    if (!outletName.trim()) {
      setError("Outlet is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        quantity: qty,
        outlet_name: outletName.trim(),
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
      <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md p-6 space-y-5">
        <h3 className="text-base font-semibold text-[#1e293b]">Edit Offer</h3>

        <div className="space-y-1 text-sm text-[#64748b]">
          <p className="font-semibold text-[#334155]">{offer.description}</p>
          <p className="text-xs font-mono">{offer.barcode}</p>
        </div>

        {isAccepted && (
          <div
            className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm"
            style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}
          >
            <InformationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              This offer was already marked Received. Changing the quantity will
              automatically rebalance the quantity on the Item Short List.
            </span>
          </div>
        )}

        <div className="space-y-1">
          <label className={LABEL_CLS}>Outlet</label>
          <input
            type="text"
            value={outletName}
            onChange={(e) => setOutletName(e.target.value)}
            className={INPUT_CLS}
          />
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLS}>Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={INPUT_CLS}
          />
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLS}>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`${INPUT_CLS} resize-none`}
          />
        </div>

        {error && <p className="text-sm text-[#dc2626]">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: "#2563eb" }}
            onMouseEnter={(e) => { if (!submitting) (e.currentTarget as HTMLElement).style.background = "#1d4ed8"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#2563eb"; }}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
