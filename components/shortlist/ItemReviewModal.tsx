"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  BanknotesIcon,
  PencilIcon,
  TrashIcon,
  ArrowRightCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import { fileToCompressedDataUrl } from "@/lib/compressImage";
import OfferForm from "@/components/offers/OfferForm";
import type { OfferFormData } from "@/hooks/useOffers";
import type { ShortListEntry } from "@/hooks/useShortList";

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
  remarks: string | null;
  is_push_item: boolean;
  push_item_marked_at: string | null;
  push_item_marked_by: number | null;
  push_product_image: string | null;
  push_active_ingredient: string | null;
  push_selling_points: string | null;
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
      type="button"
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
  onPatchEntry,
  onToast,
}: {
  item: FullItemDetail;
  onItemUpdate: (fn: (prev: FullItemDetail) => FullItemDetail) => void;
  onPatchEntry?: (id: number, patch: Partial<ShortListEntry>) => void;
  onToast?: (msg: string) => void;
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
      onItemUpdate((prev) => ({ ...prev, return_status: status, return_notes: notes || null, item_status: "completed" }));
      onPatchEntry?.(item.id, { return_status: status, item_status: "completed" });
      setAction("idle");
      setNotes("");
      onToast?.(status === "returned" ? "Marked as returned & reviewed" : "Return not approved & marked reviewed");
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
  onPatchEntry,
  onClose,
  onToast,
}: {
  item: FullItemDetail;
  isManager: boolean;
  onItemUpdate: (fn: (prev: FullItemDetail) => FullItemDetail) => void;
  onPatchEntry?: (id: number, patch: Partial<ShortListEntry>) => void;
  onClose: () => void;
  onToast?: (msg: string) => void;
}) {
  const [showOfferForm, setShowOfferForm] = useState(false);

  function handleOfferUpdate(updated: ActiveOffer) {
    const wasOffered = item.active_offers.find((o) => o.id === updated.id)?.offer_status === "offered";
    const acceptedDelta = updated.offer_status === "accepted" ? updated.quantity_offered : 0;
    const offeredDelta = wasOffered ? updated.quantity_offered : 0;

    onItemUpdate((prev) => ({
      ...prev,
      qty: Math.max(0, prev.qty - acceptedDelta),
      active_offers: prev.active_offers.map((o) =>
        o.id === updated.id ? updated : o,
      ),
    }));

    const remainingOffered = item.active_offers
      .filter((o) => o.id !== updated.id && o.offer_status === "offered")
      .reduce((sum, o) => sum + o.quantity_offered, 0);

    onPatchEntry?.(item.id, {
      quantity: Math.max(0, item.qty - acceptedDelta),
      offered_qty: Math.max(0, remainingOffered),
      has_active_offer: remainingOffered > 0,
      ...(offeredDelta > 0 && remainingOffered === 0
        ? { offer_status: updated.offer_status as ShortListEntry["offer_status"] }
        : {}),
    });
  }

  async function handleOfferSubmit(data: OfferFormData): Promise<void> {
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");

    const newOfferId: number | null = json.data?.id ?? null;
    const currentOffered = item.active_offers
      .filter((o) => o.offer_status === "offered")
      .reduce((sum, o) => sum + o.quantity_offered, 0);
    const newOfferedQty = currentOffered + data.quantity;
    const newTotalOffered = item.active_offers.reduce((sum, o) => sum + o.quantity_offered, 0) + data.quantity;

    onPatchEntry?.(item.id, {
      offered_qty: newOfferedQty,
      total_offered: newTotalOffered,
      has_active_offer: true,
      offer_status: "offered",
      ...(newOfferId !== null ? { offer_id: newOfferId } : {}),
    });

    setShowOfferForm(false);
    onToast?.(`Item offered to ${data.outlet_name} successfully`);
    onClose();
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
            type="button"
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
  onPatchEntry,
  onClose,
  onToast,
}: {
  item: FullItemDetail;
  onItemUpdate: (fn: (prev: FullItemDetail) => FullItemDetail) => void;
  onPatchEntry?: (id: number, patch: Partial<ShortListEntry>) => void;
  onClose: () => void;
  onToast?: (msg: string) => void;
}) {
  const [showForm, setShowForm] = useState<"idle" | "sell" | "transfer">("idle");
  const [unitsInput, setUnitsInput] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  // Transfer form state
  const [outletName, setOutletName] = useState("");
  const [transferQtyInput, setTransferQtyInput] = useState("1");
  const [transferError, setTransferError] = useState<string | null>(null);

  const maxQty = item.qty;
  const units = parseInt(unitsInput, 10);
  const transferQty = parseInt(transferQtyInput, 10);
  const remaining = maxQty - (isNaN(units) ? 0 : units);
  const isValid = !isNaN(units) && units >= 1 && units <= maxQty;
  const transferValid = outletName.trim().length > 0 && !isNaN(transferQty) && transferQty >= 1 && transferQty <= maxQty;

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
      onPatchEntry?.(item.id, {
        quantity: newQty,
        ...(newQty === 0 ? { item_status: "sold" as const } : {}),
      });
      setShowForm("idle");
      onToast?.("Sale recorded & marked reviewed");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmTransfer() {
    const name = outletName.trim();
    if (!name) { setTransferError("Outlet name is required"); return; }
    if (!Number.isInteger(transferQty) || transferQty < 1) { setTransferError("Quantity must be at least 1"); return; }
    if (transferQty > maxQty) { setTransferError(`Cannot exceed available quantity (${maxQty})`); return; }
    setTransferError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/expiry/${item.id}/outlet-transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_name: name, qty_transferred: transferQty }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      const newQty: number = json.new_qty;
      onItemUpdate((prev) => ({
        ...prev,
        qty: newQty,
        item_status: newQty === 0 ? "completed" : prev.item_status,
      }));
      onPatchEntry?.(item.id, {
        quantity: newQty,
        ...(newQty === 0 ? { item_status: "completed" as const } : {}),
      });
      setShowForm("idle");
      setOutletName("");
      setTransferQtyInput("1");
      onToast?.(`Transferred to ${name} successfully`);
      onClose();
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : "Failed to record transfer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <SectionHeader>Sales</SectionHeader>

      {showForm === "idle" && (
        <div className="rounded-xl p-3 space-y-2 bg-slate-50">
          <p className="text-sm font-semibold text-slate-700">
            Available: {maxQty} unit{maxQty !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => { setUnitsInput("1"); setShowForm("sell"); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
              style={{ background: "#2563eb" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#1d4ed8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#2563eb"; }}
            >
              <BanknotesIcon className="w-4 h-4" />
              Mark as Sold
            </button>
            <button
              type="button"
              onClick={() => { setTransferQtyInput("1"); setOutletName(""); setTransferError(null); setShowForm("transfer"); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ border: "1px solid #2563eb", color: "#2563eb", background: "white" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#eff6ff"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "white"; }}
            >
              <ArrowRightCircleIcon className="w-4 h-4" />
              Outlet Transfer
            </button>
          </div>
        </div>
      )}

      {showForm === "sell" && (
        <div className="rounded-xl p-3 space-y-3" style={{ border: "1px solid #e2e8f0" }}>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Units Sold
            </label>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={unitsInput}
              onChange={(e) => setUnitsInput(e.target.value)}
              onBlur={() => {
                const val = parseInt(unitsInput, 10);
                if (isNaN(val) || val < 1) setUnitsInput("1");
                else if (val > maxQty) setUnitsInput(String(maxQty));
              }}
              className="w-full text-sm font-medium text-slate-800 rounded-lg px-3 py-2 outline-none"
              style={{
                border: isValid ? "1px solid #e2e8f0" : "1px solid #dc2626",
                background: isValid ? "white" : "#fff5f5",
              }}
              autoFocus
            />
            {!isNaN(units) && units > maxQty && (
              <p className="text-[10px] text-[#dc2626] mt-1">Cannot exceed {maxQty}</p>
            )}
          </div>
          {isValid && (
            <div
              className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
              style={{ background: "#f8fafc" }}
            >
              <span className="text-slate-500">Remaining after sale:</span>
              <span className="font-bold" style={{ color: remaining === 0 ? "#16a34a" : "#334155" }}>
                {remaining} unit{remaining !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Btn variant="slate" onClick={() => setShowForm("idle")} disabled={submitting}>
              Cancel
            </Btn>
            <Btn variant="green" onClick={confirmSell} disabled={!isValid || submitting}>
              {submitting ? "Saving…" : "Confirm Sold"}
            </Btn>
          </div>
        </div>
      )}

      {showForm === "transfer" && (
        <div className="rounded-xl p-3 space-y-3" style={{ border: "1px solid #bfdbfe", background: "#f8faff" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Outlet Transfer</p>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Outlet Name *
            </label>
            <input
              type="text"
              value={outletName}
              onChange={(e) => { setOutletName(e.target.value); setTransferError(null); }}
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
              onChange={(e) => { setTransferQtyInput(e.target.value); setTransferError(null); }}
              onBlur={() => {
                const val = parseInt(transferQtyInput, 10);
                if (isNaN(val) || val < 1) setTransferQtyInput("1");
                else if (val > maxQty) setTransferQtyInput(String(maxQty));
              }}
              className="w-full text-sm font-medium text-slate-800 rounded-lg px-3 py-2 outline-none"
              style={{ border: "1px solid #e2e8f0", background: "white" }}
            />
          </div>
          {transferError && <p className="text-[10px] text-red-500">{transferError}</p>}
          <div className="flex gap-2">
            <Btn variant="slate" onClick={() => { setShowForm("idle"); setTransferError(null); }} disabled={submitting}>
              Cancel
            </Btn>
            <Btn variant="blue" onClick={confirmTransfer} disabled={!transferValid || submitting}>
              {submitting ? "Saving…" : "Confirm Transfer"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section 5: Remarks ───────────────────────────────────────────────────────

type RemarksMode = "view" | "editing" | "confirming_delete";

function RemarksSection({
  item,
  onItemUpdate,
  onPatchEntry,
}: {
  item: FullItemDetail;
  onItemUpdate: (fn: (prev: FullItemDetail) => FullItemDetail) => void;
  onPatchEntry?: (id: number, patch: Partial<ShortListEntry>) => void;
}) {
  const [mode, setMode] = useState<RemarksMode>("view");
  const [draft, setDraft] = useState(item.remarks ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(value: string | null) {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/expiry/${item.id}/remarks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: value }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      onItemUpdate((prev) => ({ ...prev, remarks: json.remarks }));
      onPatchEntry?.(item.id, { remarks: json.remarks });
      setMode("view");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader>Remarks</SectionHeader>

      {mode === "view" && !item.remarks && (
        <button
          type="button"
          onClick={() => { setDraft(""); setMode("editing"); setErr(null); }}
          className="w-full text-left text-sm text-slate-400 italic py-2 px-3 rounded-xl transition-colors hover:bg-slate-50"
          style={{ border: "1px dashed #e2e8f0" }}
        >
          Add a remark…
        </button>
      )}

      {mode === "view" && item.remarks && (
        <div className="flex items-start gap-2">
          <p className="flex-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {item.remarks}
          </p>
          <div className="flex gap-1 flex-shrink-0 mt-0.5">
            <button
              type="button"
              title="Edit"
              onClick={() => { setDraft(item.remarks ?? ""); setMode("editing"); setErr(null); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => setMode("confirming_delete")}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {mode === "editing" && (
        <div className="space-y-2">
          <textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a remark…"
            autoFocus
            className="w-full text-sm text-slate-800 rounded-xl px-3 py-2 resize-none outline-none leading-relaxed"
            style={{ border: "1px solid #2563eb", boxShadow: "0 0 0 2px rgba(37,99,235,0.1)" }}
          />
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2">
            <Btn variant="slate" onClick={() => { setMode("view"); setErr(null); }} disabled={saving}>
              Cancel
            </Btn>
            <Btn variant="blue" onClick={() => save(draft.trim() || null)} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Btn>
          </div>
        </div>
      )}

      {mode === "confirming_delete" && (
        <div className="rounded-xl p-3 space-y-2" style={{ border: "1px solid #fee2e2", background: "#fff5f5" }}>
          <p className="text-xs font-medium text-red-600">Delete this remark?</p>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2">
            <Btn variant="slate" onClick={() => { setMode("view"); setErr(null); }} disabled={saving}>
              Cancel
            </Btn>
            <Btn variant="red" onClick={() => save(null)} disabled={saving}>
              {saving ? "Deleting…" : "Delete"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section: Push Item (manager only) ───────────────────────────────────────

function PushItemSection({
  item,
  onItemUpdate,
  onPatchEntry,
  onToast,
}: {
  item: FullItemDetail;
  onItemUpdate: (fn: (prev: FullItemDetail) => FullItemDetail) => void;
  onPatchEntry?: (id: number, patch: Partial<ShortListEntry>) => void;
  onToast?: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [activeIngredient, setActiveIngredient] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function openForm() {
    setImageDataUrl(null);
    setActiveIngredient("");
    setSellingPoints("");
    setFormError(null);
    setFormOpen(true);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFormError(null);
    try {
      setImageDataUrl(await fileToCompressedDataUrl(file));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not read image");
    }
  }

  async function submit(mark: boolean) {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/expiry/${item.id}/push-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mark
            ? {
                mark: true,
                productImage: imageDataUrl,
                activeIngredient: activeIngredient.trim() || null,
                sellingPoints: sellingPoints.trim() || null,
              }
            : { mark: false },
        ),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      const data = json.data ?? {};
      onItemUpdate((prev) => ({
        ...prev,
        is_push_item: mark,
        push_item_marked_at: data.push_item_marked_at ?? null,
        push_item_marked_by: data.push_item_marked_by ?? null,
      }));
      onPatchEntry?.(item.id, {
        is_push_item: mark,
        push_item_marked_at: data.push_item_marked_at ?? null,
        push_item_marked_by: data.push_item_marked_by ?? null,
      });
      setFormOpen(false);
      onToast?.(mark ? "Marked as Push Item" : "Unmarked as Push Item");
    } catch (err) {
      if (mark) {
        setFormError(err instanceof Error ? err.message : "Failed");
      } else {
        alert(err instanceof Error ? err.message : "Failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <SectionHeader>Push Item</SectionHeader>

      {!formOpen ? (
        <div
          className="rounded-xl p-3 flex items-center justify-between gap-3"
          style={{
            background: item.is_push_item ? "#faf5ff" : "#f8fafc",
            border: item.is_push_item ? "1px solid #ddd6fe" : "1px solid #e2e8f0",
          }}
        >
          <div className="min-w-0">
            <p
              className="text-xs font-semibold"
              style={{ color: item.is_push_item ? "#7c3aed" : "#475569" }}
            >
              {item.is_push_item ? "Flagged for sales priority" : "Not flagged"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {item.is_push_item
                ? "PIC has been notified to prioritize sales."
                : "Mark this item to alert the PIC and surface it in the Push Item page."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => (item.is_push_item ? submit(false) : openForm())}
            disabled={submitting}
            className="h-9 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 flex-shrink-0"
            style={
              item.is_push_item
                ? { background: "#ede9fe", color: "#7c3aed", border: "1px solid #ddd6fe" }
                : { background: "#7c3aed", color: "#ffffff" }
            }
          >
            {submitting ? "Saving…" : item.is_push_item ? "Unmark" : "Mark as Push Item"}
          </button>
        </div>
      ) : (
        <div
          className="rounded-xl p-3 space-y-3"
          style={{ background: "#faf5ff", border: "1px solid #ddd6fe" }}
        >
          <p className="text-xs font-bold" style={{ color: "#7c3aed" }}>
            Push Item Details
          </p>

          {/* Product image (optional) */}
          <div>
            <p className="text-[11px] font-semibold text-slate-600 mb-1.5">
              Product Image <span className="font-normal text-slate-400">(optional)</span>
            </p>
            {imageDataUrl ? (
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageDataUrl}
                  alt="Product preview"
                  className="w-24 h-24 object-cover rounded-lg border border-[#ddd6fe] bg-white"
                />
                <button
                  type="button"
                  onClick={() => setImageDataUrl(null)}
                  className="text-[11px] font-semibold text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                className="flex items-center justify-center h-16 rounded-lg cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-[#7c3aed] transition-colors bg-white"
                style={{ border: "1.5px dashed #ddd6fe" }}
              >
                + Upload photo (JPG/PNG)
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Active ingredient (optional) */}
          <div>
            <p className="text-[11px] font-semibold text-slate-600 mb-1.5">
              Active Ingredient <span className="font-normal text-slate-400">(optional)</span>
            </p>
            <input
              type="text"
              value={activeIngredient}
              onChange={(e) => setActiveIngredient(e.target.value)}
              placeholder="e.g. Montelukast 4mg"
              className="w-full h-9 px-3 rounded-lg text-xs text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30"
              style={{ border: "1px solid #ddd6fe" }}
            />
          </div>

          {/* Selling points (optional) */}
          <div>
            <p className="text-[11px] font-semibold text-slate-600 mb-1.5">
              Selling Points / Focus Points{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </p>
            <textarea
              value={sellingPoints}
              onChange={(e) => setSellingPoints(e.target.value)}
              rows={3}
              placeholder="e.g. Fast-acting, suitable for children, popular with regular customers"
              className="w-full px-3 py-2 rounded-lg text-xs text-slate-800 bg-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30"
              style={{ border: "1px solid #ddd6fe" }}
            />
          </div>

          {formError && <p className="text-xs text-red-500">{formError}</p>}

          <div className="flex gap-2">
            <Btn variant="slate" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </Btn>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={submitting}
              className="h-8 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
              style={{ background: "#7c3aed", color: "#ffffff" }}
            >
              {submitting ? "Saving…" : "Confirm & Mark as Push Item"}
            </button>
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
  onReviewed?: (ts: { last_reviewed_at: string; last_reviewed_display: string }) => void;
  onSwitchToSales?: () => void;
  onToast?: (msg: string) => void;
  onPatchEntry?: (id: number, patch: Partial<ShortListEntry>) => void;
  onDeleted?: (id: number) => void;
}

export default function ItemReviewModal({ isOpen, onClose, entryId, onReviewed, onSwitchToSales, onToast, onPatchEntry, onDeleted }: Props) {
  const [mounted, setMounted] = useState(false);
  const [item, setItem] = useState<FullItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewDone, setReviewDone] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<"idle" | "confirming">("idle");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { isManager } = useAuth();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen || !entryId) return;
    setItem(null);
    setReviewDone(null);
    setDeleteState("idle");
    setDeleteReason("");
    setDeleteError(null);
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
      const last_reviewed_at: string = json.last_reviewed_at;
      const last_reviewed_display: string = json.last_reviewed_display;
      setReviewDone(last_reviewed_display);
      setItem((prev) =>
        prev
          ? { ...prev, review_status: "pending", last_reviewed_at, last_reviewed_display }
          : prev,
      );
      onReviewed?.({ last_reviewed_at, last_reviewed_display });
      onToast?.("Review saved successfully");
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to mark as reviewed");
    } finally {
      setIsReviewing(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    const reason = deleteReason.trim();
    if (reason.length < 10) {
      setDeleteError("Reason must be at least 10 characters.");
      return;
    }
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/expiry/${item.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to delete");
      onDeleted?.(item.id);
      onToast?.("Entry deleted");
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  if (!mounted || !isOpen) return null;

  const u = item ? (URGENCY[item.urgency] ?? URGENCY.safe) : URGENCY.safe;
  const showReturn = !!item && item.return_status !== null && item.return_status !== "non-returnable";
  const showSales  = !!item && item.qty > 0 && item.item_status === "active";
  const canReview  = !isManager && !!item && item.item_status === "active" && !reviewDone;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center md:items-center p-0 md:p-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="bg-white shadow-xl w-full md:max-w-lg flex flex-col rounded-t-2xl rounded-b-none md:rounded-2xl max-h-[92vh] md:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Mobile drag handle ──────────────────────────── */}
        <div className="md:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* ── Header ──────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-4 md:p-5 border-b border-slate-100 flex-shrink-0">
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
            <div className="flex items-center gap-1 flex-shrink-0">
              {item && deleteState === "idle" && (
                <button
                  type="button"
                  onClick={() => setDeleteState("confirming")}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-red-50"
                  title="Delete entry"
                >
                  <TrashIcon className="w-4 h-4 text-red-400" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-slate-100"
              >
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:p-5">
          {isLoading ? (
            <Skeleton />
          ) : item ? (
            <>
              <ItemInfoSection item={item} />

              {showReturn && (
                <>
                  <Divider />
                  <ReturnSection
                    item={item}
                    onItemUpdate={handleItemUpdate}
                    onPatchEntry={onPatchEntry}
                    onToast={onToast}
                  />
                </>
              )}

              <Divider />
              <OffersSection
                item={item}
                isManager={isManager}
                onItemUpdate={handleItemUpdate}
                onPatchEntry={onPatchEntry}
                onClose={onClose}
                onToast={onToast}
              />

              <Divider />
              <RemarksSection
                item={item}
                onItemUpdate={handleItemUpdate}
                onPatchEntry={onPatchEntry}
              />

              {isManager && item.item_status === "active" && item.qty > 0 && (
                <>
                  <Divider />
                  <PushItemSection
                    item={item}
                    onItemUpdate={handleItemUpdate}
                    onPatchEntry={onPatchEntry}
                    onToast={onToast}
                  />
                </>
              )}

              {showSales && (
                <>
                  <Divider />
                  <SalesSection
                    item={item}
                    onItemUpdate={handleItemUpdate}
                    onPatchEntry={onPatchEntry}
                    onClose={onClose}
                    onToast={onToast}
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
        <div className="border-t border-slate-100 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] md:pb-4 flex-shrink-0">
          {/* Delete confirmation section */}
          {deleteState === "confirming" && (
            <div className="mb-3 rounded-xl p-3 space-y-2" style={{ border: "1px solid #fecaca", background: "#fff5f5" }}>
              <p className="text-xs font-semibold text-red-600">This will permanently delete this entry.</p>
              <textarea
                rows={2}
                value={deleteReason}
                onChange={(e) => { setDeleteReason(e.target.value); setDeleteError(null); }}
                placeholder="Reason for deletion * (min. 10 characters)"
                className="w-full text-xs text-slate-800 rounded-lg px-3 py-2 resize-none outline-none leading-relaxed"
                style={{ border: deleteError ? "1px solid #dc2626" : "1px solid #e2e8f0" }}
                autoFocus
              />
              {deleteError && <p className="text-[10px] text-red-500">{deleteError}</p>}
              <div className="flex gap-2">
                <Btn variant="slate" onClick={() => { setDeleteState("idle"); setDeleteReason(""); setDeleteError(null); }} disabled={deleteSubmitting}>
                  Cancel
                </Btn>
                <Btn variant="red" onClick={handleDelete} disabled={deleteSubmitting}>
                  {deleteSubmitting ? "Deleting…" : "Confirm Delete"}
                </Btn>
              </div>
            </div>
          )}

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
                type="button"
                onClick={onClose}
                className="w-full h-10 rounded-xl text-sm font-medium transition-colors"
                style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex gap-3 flex-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl text-sm font-medium transition-colors"
                  style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
                >
                  {item && item.item_status !== "active" ? "Close" : "Cancel"}
                </button>
                {item && item.item_status !== "active" && onSwitchToSales && (
                  <button
                    type="button"
                    onClick={() => { onClose(); onSwitchToSales(); }}
                    className="flex-1 h-10 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: "#eff6ff", color: "#2563eb" }}
                  >
                    View Sales Record →
                  </button>
                )}
                {canReview && (
                  <button
                    type="button"
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
