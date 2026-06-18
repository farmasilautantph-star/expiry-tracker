"use client";

import { useState } from "react";
import type { OfferEntry, OfferFormData } from "@/hooks/useOffers";
import OfferForm from "./OfferForm";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

const STATUS_BADGE: Record<string, string> = {
  offered: "bg-blue-50 text-[#1e3a8a] border border-blue-200",
  accepted: "bg-green-50 text-[#16a34a] border border-green-200",
  rejected: "bg-red-50 text-[#ef4444] border border-red-200",
  completed: "bg-emerald-50 text-[#059669] border border-emerald-200",
};

const STATUS_LABEL: Record<string, string> = {
  offered: "🔵 Offered",
  accepted: "🟢 Accepted",
  rejected: "🔴 Rejected",
  completed: "✅ Completed",
};

interface Props {
  entries: OfferEntry[];
  isLoading: boolean;
  onUpdate: (id: number, data: Partial<OfferFormData>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onToggleAlert: (id: number) => Promise<void>;
}

const TH =
  "sticky top-0 z-10 bg-[#f8fafc] px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap border-b border-[#e2e8f0]";
const TD = "px-4 py-3 font-medium";

export default function OffersTable({
  entries,
  isLoading,
  onUpdate,
  onDelete,
  onToggleAlert,
}: Props) {
  const [editingOffer, setEditingOffer] = useState<OfferEntry | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-[#e2e8f0] shadow-sm">
        <div className="flex items-center gap-3 text-[#64748b]">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-[#e2e8f0] shadow-sm">
        <svg
          className="w-10 h-10 text-[#cbd5e1] mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        <p className="text-sm text-[#64748b]">No offers found.</p>
        <p className="text-xs text-[#94a3b8] mt-1">
          Offers are created from Item Short List.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        <p className="px-4 py-2.5 text-xs text-[#64748b] bg-[#f8fafc] border-b border-[#e2e8f0]">
          Showing {entries.length} {entries.length === 1 ? "offer" : "offers"}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f8fafc]">
              <th className={TH}>Date Offered</th>
              <th className={TH}>Stock ID</th>
              <th className={TH}>Barcode</th>
              <th className={`${TH} max-w-[200px]`}>Description</th>
              <th className={TH}>Category</th>
              <th className={TH}>UOM</th>
              <th className={TH}>Qty</th>
              <th className={TH}>Outlet Name</th>
              <th className={TH}>Offer Status</th>
              <th className={TH}>Alert</th>
              <th className={TH}>Expiry Date</th>
              <th className={`${TH} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="hover:bg-[#f0f4ff] transition-colors"
              >
                <td className={`${TD} text-[#64748b] text-xs whitespace-nowrap`}>
                  {formatDate(entry.created_at)}
                </td>
                <td
                  className={`${TD} text-[#64748b] font-mono text-xs whitespace-nowrap`}
                >
                  {entry.stock_id ?? "—"}
                </td>
                <td
                  className={`${TD} text-[#64748b] font-mono text-xs whitespace-nowrap`}
                >
                  {entry.barcode}
                </td>
                <td className={`${TD} max-w-[200px]`}>
                  <span
                    className="block truncate text-[#1e293b] font-medium"
                    title={
                      entry.description +
                      (entry.notes ? ` — ${entry.notes}` : "")
                    }
                  >
                    {entry.description}
                  </span>
                  {entry.notes && (
                    <span
                      className="block truncate text-xs text-[#94a3b8] mt-0.5"
                      title={entry.notes}
                    >
                      {entry.notes}
                    </span>
                  )}
                </td>
                <td className={`${TD} text-[#1e293b] whitespace-nowrap`}>
                  {entry.category ?? "—"}
                </td>
                <td className={`${TD} text-[#64748b] text-xs whitespace-nowrap`}>
                  {entry.uom ?? "—"}
                </td>
                <td className={`${TD} text-[#1e293b] whitespace-nowrap`}>
                  {entry.quantity}
                </td>
                <td className={`${TD} text-[#1e293b] font-medium whitespace-nowrap`}>
                  {entry.outlet_name}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <span
                    className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[entry.offer_status] ?? ""}`}
                  >
                    {STATUS_LABEL[entry.offer_status] ?? entry.offer_status}
                  </span>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <button
                    onClick={() => onToggleAlert(entry.id)}
                    title={
                      entry.has_alert
                        ? "Alert on — click to turn off"
                        : "Alert off — click to turn on"
                    }
                    className={`p-1.5 rounded-lg transition-colors ${
                      entry.has_alert
                        ? "text-[#ca8a04] hover:text-[#a16207] hover:bg-yellow-50"
                        : "text-[#cbd5e1] hover:text-[#64748b] hover:bg-[#f1f5f9]"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={entry.has_alert ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </button>
                </td>
                <td className={`${TD} text-[#64748b] text-xs whitespace-nowrap`}>
                  —
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setEditingOffer(entry)}
                      className="p-1.5 rounded-lg text-[#64748b] hover:text-[#1e3a8a] hover:bg-[#eff6ff] transition-colors"
                      title="Edit"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    {deletingId === entry.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={async () => {
                            await onDelete(entry.id);
                            setDeletingId(null);
                          }}
                          className="text-xs px-2 py-1 rounded bg-[#ef4444] text-white hover:bg-[#dc2626] transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs px-2 py-1 rounded bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(entry.id)}
                        className="p-1.5 rounded-lg text-[#64748b] hover:text-[#ef4444] hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      <OfferForm
        isOpen={editingOffer !== null}
        onClose={() => setEditingOffer(null)}
        editingOffer={editingOffer ?? undefined}
        onSubmit={async (data) => {
          if (!editingOffer) return;
          await onUpdate(editingOffer.id, {
            offer_status: data.offer_status,
            quantity: data.quantity,
            outlet_name: data.outlet_name,
            has_alert: data.has_alert,
            notes: data.notes,
          });
          setEditingOffer(null);
        }}
      />
    </>
  );
}
