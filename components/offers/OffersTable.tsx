"use client";

import { useState } from "react";
import type { OfferEntry, OfferFormData } from "@/hooks/useOffers";
import OffersForm from "./OffersForm";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

interface Props {
  entries: OfferEntry[];
  isLoading: boolean;
  onEdit: (id: number, data: Partial<OfferFormData>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onToggleAlert: (id: number) => Promise<void>;
}

const TH =
  "sticky top-0 z-10 bg-gray-900 px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-800";
const TD = "px-4 py-3";

export default function OffersTable({ entries, isLoading, onEdit, onDelete, onToggleAlert }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <p className="text-sm text-gray-500">No offers found.</p>
        <p className="text-xs text-gray-600 mt-1">Click &quot;+ Add Offer&quot; to get started.</p>
      </div>
    );
  }

  const editingEntry = editingId !== null ? entries.find((e) => e.id === editingId) : undefined;

  return (
    <div className="space-y-4">
      {/* Inline edit panel */}
      {editingEntry && (
        <div className="rounded-xl border border-blue-500/30 bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Edit Offer</h3>
          <OffersForm
            initial={editingEntry}
            onSubmit={async (data) => {
              await onEdit(editingEntry.id, data);
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <p className="px-4 py-2.5 text-xs text-gray-500 bg-gray-900 border-b border-gray-800">
          Showing {entries.length} {entries.length === 1 ? "item" : "items"}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900">
              <th className={TH}>Alert</th>
              <th className={TH}>Stock ID</th>
              <th className={TH}>Barcode</th>
              <th className={`${TH} max-w-[200px]`}>Description</th>
              <th className={TH}>Category</th>
              <th className={TH}>UOM</th>
              <th className={TH}>Qty</th>
              <th className={TH}>Date Added</th>
              <th className={`${TH} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-800/50 transition-colors">
                {/* Alert bell */}
                <td className={`${TD} whitespace-nowrap`}>
                  <button
                    onClick={() => onToggleAlert(entry.id)}
                    title={entry.has_alert ? "Alert on — click to turn off" : "Alert off — click to turn on"}
                    className={`p-1.5 rounded-lg transition-colors ${
                      entry.has_alert
                        ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                        : "text-gray-600 hover:text-gray-400 hover:bg-gray-800"
                    }`}
                  >
                    <svg className="w-4 h-4" fill={entry.has_alert ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                </td>
                <td className={`${TD} text-gray-400 font-mono text-xs whitespace-nowrap`}>{entry.stock_id ?? "—"}</td>
                <td className={`${TD} text-gray-400 font-mono text-xs whitespace-nowrap`}>{entry.barcode}</td>
                <td className={`${TD} max-w-[200px]`}>
                  <span className="block truncate text-white" title={entry.description + (entry.notes ? ` — ${entry.notes}` : "")}>
                    {entry.description}
                  </span>
                  {entry.notes && (
                    <span className="block truncate text-xs text-gray-500 mt-0.5" title={entry.notes}>
                      {entry.notes}
                    </span>
                  )}
                </td>
                <td className={`${TD} text-gray-300 whitespace-nowrap`}>{entry.category ?? "—"}</td>
                <td className={`${TD} text-gray-400 text-xs whitespace-nowrap`}>{entry.uom}</td>
                <td className={`${TD} text-gray-300 whitespace-nowrap`}>{entry.quantity}</td>
                <td className={`${TD} text-gray-400 text-xs whitespace-nowrap`}>{formatDate(entry.created_at)}</td>
                <td className={`${TD} whitespace-nowrap`}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-gray-800 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {deletingId === entry.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={async () => { await onDelete(entry.id); setDeletingId(null); }}
                          className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-500 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(entry.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
    </div>
  );
}
