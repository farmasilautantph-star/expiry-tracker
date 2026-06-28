"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OfferEntry } from "@/hooks/useOffers";
import type { MonthValue } from "@/components/ui/MonthPicker";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import {
  CheckIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";

interface Props {
  entries: OfferEntry[];
  isLoading: boolean;
  activeMonth: MonthValue | null;
  search: string;
  onUpdateOfferStatus: (
    id: number,
    status: "accepted" | "rejected",
    opts?: { received_at?: string; rejection_notes?: string }
  ) => Promise<{ qty_deducted: number; item_completed: boolean }>;
  onRefresh?: () => Promise<void>;
}

const TH = "sticky top-0 z-10 bg-[#f8fafc] px-4 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap";
const TD = "px-4 py-3 text-sm font-medium";

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function calcDaysLeft(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(expiryDate);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function DaysLeftBadge({ expiryDate }: { expiryDate: string | null }) {
  const days = calcDaysLeft(expiryDate);
  if (days === null) return <span className="text-[#cbd5e1] text-xs">—</span>;
  const bg    = days < 0 ? "#fee2e2" : days < 90 ? "#ffedd5" : days <= 240 ? "#fef9c3" : "#dcfce7";
  const color = days < 0 ? "#dc2626" : days < 90 ? "#ea580c" : days <= 240 ? "#ca8a04" : "#16a34a";
  const label = days < 0 ? "Expired" : days === 0 ? "Today" : days <= 30 ? `${days}d left` : `${Math.round(days / 30)}m left`;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: bg, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

export default function ActiveOffersTab({ entries, isLoading, activeMonth, search, onUpdateOfferStatus, onRefresh }: Props) {
  const router = useRouter();
  const [receivingOffer, setReceivingOffer] = useState<OfferEntry | null>(null);
  const [rejectingOffer, setRejectingOffer] = useState<OfferEntry | null>(null);
  const [receivedAt, setReceivedAt] = useState(() => new Date().toISOString().split("T")[0]);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toasts, showSuccess, showError, dismiss } = useToast();

  const filtered = useMemo(() => {
    let data = entries.filter((e) => e.offer_status === "offered");
    if (activeMonth) {
      const ym = `${activeMonth.year}-${String(activeMonth.month).padStart(2, "0")}`;
      data = data.filter((e) => e.created_at.substring(0, 7) === ym);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.outlet_name.toLowerCase().includes(q) ||
          e.barcode.toLowerCase().includes(q) ||
          (e.stock_id ?? "").toLowerCase().includes(q)
      );
    }
    return data;
  }, [entries, activeMonth, search]);

  async function handleReceived() {
    if (!receivingOffer) return;
    setSubmitting(true);
    try {
      const result = await onUpdateOfferStatus(receivingOffer.id, "accepted", {
        received_at: receivedAt || undefined,
      });
      setReceivingOffer(null);
      if (result.item_completed) {
        showSuccess(`Offer confirmed! ${result.qty_deducted} unit${result.qty_deducted !== 1 ? "s" : ""} deducted — item moved to Sales Record`);
      } else {
        showSuccess(`Offer confirmed! ${result.qty_deducted} unit${result.qty_deducted !== 1 ? "s" : ""} deducted from stock`);
      }
      await onRefresh?.();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to confirm received");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejected() {
    if (!rejectingOffer) return;
    setSubmitting(true);
    try {
      await onUpdateOfferStatus(rejectingOffer.id, "rejected", {
        rejection_notes: rejectionNotes || undefined,
      });
      setRejectingOffer(null);
      setRejectionNotes("");
      showSuccess("Offer marked as rejected");
      await onRefresh?.();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to reject offer");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-4 py-4 border-b border-[#f1f5f9] animate-pulse">
            <div className="flex gap-4">
              <div className="h-4 w-24 bg-[#f1f5f9] rounded" />
              <div className="h-4 w-48 bg-[#f1f5f9] rounded" />
              <div className="h-4 flex-1 bg-[#f1f5f9] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismiss} />

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
          style={{ border: "1px solid #e2e8f0" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#f1f5f9" }}
          >
            <BuildingStorefrontIcon className="w-8 h-8 text-[#94a3b8]" />
          </div>
          <p className="text-base font-semibold text-[#334155]">No active offers</p>
          <p className="text-sm text-[#94a3b8] mt-2 max-w-xs leading-relaxed">
            Offers are created from the Item Short List. Pick a short-expiry item and offer it to an outlet to get started.
          </p>
          <button
            onClick={() => router.push("/dashboard/shortlist")}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: "#2563eb" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#1d4ed8")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#2563eb")}
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
            Go to Item Short List
          </button>
        </div>
      ) : (
        <>
          {/* Mobile card list — below md */}
          <div className="md:hidden flex flex-col gap-2.5">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className="bg-white p-4"
                style={{
                  borderRadius: 18,
                  border: "1px solid #eef1f6",
                  boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
                }}
              >
                {/* Header: days-left badge + offered date */}
                <div className="flex items-center justify-between mb-2.5 gap-2">
                  <DaysLeftBadge expiryDate={entry.expiry_date} />
                  <span className="text-[11px] font-medium text-[#94a3b8] whitespace-nowrap">
                    Offered: {formatShortDate(entry.created_at)}
                  </span>
                </div>

                {/* Name */}
                <p
                  className="text-[13.5px] font-bold text-[#0f172a] leading-[1.3] mb-1.5"
                  style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                  title={entry.description}
                >
                  {entry.description}
                </p>

                {/* Outlet + meta */}
                <div className="flex items-center gap-1.5 mb-1">
                  <BuildingStorefrontIcon className="w-3.5 h-3.5 text-[#94a3b8] flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#334155] truncate">{entry.outlet_name}</span>
                </div>
                <p className="text-xs text-[#64748b] mb-3 leading-[1.45]">
                  Qty: {entry.quantity} · Exp: {formatShortDate(entry.expiry_date)}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setReceivingOffer(entry);
                      setReceivedAt(new Date().toISOString().split("T")[0]);
                    }}
                    className="flex-1 h-11 rounded-xl text-[13px] font-bold text-white inline-flex items-center justify-center gap-1.5"
                    style={{ background: "#1e3a5f", border: "none" }}
                  >
                    <CheckIcon className="w-4 h-4" />
                    Received
                  </button>
                  <button
                    onClick={() => { setRejectingOffer(entry); setRejectionNotes(""); }}
                    className="flex-1 h-11 rounded-xl text-[13px] font-bold inline-flex items-center justify-center gap-1.5"
                    style={{ background: "#fef2f2", color: "#b91c1c", border: "1.5px solid #fecaca" }}
                  >
                    <XMarkIcon className="w-4 h-4" />
                    Rejected
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table — md and up */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white">
          <div className="flex items-center px-4 py-2.5 bg-[#f8fafc]" style={{ borderBottom: "1px solid #e2e8f0" }}>
            <span className="text-xs text-[#94a3b8]">{filtered.length} {filtered.length === 1 ? "offer" : "offers"}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th className={`${TH} min-w-[180px]`}>Item</th>
                <th className={TH}>Barcode</th>
                <th className={TH}>Outlet</th>
                <th className={TH}>Category</th>
                <th className={TH}>Qty</th>
                <th className={TH}>Expiry</th>
                <th className={TH}>Days Left</th>
                <th className={TH}>Offered</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                >
                  <td className={`${TD} min-w-[180px]`}>
                    <p
                      className="text-sm font-semibold text-[#0f172a] leading-snug"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      title={entry.description}
                    >
                      {entry.description}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-[#94a3b8] mt-0.5 truncate" title={entry.notes}>
                        {entry.notes}
                      </p>
                    )}
                  </td>
                  <td className={`${TD} font-mono text-xs text-[#334155] whitespace-nowrap`}>{entry.barcode}</td>
                  <td className={`${TD} text-[#334155] font-semibold whitespace-nowrap`}>{entry.outlet_name}</td>
                  <td className={`${TD} text-xs text-[#475569] whitespace-nowrap`}>{entry.category ?? "—"}</td>
                  <td className={`${TD} text-[#334155] whitespace-nowrap`}>{entry.quantity}</td>
                  <td className={`${TD} text-xs text-[#475569] whitespace-nowrap`}>{formatShortDate(entry.expiry_date)}</td>
                  <td className={`${TD} whitespace-nowrap`}>
                    <DaysLeftBadge expiryDate={entry.expiry_date} />
                  </td>
                  <td className={`${TD} text-xs text-[#475569] whitespace-nowrap`}>{formatShortDate(entry.created_at)}</td>
                  <td className={`${TD} whitespace-nowrap text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setReceivingOffer(entry);
                          setReceivedAt(new Date().toISOString().split("T")[0]);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: "#dcfce7", color: "#16a34a" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#bbf7d0")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#dcfce7")}
                      >
                        <CheckIcon className="w-3 h-3" />
                        Received
                      </button>
                      <button
                        onClick={() => { setRejectingOffer(entry); setRejectionNotes(""); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: "#fee2e2", color: "#dc2626" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#fecaca")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#fee2e2")}
                      >
                        <XMarkIcon className="w-3 h-3" />
                        Rejected
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      {/* Received modal */}
      {receivingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md p-6 space-y-5">
            <h3 className="text-base font-semibold text-[#1e293b]">Confirm Offer Received</h3>
            <div className="space-y-1 text-sm text-[#64748b]">
              <p className="font-semibold text-[#334155]">{receivingOffer.description}</p>
              <p>Outlet: <span className="font-medium text-[#334155]">{receivingOffer.outlet_name}</span></p>
              <p>Qty: <span className="font-medium text-[#334155]">{receivingOffer.quantity} unit{receivingOffer.quantity !== 1 ? "s" : ""}</span></p>
            </div>
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>This will deduct {receivingOffer.quantity} unit{receivingOffer.quantity !== 1 ? "s" : ""} from item stock</span>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wide">Date Received (optional)</label>
              <input
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-sm text-[#0f172a] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setReceivingOffer(null)} disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleReceived} disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: "#16a34a" }}
                onMouseEnter={(e) => { if (!submitting) (e.currentTarget as HTMLElement).style.background = "#15803d"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#16a34a"; }}
              >
                <CheckIcon className="w-4 h-4" />
                {submitting ? "Saving..." : "Confirm Received"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejected modal */}
      {rejectingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md p-6 space-y-5">
            <h3 className="text-base font-semibold text-[#1e293b]">Confirm Offer Rejected</h3>
            <div className="space-y-1 text-sm text-[#64748b]">
              <p className="font-semibold text-[#334155]">{rejectingOffer.description}</p>
              <p>Outlet: <span className="font-medium text-[#334155]">{rejectingOffer.outlet_name}</span></p>
              <p>Qty: <span className="font-medium text-[#334155]">{rejectingOffer.quantity} unit{rejectingOffer.quantity !== 1 ? "s" : ""}</span></p>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wide">Reason (optional)</label>
              <textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                rows={3}
                placeholder="Enter reason for rejection..."
                className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-sm text-[#0f172a] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => { setRejectingOffer(null); setRejectionNotes(""); }} disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleRejected} disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: "#dc2626" }}
                onMouseEnter={(e) => { if (!submitting) (e.currentTarget as HTMLElement).style.background = "#b91c1c"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#dc2626"; }}
              >
                <XMarkIcon className="w-4 h-4" />
                {submitting ? "Saving..." : "Confirm Rejected"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
