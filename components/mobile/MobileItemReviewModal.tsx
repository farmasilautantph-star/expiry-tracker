"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/useAuth";
import OfferForm from "@/components/offers/OfferForm";
import type { OfferFormData } from "@/hooks/useOffers";
import type {
  ActiveOffer,
  FullItemDetail,
} from "@/components/shortlist/ItemReviewModal";

const URGENCY: Record<
  string,
  { bg: string; color: string; border: string; label: string }
> = {
  expired:  { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Expired"  },
  critical: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa", label: "Critical" },
  warning:  { bg: "#fffbeb", color: "#ca8a04", border: "#fde68a", label: "Warning"  },
  safe:     { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: "Safe"     },
};

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mi = parseInt(m, 10) - 1;
  return `${d} ${months[mi] ?? m} ${y}`;
}

function daysLabel(n: number): string {
  if (n < 0) return "Expired";
  if (n === 0) return "Today";
  if (n <= 30) return `${n}d left`;
  return `${Math.round(n / 30)}m left`;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entryId: number | null;
  onUpdated: () => void;
  onReviewed?: (ts: { last_reviewed_at: string; last_reviewed_display: string }) => void;
  onSwitchToSales?: () => void;
  onToast?: (msg: string) => void;
  onPatchEntry?: (id: number, patch: { remarks: string | null }) => void;
  onDeleted?: (id: number) => void;
}

type ActionPanel =
  | { type: "none" }
  | { type: "sell" }
  | { type: "transfer" }
  | { type: "return" }
  | { type: "offer" };

export default function MobileItemReviewModal({
  isOpen,
  onClose,
  entryId,
  onUpdated,
  onReviewed,
  onSwitchToSales,
  onToast,
  onPatchEntry,
  onDeleted,
}: Props) {
  const { isManager } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [item, setItem] = useState<FullItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [panel, setPanel] = useState<ActionPanel>({ type: "none" });

  // Sell form
  const [sellUnitsInput, setSellUnitsInput] = useState("1");
  // Transfer form
  const [transferOutlet, setTransferOutlet] = useState("");
  const [transferQtyInput, setTransferQtyInput] = useState("1");
  const [transferError, setTransferError] = useState<string | null>(null);
  // Return form
  const [returnAction, setReturnAction] = useState<"choose" | "confirm_returned" | "confirm_not_approved">("choose");
  const [returnNotes, setReturnNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Remarks
  const [remarksDraft, setRemarksDraft] = useState("");
  const [remarksMode, setRemarksMode] = useState<"view" | "editing">("view");
  const [remarksSaving, setRemarksSaving] = useState(false);

  // Delete
  const [deleteState, setDeleteState] = useState<"idle" | "confirming">("idle");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Offer form (creates new offer)
  const [showOfferForm, setShowOfferForm] = useState(false);

  const moreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen || !entryId) return;
    setItem(null);
    setPanel({ type: "none" });
    setMoreOpen(false);
    setDeleteState("idle");
    setDeleteReason("");
    setDeleteError(null);
    setRemarksMode("view");
    setIsLoading(true);
    fetch(`/api/expiry/${entryId}/full-detail`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setItem(data.data as FullItemDetail);
          setRemarksDraft(data.data.remarks ?? "");
        }
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

  useEffect(() => {
    if (!moreOpen) return;
    function handler(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  const updateItem = useCallback(
    (fn: (prev: FullItemDetail) => FullItemDetail) => {
      setItem((prev) => (prev ? fn(prev) : prev));
    },
    [],
  );

  // ── Mark Reviewed ──
  async function handleMarkReviewed() {
    if (!item) return;
    setIsReviewing(true);
    try {
      const res = await fetch(`/api/expiry/${item.id}/review`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      onReviewed?.({
        last_reviewed_at: json.last_reviewed_at,
        last_reviewed_display: json.last_reviewed_display,
      });
      onToast?.("Review saved successfully");
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to mark as reviewed");
    } finally {
      setIsReviewing(false);
    }
  }

  // ── Sell ──
  async function confirmSell() {
    if (!item) return;
    const units = parseInt(sellUnitsInput, 10);
    if (isNaN(units) || units < 1 || units > item.qty) return;
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
      updateItem((prev) => ({ ...prev, qty: newQty, item_status: newQty === 0 ? "sold" : prev.item_status }));
      setPanel({ type: "none" });
      onToast?.("Sale recorded & marked reviewed");
      onUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Transfer ──
  async function confirmTransfer() {
    if (!item) return;
    const name = transferOutlet.trim();
    const qty = parseInt(transferQtyInput, 10);
    if (!name) { setTransferError("Outlet name is required"); return; }
    if (isNaN(qty) || qty < 1) { setTransferError("Quantity must be at least 1"); return; }
    if (qty > item.qty) { setTransferError(`Cannot exceed available quantity (${item.qty})`); return; }
    setTransferError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/expiry/${item.id}/outlet-transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_name: name, qty_transferred: qty }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      const newQty: number = json.new_qty;
      updateItem((prev) => ({ ...prev, qty: newQty, item_status: newQty === 0 ? "completed" : prev.item_status }));
      setPanel({ type: "none" });
      setTransferOutlet("");
      setTransferQtyInput("1");
      onToast?.("Transfer recorded & marked reviewed");
      onUpdated();
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : "Failed to record transfer");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Return ──
  async function submitReturn(status: "returned" | "not_approved") {
    if (!item) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/returns/${item.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ return_status: status, return_notes: returnNotes || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      updateItem((prev) => ({ ...prev, return_status: status, return_notes: returnNotes || null }));
      setPanel({ type: "none" });
      setReturnNotes("");
      setReturnAction("choose");
      onToast?.(status === "returned" ? "Marked as returned & reviewed" : "Return not approved & marked reviewed");
      onUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update return status");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Remarks ──
  async function saveRemarks(value: string | null) {
    if (!item) return;
    setRemarksSaving(true);
    try {
      const res = await fetch(`/api/expiry/${item.id}/remarks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: value }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      updateItem((prev) => ({ ...prev, remarks: json.remarks }));
      onPatchEntry?.(item.id, { remarks: json.remarks });
      setRemarksMode("view");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save remarks");
    } finally {
      setRemarksSaving(false);
    }
  }

  // ── Delete ──
  async function handleDelete() {
    if (!item) return;
    const reason = deleteReason.trim();
    if (reason.length < 10) { setDeleteError("Reason must be at least 10 characters."); return; }
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/expiry/${item.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      onDeleted?.(item.id);
      onToast?.("Entry deleted");
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  // ── Offer (create new) ──
  async function handleOfferSubmit(data: OfferFormData): Promise<void> {
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
    setShowOfferForm(false);
    const detailRes = await fetch(`/api/expiry/${item!.id}/full-detail`);
    const detailJson = await detailRes.json();
    if (detailJson.success) setItem(detailJson.data as FullItemDetail);
    onUpdated();
  }

  if (!mounted || !isOpen) return null;

  const u = item ? (URGENCY[item.urgency] ?? URGENCY.safe) : URGENCY.safe;
  const isReturnable = !!item && item.return_status !== null && item.return_status !== "non-returnable";
  const canSell = !!item && item.qty > 0 && item.item_status === "active";
  const isActive = !!item && item.item_status === "active";
  const canReview = !isManager && isActive;
  const totalOffered = item
    ? item.active_offers.filter((o) => o.offer_status === "offered").reduce((s, o) => s + o.quantity_offered, 0)
    : 0;
  const canOffer = isManager && !!item && item.qty > 0 && isActive;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center animate-fade-in"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white flex flex-col animate-slide-up"
        style={{
          maxHeight: "88vh",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <span
            style={{
              width: 38,
              height: 4,
              borderRadius: 9999,
              background: "#cbd5e1",
              display: "block",
            }}
          />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "12px 16px 24px" }}>
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-12 bg-slate-100 rounded-xl" />
              <div className="h-6 w-3/4 bg-slate-100 rounded" />
              <div className="h-4 w-1/2 bg-slate-100 rounded" />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="h-20 bg-slate-100 rounded-xl" />
                <div className="h-20 bg-slate-100 rounded-xl" />
                <div className="h-20 bg-slate-100 rounded-xl" />
                <div className="h-20 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ) : !item ? (
            <p className="text-sm text-slate-400 text-center py-12">Failed to load item details.</p>
          ) : (
            <>
              {/* Status banner */}
              <div
                style={{
                  background: u.bg,
                  border: `1.5px solid ${u.border}`,
                  borderRadius: 14,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: u.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: u.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    {u.label}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: u.color, opacity: 0.85 }}>
                    · {daysLabel(item.days_left)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, position: "relative" }} ref={moreRef}>
                  <button
                    type="button"
                    aria-label="More actions"
                    onClick={() => setMoreOpen((o) => !o)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: u.color,
                      background: moreOpen ? "rgba(255,255,255,0.6)" : "transparent",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="5" cy="12" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: u.color,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M6 6l12 12M6 18L18 6" />
                    </svg>
                  </button>

                  {moreOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: 36,
                        right: 0,
                        minWidth: 200,
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        boxShadow: "0 8px 28px rgba(15,23,42,0.12)",
                        padding: 6,
                        zIndex: 10,
                      }}
                    >
                      {item.item_status !== "active" && onSwitchToSales && (
                        <MoreItem
                          icon={<IconDoc />}
                          label="View Sales Record"
                          onClick={() => { setMoreOpen(false); onClose(); onSwitchToSales(); }}
                        />
                      )}
                      {canOffer && (
                        <MoreItem
                          icon={<IconStore />}
                          label="+ Offer to Outlet"
                          onClick={() => { setMoreOpen(false); setShowOfferForm(true); }}
                        />
                      )}
                      {isManager && (
                        <MoreItem
                          icon={<IconTrash />}
                          label="Delete Entry"
                          variant="danger"
                          onClick={() => { setMoreOpen(false); setDeleteState("confirming"); }}
                        />
                      )}
                      {!canOffer && !isManager && item.item_status === "active" && (
                        <div style={{ padding: "8px 12px", fontSize: 12, color: "#94a3b8" }}>
                          No additional actions
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Title + sub */}
              <div style={{ marginBottom: 14 }}>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: "#0f172a",
                    lineHeight: 1.3,
                    letterSpacing: "-0.2px",
                  }}
                >
                  {item.description}
                </h2>
                <p style={{ fontSize: 12.5, color: "#64748b", marginTop: 5, fontWeight: 500 }}>
                  <span style={{ color: "#2563eb", fontWeight: 600 }}>{item.category}</span>
                  <span style={{ color: "#cbd5e1", margin: "0 6px" }}>·</span>
                  <span>PIC: <span style={{ color: "#1e3a5f", fontWeight: 700 }}>{item.pic_name}</span></span>
                </p>
              </div>

              {/* Info grid 2x2 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                <InfoCell
                  label="QUANTITY"
                  value={String(item.qty)}
                  unit={item.uom ?? ""}
                />
                <InfoCell
                  label="EXPIRY DATE"
                  value={fmtDate(item.expiry_date)}
                  valueFontSize={15}
                />
                <InfoCell
                  label="DAYS LEFT"
                  value={item.days_left < 0 ? "0" : String(item.days_left)}
                  unit={item.days_left < 0 ? "expired" : "days"}
                  tinted={u}
                />
                <InfoCell
                  label="LOGGED BY"
                  value={item.pic_name}
                  valueFontSize={14}
                  subtext={fmtDate(item.logged_at)}
                />
              </div>

              {/* Last reviewed (compact note) */}
              {item.last_reviewed_display && (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 12,
                    padding: "8px 12px",
                    fontSize: 11.5,
                    color: "#15803d",
                    fontWeight: 600,
                    marginBottom: 18,
                  }}
                >
                  ✓ Last reviewed: {item.last_reviewed_display}
                </div>
              )}

              {/* ACTIONS — only when no panel is open and item is active */}
              {panel.type === "none" && isActive && (
                <>
                  <SectionLabel>Actions</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                    {canReview && (
                      <ActionButton
                        variant="primary"
                        icon={<IconCheck />}
                        label={isReviewing ? "Saving…" : "Mark Reviewed"}
                        disabled={isReviewing}
                        onClick={handleMarkReviewed}
                      />
                    )}
                    {canSell && (
                      <ActionButton
                        variant="outline"
                        icon={<IconBag />}
                        label="Mark Sold"
                        onClick={() => { setSellUnitsInput("1"); setPanel({ type: "sell" }); }}
                      />
                    )}
                    {canSell && (
                      <ActionButton
                        variant="outline"
                        icon={<IconArrowRight />}
                        label="Outlet Transfer"
                        onClick={() => {
                          setTransferOutlet("");
                          setTransferQtyInput("1");
                          setTransferError(null);
                          setPanel({ type: "transfer" });
                        }}
                      />
                    )}
                    {isReturnable && item.return_status === "pending" && (
                      <ActionButton
                        variant="danger"
                        icon={<IconReturn />}
                        label="Return"
                        onClick={() => { setReturnAction("choose"); setReturnNotes(""); setPanel({ type: "return" }); }}
                      />
                    )}
                  </div>
                </>
              )}

              {/* SELL panel */}
              {panel.type === "sell" && item && (
                <ActionPanelCard
                  title="Mark Units Sold"
                  onCancel={() => setPanel({ type: "none" })}
                >
                  <NumberField
                    label="Units sold"
                    value={sellUnitsInput}
                    onChange={setSellUnitsInput}
                    max={item.qty}
                    autoFocus
                  />
                  <p style={{ fontSize: 11.5, color: "#64748b", margin: "6px 2px 12px" }}>
                    Available: <b>{item.qty}</b> unit{item.qty !== 1 ? "s" : ""}
                  </p>
                  <PanelButtons
                    onCancel={() => setPanel({ type: "none" })}
                    onConfirm={confirmSell}
                    confirmLabel="Confirm Sold"
                    disabled={(() => {
                      const v = parseInt(sellUnitsInput, 10);
                      return submitting || isNaN(v) || v < 1 || v > item.qty;
                    })()}
                    submitting={submitting}
                  />
                </ActionPanelCard>
              )}

              {/* TRANSFER panel */}
              {panel.type === "transfer" && item && (
                <ActionPanelCard
                  title="Outlet Transfer"
                  onCancel={() => setPanel({ type: "none" })}
                >
                  <FieldLabel>Outlet name</FieldLabel>
                  <input
                    type="text"
                    value={transferOutlet}
                    onChange={(e) => { setTransferOutlet(e.target.value); setTransferError(null); }}
                    placeholder="Enter outlet name…"
                    autoFocus
                    style={inputStyle}
                  />
                  <div style={{ marginTop: 10 }}>
                    <NumberField
                      label={`Qty to transfer (max ${item.qty})`}
                      value={transferQtyInput}
                      onChange={(v) => { setTransferQtyInput(v); setTransferError(null); }}
                      max={item.qty}
                    />
                  </div>
                  {transferError && (
                    <p style={{ fontSize: 11.5, color: "#dc2626", marginTop: 8 }}>{transferError}</p>
                  )}
                  <div style={{ height: 4 }} />
                  <PanelButtons
                    onCancel={() => { setPanel({ type: "none" }); setTransferError(null); }}
                    onConfirm={confirmTransfer}
                    confirmLabel="Confirm Transfer"
                    disabled={submitting || transferOutlet.trim().length === 0 || (() => {
                      const v = parseInt(transferQtyInput, 10);
                      return isNaN(v) || v < 1 || v > item.qty;
                    })()}
                    submitting={submitting}
                  />
                </ActionPanelCard>
              )}

              {/* RETURN panel */}
              {panel.type === "return" && (
                <ActionPanelCard
                  title="Update Return Status"
                  onCancel={() => { setPanel({ type: "none" }); setReturnAction("choose"); }}
                >
                  {returnAction === "choose" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <ActionButton
                        variant="success"
                        icon={<IconCheck />}
                        label="Mark Returned"
                        onClick={() => setReturnAction("confirm_returned")}
                      />
                      <ActionButton
                        variant="danger"
                        icon={<IconX />}
                        label="Not Approved"
                        onClick={() => setReturnAction("confirm_not_approved")}
                      />
                    </div>
                  )}
                  {returnAction === "confirm_returned" && (
                    <>
                      <p style={{ fontSize: 13, color: "#334155", fontWeight: 500, marginBottom: 12 }}>
                        Confirm return completed?
                      </p>
                      <PanelButtons
                        onCancel={() => setReturnAction("choose")}
                        onConfirm={() => submitReturn("returned")}
                        confirmLabel="Confirm"
                        disabled={submitting}
                        submitting={submitting}
                        confirmColor="#16a34a"
                      />
                    </>
                  )}
                  {returnAction === "confirm_not_approved" && (
                    <>
                      <FieldLabel>Reason (optional)</FieldLabel>
                      <textarea
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        rows={3}
                        placeholder="Reason for non-approval…"
                        style={{ ...inputStyle, minHeight: 70, resize: "none" }}
                      />
                      <div style={{ height: 10 }} />
                      <PanelButtons
                        onCancel={() => setReturnAction("choose")}
                        onConfirm={() => submitReturn("not_approved")}
                        confirmLabel="Confirm"
                        disabled={submitting}
                        submitting={submitting}
                        confirmColor="#dc2626"
                      />
                    </>
                  )}
                </ActionPanelCard>
              )}

              {/* Sold/Completed state CTA */}
              {!isActive && (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 14,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 18,
                  }}
                >
                  <span style={{ color: "#16a34a", display: "flex" }}><IconCheck /></span>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: "#16a34a" }}>
                    All units accounted for
                  </p>
                  {onSwitchToSales && (
                    <button
                      type="button"
                      onClick={() => { onClose(); onSwitchToSales(); }}
                      style={{
                        marginLeft: "auto",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#2563eb",
                      }}
                    >
                      View →
                    </button>
                  )}
                </div>
              )}

              {/* RETURN STATUS — shown when returnable and panel closed */}
              {panel.type === "none" && isReturnable && (
                <>
                  <SectionLabel>Return Status</SectionLabel>
                  <ReturnStatusBanner item={item} />
                  <div style={{ height: 18 }} />
                </>
              )}

              {/* REMARKS */}
              {panel.type === "none" && (
                <>
                  <SectionLabel>Remarks</SectionLabel>
                  {remarksMode === "view" ? (
                    <button
                      type="button"
                      onClick={() => { setRemarksDraft(item.remarks ?? ""); setRemarksMode("editing"); }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "12px 14px",
                        fontSize: 13.5,
                        color: item.remarks ? "#334155" : "#94a3b8",
                        fontStyle: item.remarks ? "normal" : "italic",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {item.remarks ?? "Add a remark or note..."}
                    </button>
                  ) : (
                    <>
                      <textarea
                        rows={3}
                        value={remarksDraft}
                        onChange={(e) => setRemarksDraft(e.target.value)}
                        autoFocus
                        placeholder="Write a remark…"
                        style={{
                          width: "100%",
                          background: "#fff",
                          border: "1.5px solid #2563eb",
                          borderRadius: 12,
                          padding: "10px 12px",
                          fontSize: 13.5,
                          color: "#0f172a",
                          outline: "none",
                          resize: "none",
                          fontFamily: "inherit",
                          lineHeight: 1.5,
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <SmallBtn variant="slate" onClick={() => setRemarksMode("view")} disabled={remarksSaving}>
                          Cancel
                        </SmallBtn>
                        <SmallBtn variant="primary" onClick={() => saveRemarks(remarksDraft.trim() || null)} disabled={remarksSaving}>
                          {remarksSaving ? "Saving…" : "Save"}
                        </SmallBtn>
                        {item.remarks && (
                          <SmallBtn variant="danger" onClick={() => saveRemarks(null)} disabled={remarksSaving}>
                            Delete
                          </SmallBtn>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* OFFERS (existing) */}
              {panel.type === "none" && item.active_offers.length > 0 && (
                <>
                  <div style={{ height: 18 }} />
                  <SectionLabel>Outlet Offers</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {item.active_offers.map((offer) => (
                      <OfferRow
                        key={offer.id}
                        offer={offer}
                        canAct={isManager && offer.offer_status === "offered"}
                        onUpdate={(updated) => {
                          updateItem((prev) => ({
                            ...prev,
                            qty: updated.offer_status === "accepted" ? Math.max(0, prev.qty - updated.quantity_offered) : prev.qty,
                            active_offers: prev.active_offers.map((o) => o.id === updated.id ? updated : o),
                          }));
                          onUpdated();
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* DELETE confirmation */}
              {deleteState === "confirming" && (
                <div
                  style={{
                    marginTop: 16,
                    background: "#fff5f5",
                    border: "1px solid #fecaca",
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", marginBottom: 10 }}>
                    Delete this entry permanently?
                  </p>
                  <FieldLabel>Reason (min. 10 characters)</FieldLabel>
                  <textarea
                    rows={2}
                    value={deleteReason}
                    onChange={(e) => { setDeleteReason(e.target.value); setDeleteError(null); }}
                    placeholder="Why are you deleting this?"
                    style={{ ...inputStyle, borderColor: deleteError ? "#dc2626" : "#e2e8f0", minHeight: 56, resize: "none" }}
                  />
                  {deleteError && <p style={{ fontSize: 11.5, color: "#dc2626", marginTop: 6 }}>{deleteError}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <SmallBtn variant="slate" onClick={() => { setDeleteState("idle"); setDeleteReason(""); setDeleteError(null); }} disabled={deleteSubmitting}>
                      Cancel
                    </SmallBtn>
                    <SmallBtn variant="danger" onClick={handleDelete} disabled={deleteSubmitting}>
                      {deleteSubmitting ? "Deleting…" : "Confirm Delete"}
                    </SmallBtn>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom footer — minimal */}
        {!isLoading && item && panel.type === "none" && (
          <div
            className="flex-shrink-0"
            style={{
              borderTop: "1px solid #f1f5f9",
              padding: "10px 16px 14px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                background: "#f1f5f9",
                color: "#475569",
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              Close
            </button>
          </div>
        )}

        {/* Offer form (nested modal) */}
        {showOfferForm && item && (
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
    </div>,
    document.body,
  );
}

// ── Sub-components ──

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 10.5,
        fontWeight: 800,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "1.1px",
        marginBottom: 9,
      }}
    >
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        marginBottom: 5,
      }}
    >
      {children}
    </p>
  );
}

function InfoCell({
  label,
  value,
  unit,
  subtext,
  valueFontSize = 22,
  tinted,
}: {
  label: string;
  value: string;
  unit?: string;
  subtext?: string;
  valueFontSize?: number;
  tinted?: { bg: string; color: string; border: string };
}) {
  return (
    <div
      style={{
        background: tinted ? tinted.bg : "#f8fafc",
        border: tinted ? `1px solid ${tinted.border}` : "1px solid #f1f5f9",
        borderRadius: 14,
        padding: "11px 14px",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: tinted ? tinted.color : "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.7px",
          marginBottom: 4,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: valueFontSize,
          fontWeight: 800,
          color: tinted ? tinted.color : "#0f172a",
          lineHeight: 1.1,
          letterSpacing: "-0.3px",
        }}
      >
        {value}
      </p>
      {unit && (
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: tinted ? tinted.color : "#94a3b8",
            marginTop: 2,
            textTransform: "uppercase",
            letterSpacing: "0.4px",
          }}
        >
          {unit}
        </p>
      )}
      {subtext && (
        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontWeight: 500 }}>
          {subtext}
        </p>
      )}
    </div>
  );
}

function ActionButton({
  variant,
  icon,
  label,
  onClick,
  disabled,
}: {
  variant: "primary" | "outline" | "danger" | "success";
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "#1e3a5f", color: "#fff", border: "1.5px solid #1e3a5f" },
    outline: { background: "#fff", color: "#0f172a", border: "1.5px solid #e2e8f0" },
    danger: { background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca" },
    success: { background: "#f0fdf4", color: "#16a34a", border: "1.5px solid #bbf7d0" },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        height: 48,
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function ActionPanelCard({
  title,
  onCancel,
  children,
}: {
  title: string;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: 14,
        marginBottom: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a" }}>{title}</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            background: "#fff",
            border: "1px solid #e2e8f0",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  );
}

function PanelButtons({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
  submitting,
  confirmColor = "#1e3a5f",
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  disabled?: boolean;
  submitting?: boolean;
  confirmColor?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        style={{
          flex: 1,
          height: 44,
          borderRadius: 12,
          background: "#fff",
          color: "#475569",
          fontSize: 13,
          fontWeight: 700,
          border: "1px solid #e2e8f0",
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        style={{
          flex: 1,
          height: 44,
          borderRadius: 12,
          background: confirmColor,
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {submitting ? "Saving…" : confirmLabel}
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  max,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const v = parseInt(value, 10);
          if (isNaN(v) || v < 1) onChange("1");
          else if (v > max) onChange(String(max));
        }}
        autoFocus={autoFocus}
        style={inputStyle}
      />
    </div>
  );
}

function ReturnStatusBanner({ item }: { item: FullItemDetail }) {
  if (item.return_status === "returned") {
    return (
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 12,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#16a34a" }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#15803d" }}>Returned to Warehouse</span>
        {item.return_by_date && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#15803d", opacity: 0.7 }}>
            {fmtDate(item.return_by_date)}
          </span>
        )}
      </div>
    );
  }
  if (item.return_status === "not_approved") {
    return (
      <div
        style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 12,
          padding: "10px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#dc2626" }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#b91c1c" }}>Return Not Approved</span>
        </div>
        {item.return_notes && (
          <p style={{ fontSize: 11.5, color: "#b91c1c", opacity: 0.85, marginTop: 4 }}>{item.return_notes}</p>
        )}
      </div>
    );
  }
  // pending
  return (
    <div
      style={{
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: 12,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#d97706" }} />
      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#b45309" }}>Pending</span>
      {item.return_by_date && (
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#b45309", opacity: 0.7 }}>
          Due: {fmtDate(item.return_by_date)}
        </span>
      )}
    </div>
  );
}

function SmallBtn({
  variant,
  onClick,
  disabled,
  children,
}: {
  variant: "primary" | "slate" | "danger";
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "#1e3a5f", color: "#fff" },
    slate:   { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" },
    danger:  { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        height: 36,
        padding: "0 14px",
        borderRadius: 10,
        fontSize: 12.5,
        fontWeight: 700,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function MoreItem({
  icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  const color = variant === "danger" ? "#dc2626" : "#334155";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 10px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        color,
        textAlign: "left",
        background: "transparent",
      }}
    >
      <span style={{ color, display: "flex", flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  );
}

function OfferRow({
  offer,
  canAct,
  onUpdate,
}: {
  offer: ActiveOffer;
  canAct: boolean;
  onUpdate: (updated: ActiveOffer) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  async function setStatus(status: "accepted" | "rejected") {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/offers/${offer.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_status: status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      onUpdate({ ...offer, offer_status: status });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }
  const statusStyle =
    offer.offer_status === "accepted"
      ? { bg: "#f0fdf4", color: "#16a34a", label: "Received" }
      : offer.offer_status === "rejected"
      ? { bg: "#fef2f2", color: "#dc2626", label: "Rejected" }
      : { bg: "#fffbeb", color: "#b45309", label: "Offered" };
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{offer.outlet_name ?? "Outlet"}</p>
          <p style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
            {offer.quantity_offered} unit{offer.quantity_offered !== 1 ? "s" : ""} · {fmtDate(offer.created_at)}
          </p>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 9999,
            background: statusStyle.bg,
            color: statusStyle.color,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {statusStyle.label}
        </span>
      </div>
      {canAct && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <SmallBtn variant="primary" onClick={() => setStatus("accepted")} disabled={submitting}>✓ Received</SmallBtn>
          <SmallBtn variant="danger" onClick={() => setStatus("rejected")} disabled={submitting}>✗ Rejected</SmallBtn>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "0 14px",
  fontSize: 14,
  color: "#0f172a",
  outline: "none",
  fontFamily: "inherit",
  WebkitAppearance: "none",
};

// ── Inline SVG icons (small set) ──

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  );
}
function IconBag() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconReturn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 14 4 9 9 4" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
  );
}
function IconStore() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
      <path d="M9 22v-6h6v6" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1.5 14a2 2 0 0 1-2 1.8H8.5A2 2 0 0 1 6.5 20L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
