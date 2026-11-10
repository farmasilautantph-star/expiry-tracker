"use client";

import { useState } from "react";
import type { OfferEntry } from "@/hooks/useOffers";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface Props {
  offer: OfferEntry;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteOfferModal({ offer, onClose, onConfirm }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAccepted = offer.offer_status === "accepted";

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete offer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
      <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#fef2f2" }}
          >
            <ExclamationTriangleIcon className="w-5 h-5 text-[#dc2626]" />
          </div>
          <h3 className="text-base font-semibold text-[#1e293b]">Delete Offer</h3>
        </div>

        <div className="space-y-1 text-sm text-[#64748b]">
          <p className="font-semibold text-[#334155]">{offer.description}</p>
          <p>
            Outlet: <span className="font-medium text-[#334155]">{offer.outlet_name}</span>
          </p>
          <p>
            Qty:{" "}
            <span className="font-medium text-[#334155]">
              {offer.quantity} unit{offer.quantity !== 1 ? "s" : ""}
            </span>
          </p>
        </div>

        {isAccepted && (
          <div
            className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm"
            style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}
          >
            <span>
              This offer was marked Received — deleting it will restore{" "}
              {offer.quantity} unit{offer.quantity !== 1 ? "s" : ""} back to the Item
              Short List.
            </span>
          </div>
        )}

        <p className="text-sm text-[#64748b]">This cannot be undone. Are you sure?</p>

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
            onClick={handleDelete}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: "#dc2626" }}
            onMouseEnter={(e) => { if (!submitting) (e.currentTarget as HTMLElement).style.background = "#b91c1c"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#dc2626"; }}
          >
            {submitting ? "Deleting..." : "Delete Offer"}
          </button>
        </div>
      </div>
    </div>
  );
}
