"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import OfferForm from "@/components/offers/OfferForm";
import type { OfferFormData } from "@/hooks/useOffers";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActiveOffer {
  id: number;
  outlet_name: string | null;
  quantity_offered: number;
  offer_status: string;
  created_at: string;
  received_at: string | null;
  rejection_notes: string | null;
}

export interface FullItemDetail {
  id: number;
  description: string;
  barcode: string;
  stock_id: string | null;
  category: string;
  uom: string | null;
  qty: number;
  original_qty: number | null;
  expiry_date: string;
  days_left: number;
  urgency: "expired" | "critical" | "warning" | "safe";
  item_status: string;
  logged_at: string;
  pic_name: string;
  return_status: string | null;
  return_by_date: string | null;
  return_notes: string | null;
  active_offers: ActiveOffer[];
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  review_status: string;
  last_reviewed_display: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

const URGENCY: Record<string, { bg: string; color: string; label: string }> = {
  expired:  { bg: "#fee2e2", color: "#dc2626", label: "Expired"  },
  critical: { bg: "#ffedd5", color: "#ea580c", label: "Critical" },
  warning:  { bg: "#fef9c3", color: "#ca8a04", label: "Warning"  },
  safe:     { bg: "#dcfce7", color: "#16a34a", label: "Safe"     },
};

function daysLabel(n: number): string {
  if (n < 0) return "Expired";
  if (n === 0) return "Today";
  if (n <= 30) return `${n}d left`;
  return `${Math.round(n / 30)}m left`;
}

// ─── Layout atoms ─────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-slate-100 my-4" />;
}

type BtnVariant = "green" | "red" | "slate" | "blue";
const BTN_STYLES: Record<BtnVariant, React.CSSProperties> = {
  green: { background: "#dcfce7", color: "#16a34a" },
  red:   { background: "#fee2e2", color: "#dc2626" },
  slate: { background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" },
  blue:  { background: "#eff6ff", color: "#2563eb" },
};

function Btn({
  onClick,
  disabled,
  variant,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant: BtnVariant;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-8 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={BTN_STYLES[variant]}
    >
      {children}
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-24 bg-slate-100 rounded-xl" />
      <div className="h-4 w-1/3 bg-slate-100 rounded" />
      <div className="h-16 bg-slate-100 rounded-xl" />
      <div className="h-4 w-1/4 bg-slate-100 rounded" />
      <div className="h-16 bg-slate-100 rounded-xl" />
    </div>
  );
}

// ─── Section 1: Item Info ─────────────────────────────────────────────────────

function ItemInfoSection({ item }: { item: FullItemDetail }) {
  const u = URGENCY[item.urgency] ?? URGENCY.safe;
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Qty</p>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">
            {item.qty}{item.uom ? ` ${item.uom}` : ""}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiry</p>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">{fmtDate(item.expiry_date)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Left</p>
          <span
            className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: u.bg, color: u.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: u.color }} />
            {daysLabel(item.days_left)}
          </span>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Logged</p>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">{fmtDate(item.logged_at)}</p>
          <p className="text-xs text-slate-400">{item.pic_name}</p>
        </div>
        {item.last_reviewed_display && (
          <div className="col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Reviewed</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{item.last_reviewed_display}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section 2: Return ────────────────────────────────────────────────────────

type ReturnAction = "idle" | "confirming_returned" | "confirming_not_approved";

function ReturnSection({
  item,
  onItemUpdate,
}: {
  item: FullItemDetail;
  onItemUpdate: (fn: (prev: FullItemDetail) => FullItemDetail) => void;
}) {
  const [action, setAction] = useState<ReturnAction>("idle");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(status: "returned" | "not_approved") {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/returns/${item.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ return_status: status, return_notes: notes || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      onItemUpdate((prev) => ({ ...prev, return_status: status, return_notes: notes || null }));
      setAction("idle");
      setNotes("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update return status");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <SectionHeader>Return to Warehouse</SectionHeader>

      {item.return_status === "returned" ? (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: "#dcfce7" }}>
          <CheckIcon className="w-4 h-4 text-[#16a34a] flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[#16a34a]">Returned to Warehouse</p>
            {item.return_by_date && (
              <p className="text-xs text-[#16a34a] opacity-75 mt-0.5">Return by: {fmtDate(item.return_by_date)}</p>
            )}
          </div>
        </div>
      ) : item.return_status === "not_approved" ? (
        <div className="rounded-xl px-4 py-3 flex items-start gap-2" style={{ background: "#fee2e2" }}>
          <XMarkIcon className="w-4 h-4 text-[#dc2626] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#dc2626]">Return Not Approved</p>
            {item.return_notes && (
              <p className="text-xs text-[#dc2626] opacity-75 mt-0.5">{item.return_notes}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-3 space-y-3" style={{ border: "1px solid #e2e8f0" }}>
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "#d97706" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#d97706" }} />
              Pending
            </span>
            {item.return_by_date && (
              <p className="text-xs text-slate-400 mt-0.5">Return by: {fmtDate(item.return_by_date)}</p>
            )}
          </div>

          {action === "idle" && (
            <div className="flex gap-2">
              <Btn variant="green" onClick={() => { setNotes(""); setAction("confirming_returned"); }}>
                ✓ Mark Returned
              </Btn>
              <Btn variant="red" onClick={() => { setNotes(""); setAction("confirming_not_approved"); }}>
                ✗ Not Approved
              </Btn>
            </div>
          )}

          {action === "confirming_returned" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">Confirm return completed?</p>
              <div className="flex gap-2">
                <Btn variant="slate" onClick={() => setAction("idle")} disabled={submitting}>Cancel</Btn>
                <Btn variant="green" onClick={() => submit("returned")} disabled={submitting}>
                  {submitting ? "Saving…" : "Confirm"}
                </Btn>
              </div>
            </div>
          )}

          {action === "confirming_not_approved" && (
            <div className="space-y-2">
              <textarea
                className="w-full text-xs rounded-lg px-3 py-2 resize-none outline-none"
                style={{ border: "1px solid #e2e8f0", minHeight: 60 }}
                placeholder="Reason (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex gap-2">
                <Btn variant="slate" onClick={() => setAction("idle")} disabled={submitting}>Cancel</Btn>
                <Btn variant="red" onClick={() => submit("not_approved")} disabled={submitting}>
                  {submitting ? "Saving…" : "Confirm"}
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section 3: Offers — single offer row ────────────────────────────────────

type OfferAction = "idle" | "confirming_received" | "confirming_rejected";

function OfferRow({
  offer,
  onUpdate,
}: {
  offer: ActiveOffer;
  onUpdate: (updated: ActiveOffer) => void;
}) {
  const [action, setAction] = useState<OfferAction>("idle");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(status: "accepted" | "rejected") {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { offer_status: status };
      if (status === "rejected" && notes) body.rejection_notes = notes;
      const res = await fetch(`/api/offers/${offer.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      onUpdate({ ...offer, offer_status: status === "accepted" ? "accepted" : "rejected" });
      setAction("idle");
      setNotes("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  const canAct = offer.offer_status === "offered";

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ border: "1px solid #e2e8f0" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {offer.outlet_name ?? "Outlet"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {offer.quantity_offered} unit{offer.quantity_offered !== 1 ? "s" : ""} · Offered {fmtDate(offer.created_at)}
          </p>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={
            offer.offer_status === "accepted"
              ? { background: "#dcfce7", color: "#16a34a" }
              : offer.offer_status === "rejected"
              ? { background: "#fee2e2", color: "#dc2626" }
              : { background: "#fef3c7", color: "#d97706" }
          }
        >
          {offer.offer_status === "accepted"
            ? "✓ Received"
            : offer.offer_status === "rejected"
            ? "✗ Rejected"
            : "• Offered"}
        </span>
      </div>

      {canAct && action === "idle" && (
        <div className="flex gap-2">
          <Btn variant="green" onClick={() => setAction("confirming_received")}>✓ Received</Btn>
          <Btn variant="red" onClick={() => { setNotes(""); setAction("confirming_rejected"); }}>✗ Rejected</Btn>
        </div>
      )}

      {canAct && action === "confirming_received" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">
            Confirm {offer.outlet_name ?? "outlet"} received {offer.quantity_offered} unit{offer.quantity_offered !== 1 ? "s" : ""}?
          </p>
          <div className="flex gap-2">
            <Btn variant="slate" onClick={() => setAction("idle")} disabled={submitting}>Cancel</Btn>
            <Btn variant="green" onClick={() => submit("accepted")} disabled={submitting}>
              {submitting ? "Saving…" : "Confirm"}
            </Btn>
          </div>
        </div>
      )}

      {canAct && action === "confirming_rejected" && (
        <div className="space-y-2">
          <textarea
            className="w-full text-xs rounded-lg px-3 py-2 resize-none outline-none"
            style={{ border: "1px solid #e2e8f0", minHeight: 56 }}
            placeholder="Rejection reason (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <Btn variant="slate" onClick={() => setAction("idle")} disabled={submitting}>Cancel</Btn>
            <Btn variant="red" onClick={() => submit("rejected")} disabled={submitting}>
              {submitting ? "Saving…" : "Confirm"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section 3: Offers — container ───────────────────────────────────────────

function OffersSection({
  item,
  isManager,
  onItemUpdate,
  onUpdated,
}: {
  item: FullItemDetail;
  isManager: boolean;
  onItemUpdate: (fn: (prev: FullItemDetail) => FullItemDetail) => void;
  onUpdated: () => void;
}) {
  const [showOfferForm, setShowOfferForm] = useState(false);

  function handleOfferUpdate(updated: ActiveOffer) {
    onItemUpdate((prev) => ({
      ...prev,
      qty: updated.offer_status === "accepted"
        ? Math.max(0, prev.qty - updated.quantity_offered)
        : prev.qty,
      active_offers: prev.active_offers.map((o) =>
        o.id === updated.id ? updated : o,
      ),
    }));
    onUpdated();
  }

  async function handleOfferSubmit(data: OfferFormData): Promise<void> {
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
    setShowOfferForm(false);
    // Refresh item to show new offer
    const detailRes = await fetch(`/api/expiry/${item.id}/full-detail`);
    const detailJson = await detailRes.json();
    if (detailJson.success) onItemUpdate(() => detailJson.data as FullItemDetail);
    onUpdated();
  }

  const totalOffered = item.active_offers
    .filter((o) => o.offer_status === "offered")
    .reduce((sum, o) => sum + o.quantity_offered, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionHeader>Outlet Offers</SectionHeader>
        {isManager && item.qty > 0 && item.item_status === "active" && (
          <button
            onClick={() => setShowOfferForm(true)}
            className="h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 -mt-3"
            style={{ background: "#eff6ff", color: "#2563eb" }}
          >
            <BuildingStorefrontIcon className="w-3.5 h-3.5" />
            + Offer
          </button>
        )}
      </div>

      {item.active_offers.length === 0 ? (
        <p className="text-sm text-slate-400 py-1">No offers for this item.</p>
      ) : (
        <div className="space-y-2">
          {item.active_offers.map((offer) => (
            <OfferRow key={offer.id} offer={offer} onUpdate={handleOfferUpdate} />
          ))}
        </div>
      )}

      {showOfferForm && (
        <OfferForm
          isOpen
          onClose={() => setShowOfferForm(false)}
          source={{
            expiry_log_id: item.id,
            stock_id: item.stock_id,
            barcode: item.barcode,
            description: item.description,
            category: item.category,
            uom: item.uom,
            expiry_date: item.expiry_date,
            quantity: item.qty,
            total_offered: totalOffered,
          }}
          onSubmit={handleOfferSubmit}
        />
      )}
    </div>
  );
}

// ─── Section 4: Sales ────────────────────────────────────────────────────────

function SalesSection({
  item,
  onItemUpdate,
  onUpdated,
}: {
  item: FullItemDetail;
  onItemUpdate: (fn: (prev: FullItemDetail) => FullItemDetail) => void;
  onUpdated: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [units, setUnits] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const maxQty = item.qty;
  const remaining = maxQty - units;
  const isValid = Number.isInteger(units) && units >= 1 && units <= maxQty;

  async function confirmSell() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/expiry/${item.id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units_sold: units }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      const newQty = json.fully_sold ? 0 : (json.remaining as number ?? 0);
      onItemUpdate((prev) => ({
        ...prev,
        qty: newQty,
        item_status: newQty === 0 ? "sold" : prev.item_status,
      }));
      setShowForm(false);
      onUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <SectionHeader>Sales</SectionHeader>

      {!showForm ? (
        <div className="rounded-xl p-3 flex items-center justify-between bg-slate-50">
          <p className="text-sm font-semibold text-slate-700">
            Available: {maxQty} unit{maxQty !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => { setUnits(1); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
            style={{ background: "#2563eb" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#1d4ed8"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#2563eb"; }}
          >
            <BanknotesIcon className="w-4 h-4" />
            Mark as Sold
          </button>
        </div>
      ) : (
        <div className="rounded-xl p-3 space-y-3" style={{ border: "1px solid #e2e8f0" }}>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Units Sold
            </label>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={units}
              onChange={(e) => setUnits(parseInt(e.target.value, 10) || 1)}
              className="w-full text-sm font-medium text-slate-800 rounded-lg px-3 py-2 outline-none"
              style={{
                border: isValid ? "1px solid #e2e8f0" : "1px solid #dc2626",
                background: isValid ? "white" : "#fff5f5",
              }}
              autoFocus
            />
            {units > maxQty && (
              <p className="text-[10px] text-[#dc2626] mt-1">Cannot exceed {maxQty}</p>
            )}
          </div>
          {isValid && (
            <div
              className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
              style={{ background: "#f8fafc" }}
            >
              <span className="text-slate-500">Remaining after sale:</span>
              <span
                className="font-bold"
                style={{ color: remaining === 0 ? "#16a34a" : "#334155" }}
              >
                {remaining} unit{remaining !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Btn variant="slate" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </Btn>
            <Btn variant="green" onClick={confirmSell} disabled={!isValid || submitting}>
              {submitting ? "Saving…" : "Confirm Sold"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entryId: number | null;
  onUpdated: () => void;
  onSwitchToSales?: () => void;
}

export default function ItemReviewModal({ isOpen, onClose, entryId, onUpdated, onSwitchToSales }: Props) {
  const [mounted, setMounted] = useState(false);
  const [item, setItem] = useState<FullItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewDone, setReviewDone] = useState<string | null>(null);

  const { user, isManager } = useAuth();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen || !entryId) return;
    setItem(null);
    setReviewDone(null);
    setIsLoading(true);
    fetch(`/api/expiry/${entryId}/full-detail`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setItem(data.data as FullItemDetail); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isOpen, entryId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleItemUpdate = useCallback(
    (fn: (prev: FullItemDetail) => FullItemDetail) => {
      setItem((prev) => (prev ? fn(prev) : prev));
    },
    [],
  );

  async function handleMarkReviewed() {
    if (!item) return;
    setIsReviewing(true);
    try {
      const res = await fetch(`/api/expiry/${item.id}/review`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to mark as reviewed");
      const myt = new Date().toLocaleString("en-MY", {
        timeZone: "Asia/Kuala_Lumpur",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setReviewDone(myt);
      setItem((prev) =>
        prev
          ? { ...prev, review_status: "pending", last_reviewed_at: new Date().toISOString(), last_reviewed_display: myt }
          : prev,
      );
      onUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to mark as reviewed");
    } finally {
      setIsReviewing(false);
    }
  }

  if (!mounted || !isOpen) return null;

  const u = item ? (URGENCY[item.urgency] ?? URGENCY.safe) : URGENCY.safe;
  const showReturn = !!item && item.return_status !== null;
  const showSales  = !!item && item.qty > 0 && item.item_status === "active";
  const canReview  = !isManager && !!item && item.item_status === "active" && !reviewDone;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div className="p-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Item Review
              </p>
              {item ? (
                <>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {item.description}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {item.category} ·{" "}
                    <span className="font-mono">{item.barcode}</span>
                    {item.stock_id && ` · ${item.stock_id}`}
                  </p>
                  <span
                    className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: u.bg, color: u.color }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ background: u.color }}
                    />
                    {u.label} · {item ? daysLabel(item.days_left) : ""}
                  </span>
                </>
              ) : isLoading ? (
                <div className="space-y-1.5 mt-1">
                  <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                </div>
              ) : null}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-slate-100"
            >
              <XMarkIcon className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <Skeleton />
          ) : item ? (
            <>
              <ItemInfoSection item={item} />

              {showReturn && (
                <>
                  <Divider />
                  <ReturnSection item={item} onItemUpdate={handleItemUpdate} />
                </>
              )}

              <Divider />
              <OffersSection
                item={item}
                isManager={isManager}
                onItemUpdate={handleItemUpdate}
                onUpdated={onUpdated}
              />

              {showSales && (
                <>
                  <Divider />
                  <SalesSection
                    item={item}
                    onItemUpdate={handleItemUpdate}
                    onUpdated={onUpdated}
                  />
                </>
              )}

              {item.qty === 0 && item.item_status !== "active" && (
                <>
                  <Divider />
                  <div
                    className="rounded-xl px-4 py-3 flex items-center gap-2"
                    style={{ background: "#dcfce7" }}
                  >
                    <CheckIcon className="w-4 h-4 text-[#16a34a] flex-shrink-0" />
                    <p className="text-xs font-semibold text-[#16a34a]">
                      All units accounted for
                    </p>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">
              Failed to load item details.
            </p>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="border-t border-slate-100 p-4 flex-shrink-0">
          {reviewDone ? (
            <div className="space-y-3">
              <div
                className="rounded-lg p-3 flex items-start gap-2"
                style={{ background: "#dcfce7" }}
              >
                <CheckIcon className="w-4 h-4 text-[#16a34a] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#16a34a]">Marked as Reviewed ✓</p>
                  {item && (
                    <p className="text-xs text-[#16a34a] opacity-75 mt-0.5">
                      {item.pic_name} — {reviewDone}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full h-10 rounded-xl text-sm font-medium transition-colors"
                style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-xl text-sm font-medium transition-colors"
                style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
              >
                {item && item.item_status !== "active" ? "Close" : "Cancel"}
              </button>
              {item && item.item_status !== "active" && onSwitchToSales && (
                <button
                  onClick={() => { onClose(); onSwitchToSales(); }}
                  className="flex-1 h-10 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: "#eff6ff", color: "#2563eb" }}
                >
                  View Sales Record →
                </button>
              )}
              {canReview && (
                <button
                  onClick={handleMarkReviewed}
                  disabled={isReviewing}
                  className="flex-1 h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-70"
                  style={{ background: "#22c55e" }}
                >
                  {isReviewing ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <CheckIcon className="w-4 h-4" />
                  )}
                  {isReviewing ? "Saving…" : "Mark Reviewed"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Re-export type for consumers that read from the hook
export type { Props as ItemReviewModalProps };
