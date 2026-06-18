"use client";

import { useState } from "react";
import type { OfferEntry, OfferFormData } from "@/hooks/useOffers";
import OfferForm from "./OfferForm";
import {
  PencilSquareIcon,
  TrashIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

const STATUS_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  offered:   { bg: "#dbeafe", color: "#2563eb", dot: "#2563eb" },
  accepted:  { bg: "#dcfce7", color: "#16a34a", dot: "#16a34a" },
  rejected:  { bg: "#fee2e2", color: "#dc2626", dot: "#dc2626" },
  completed: { bg: "#dcfce7", color: "#16a34a", dot: "#16a34a" },
};

const STATUS_LABEL: Record<string, string> = {
  offered:   "Offered",
  accepted:  "Accepted",
  rejected:  "Rejected",
  completed: "Completed",
};

interface Props {
  entries: OfferEntry[];
  isLoading: boolean;
  onUpdate: (id: number, data: Partial<OfferFormData>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onToggleAlert: (id: number) => Promise<void>;
}

const TH =
  "sticky top-0 z-10 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap";
const TD = "px-5 py-3.5 font-medium";

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
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-[#f1f5f9] animate-pulse">
            <div className="flex gap-4">
              <div className="h-4 w-24 bg-[#f1f5f9] rounded" />
              <div className="h-4 w-16 bg-[#f1f5f9] rounded" />
              <div className="h-4 flex-1 bg-[#f1f5f9] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm flex flex-col items-center justify-center py-16 text-center">
        <DocumentTextIcon className="w-12 h-12 text-[#cbd5e1] mb-3" />
        <p className="text-sm text-[#94a3b8]">No offers found</p>
        <p className="text-xs text-[#94a3b8] mt-1">Offers are created from Item Short List.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
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
              <th className={`${TH} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const statusStyle = STATUS_STYLE[entry.offer_status] ?? { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" };
              return (
              <tr
                key={entry.id}
                className="transition-colors duration-150"
                style={{ borderBottom: "1px solid #f1f5f9" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
              >
                <td className={`${TD} text-[#334155] text-xs whitespace-nowrap`}>
                  {formatDate(entry.created_at)}
                </td>
                <td className={`${TD} text-[#334155] font-mono text-xs whitespace-nowrap`}>
                  {entry.stock_id ?? "—"}
                </td>
                <td className={`${TD} text-[#334155] font-mono text-xs whitespace-nowrap`}>
                  {entry.barcode}
                </td>
                <td className={`${TD} max-w-[200px]`}>
                  <span
                    className="block truncate text-[#334155] font-medium"
                    title={entry.description + (entry.notes ? ` — ${entry.notes}` : "")}
                  >
                    {entry.description}
                  </span>
                  {entry.notes && (
                    <span className="block truncate text-xs text-[#94a3b8] mt-0.5" title={entry.notes}>
                      {entry.notes}
                    </span>
                  )}
                </td>
                <td className={`${TD} text-[#334155] whitespace-nowrap`}>{entry.category ?? "—"}</td>
                <td className={`${TD} text-[#334155] text-xs whitespace-nowrap`}>{entry.uom ?? "—"}</td>
                <td className={`${TD} text-[#334155] whitespace-nowrap`}>{entry.quantity}</td>
                <td className={`${TD} text-[#334155] font-medium whitespace-nowrap`}>{entry.outlet_name}</td>
                <td className={`${TD} whitespace-nowrap`}>
                  <span
                    className="badge"
                    style={{ background: statusStyle.bg, color: statusStyle.color }}
                  >
                    <Dot color={statusStyle.dot} />
                    {STATUS_LABEL[entry.offer_status] ?? entry.offer_status}
                  </span>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <button
                    onClick={() => onToggleAlert(entry.id)}
                    title={entry.has_alert ? "Alert on — click to turn off" : "Alert off — click to turn on"}
                    className={`p-1.5 rounded-lg transition-colors ${
                      entry.has_alert
                        ? "text-[#ca8a04] hover:text-[#a16207] hover:bg-yellow-50"
                        : "text-[#cbd5e1] hover:text-[#64748b] hover:bg-[#f1f5f9]"
                    }`}
                  >
                    <svg className="w-4 h-4" fill={entry.has_alert ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditingOffer(entry)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{ color: "#2563eb" }}
                      title="Edit"
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#eff6ff")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    {deletingId === entry.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={async () => { await onDelete(entry.id); setDeletingId(null); }}
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
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ color: "#dc2626" }}
                        title="Delete"
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#fee2e2")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
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
