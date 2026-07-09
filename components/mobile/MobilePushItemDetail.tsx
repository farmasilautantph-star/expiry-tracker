"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FullItemDetail } from "@/components/shortlist/ItemReviewModal";
import type { ShortListEntry } from "@/hooks/useShortList";

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

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 12,
  border: "1.5px solid #e2e8f0",
  padding: "0 14px",
  fontSize: 14,
  fontFamily: "inherit",
  color: "#0f172a",
  outline: "none",
  background: "#fff",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entryId: number | null;
  isManager: boolean;
  onPatchEntry?: (id: number, patch: Partial<ShortListEntry>) => void;
  onRemoveEntry?: (id: number) => void;
  onToast?: (msg: string) => void;
}

export default function MobilePushItemDetail({
  isOpen,
  onClose,
  entryId,
  isManager,
  onPatchEntry,
  onRemoveEntry,
  onToast,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [item, setItem] = useState<FullItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<"idle" | "sell" | "transfer">("idle");
  const [unitsInput, setUnitsInput] = useState("1");
  const [outletName, setOutletName] = useState("");
  const [transferQtyInput, setTransferQtyInput] = useState("1");
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unmarking, setUnmarking] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen || !entryId) return;
    setItem(null);
    setForm("idle");
    setActionError(null);
    setIsLoading(true);
    fetch(`/api/expiry/${entryId}/full-detail`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setItem(data.data as FullItemDetail);
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

  if (!mounted || !isOpen) return null;

  const u = item ? (URGENCY[item.urgency] ?? URGENCY.safe) : URGENCY.safe;
  const maxQty = item?.qty ?? 0;
  const units = parseInt(unitsInput, 10);
  const transferQty = parseInt(transferQtyInput, 10);
  const sellValid = !isNaN(units) && units >= 1 && units <= maxQty;
  const transferValid =
    outletName.trim().length > 0 && !isNaN(transferQty) && transferQty >= 1 && transferQty <= maxQty;
  const canAct = !!item && item.item_status === "active" && item.qty > 0;

  async function confirmSell() {
    if (!item) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/expiry/${item.id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units_sold: units }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      const newQty = json.fully_sold ? 0 : (json.remaining as number ?? 0);
      if (newQty === 0) {
        onRemoveEntry?.(item.id);
        onToast?.("Sale recorded — all units sold");
        onClose();
      } else {
        setItem((prev) => (prev ? { ...prev, qty: newQty } : prev));
        onPatchEntry?.(item.id, { quantity: newQty });
        setForm("idle");
        onToast?.("Sale recorded & marked reviewed");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmTransfer() {
    if (!item) return;
    const name = outletName.trim();
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/expiry/${item.id}/outlet-transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_name: name, qty_transferred: transferQty }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      const newQty: number = json.new_qty;
      if (newQty === 0) {
        onRemoveEntry?.(item.id);
      } else {
        onPatchEntry?.(item.id, { quantity: newQty });
      }
      onToast?.(`Transferred to ${name} successfully`);
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to record transfer");
    } finally {
      setSubmitting(false);
    }
  }

  async function unmarkPushItem() {
    if (!item) return;
    setUnmarking(true);
    try {
      const res = await fetch(`/api/expiry/${item.id}/push-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark: false }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      onPatchEntry?.(item.id, {
        is_push_item: false,
        push_item_marked_at: null,
        push_item_marked_by: null,
      });
      onToast?.("Unmarked as Push Item");
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setUnmarking(false);
    }
  }

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
          maxHeight: "90vh",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <span style={{ width: 38, height: 4, borderRadius: 9999, background: "#cbd5e1", display: "block" }} />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "10px 16px 24px" }}>
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="h-44 bg-slate-100 rounded-2xl" />
              <div className="h-6 w-3/4 bg-slate-100 rounded" />
              <div className="h-4 w-1/2 bg-slate-100 rounded" />
            </div>
          ) : !item ? (
            <p className="text-sm text-slate-400 text-center py-12">Failed to load item details.</p>
          ) : (
            <>
              {/* Status banner — same style as review popup */}
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
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: u.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: u.color, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    {u.label}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: u.color, opacity: 0.85 }}>
                    · {daysLabel(item.days_left)}
                  </span>
                </div>
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
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </button>
              </div>

              {/* Product image — visual hero */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #f1f5f9",
                  borderRadius: 18,
                  height: 180,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginBottom: 14,
                }}
              >
                {item.push_product_image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.push_product_image}
                    alt={item.description}
                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#cbd5e1" }}>
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>No product photo</span>
                  </div>
                )}
              </div>

              {/* Description + info row */}
              <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>
                {item.description}
              </p>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                {item.category} · {item.pic_name} ·{" "}
                <span style={{ fontFamily: "monospace" }}>{item.barcode}</span>
              </p>

              {/* Active ingredient — hidden when empty */}
              {item.push_active_ingredient && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>
                    Active Ingredient
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                    {item.push_active_ingredient}
                  </p>
                </div>
              )}

              {/* Selling points — hidden when empty */}
              {item.push_selling_points && (
                <div
                  style={{
                    marginTop: 16,
                    background: "#faf5ff",
                    border: "1px solid #ede9fe",
                    borderRadius: 14,
                    padding: "12px 14px",
                  }}
                >
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
                    Why Push This
                  </p>
                  <p style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {item.push_selling_points}
                  </p>
                </div>
              )}

              {/* Quick facts row — compact, supporting info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
                {[
                  { label: "Quantity", value: `${item.qty}${item.uom ? ` ${item.uom}` : ""}` },
                  { label: "Expiry", value: fmtDate(item.expiry_date) },
                  { label: "Days Left", value: daysLabel(item.days_left) },
                ].map((f) => (
                  <div
                    key={f.label}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #f1f5f9",
                      borderRadius: 12,
                      padding: "8px 6px",
                      textAlign: "center",
                    }}
                  >
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {f.label}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 800, color: "#334155", marginTop: 2 }}>
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* ── Actions ── */}
              <div style={{ marginTop: 18 }}>
                {form === "idle" && (
                  <>
                    {canAct && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => { setUnitsInput("1"); setActionError(null); setForm("sell"); }}
                          style={{
                            height: 46,
                            borderRadius: 12,
                            fontSize: 13.5,
                            fontWeight: 700,
                            background: "#1d4ed8",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 7,
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="6" width="20" height="12" rx="2" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                          Mark Sold
                        </button>
                        <button
                          type="button"
                          onClick={() => { setOutletName(""); setTransferQtyInput("1"); setActionError(null); setForm("transfer"); }}
                          style={{
                            height: 46,
                            borderRadius: 12,
                            fontSize: 13.5,
                            fontWeight: 700,
                            background: "#fff",
                            color: "#1d4ed8",
                            border: "1.5px solid #1d4ed8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 7,
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                          Outlet Transfer
                        </button>
                      </div>
                    )}
                    {isManager && item.is_push_item && (
                      <button
                        type="button"
                        onClick={unmarkPushItem}
                        disabled={unmarking}
                        style={{
                          width: "100%",
                          height: 44,
                          borderRadius: 12,
                          fontSize: 13.5,
                          fontWeight: 700,
                          marginTop: 10,
                          background: "#ede9fe",
                          color: "#7c3aed",
                          border: "1.5px solid #ddd6fe",
                          opacity: unmarking ? 0.6 : 1,
                        }}
                      >
                        {unmarking ? "Saving…" : "Unmark as Push Item"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 12,
                        fontSize: 13.5,
                        fontWeight: 700,
                        marginTop: 10,
                        background: "#f1f5f9",
                        color: "#64748b",
                      }}
                    >
                      Close
                    </button>
                  </>
                )}

                {form === "sell" && (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1.5px solid #eef1f6",
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
                      Mark Units Sold
                    </p>
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5 }}>
                      Units sold (max {maxQty})
                    </p>
                    <input
                      type="number"
                      min={1}
                      max={maxQty}
                      value={unitsInput}
                      onChange={(e) => { setUnitsInput(e.target.value); setActionError(null); }}
                      autoFocus
                      style={inputStyle}
                    />
                    {actionError && (
                      <p style={{ fontSize: 11.5, color: "#dc2626", marginTop: 8 }}>{actionError}</p>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => { setForm("idle"); setActionError(null); }}
                        disabled={submitting}
                        style={{ height: 44, borderRadius: 12, fontSize: 13.5, fontWeight: 700, background: "#fff", color: "#64748b", border: "1.5px solid #e2e8f0" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmSell}
                        disabled={!sellValid || submitting}
                        style={{
                          height: 44,
                          borderRadius: 12,
                          fontSize: 13.5,
                          fontWeight: 700,
                          background: "#16a34a",
                          color: "#fff",
                          opacity: !sellValid || submitting ? 0.5 : 1,
                        }}
                      >
                        {submitting ? "Saving…" : "Confirm Sold"}
                      </button>
                    </div>
                  </div>
                )}

                {form === "transfer" && (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1.5px solid #eef1f6",
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
                      Outlet Transfer
                    </p>
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5 }}>
                      Outlet name
                    </p>
                    <input
                      type="text"
                      value={outletName}
                      onChange={(e) => { setOutletName(e.target.value); setActionError(null); }}
                      placeholder="Enter outlet name…"
                      autoFocus
                      style={inputStyle}
                    />
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", margin: "10px 0 5px" }}>
                      Qty to transfer (max {maxQty})
                    </p>
                    <input
                      type="number"
                      min={1}
                      max={maxQty}
                      value={transferQtyInput}
                      onChange={(e) => { setTransferQtyInput(e.target.value); setActionError(null); }}
                      style={inputStyle}
                    />
                    {actionError && (
                      <p style={{ fontSize: 11.5, color: "#dc2626", marginTop: 8 }}>{actionError}</p>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => { setForm("idle"); setActionError(null); }}
                        disabled={submitting}
                        style={{ height: 44, borderRadius: 12, fontSize: 13.5, fontWeight: 700, background: "#fff", color: "#64748b", border: "1.5px solid #e2e8f0" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmTransfer}
                        disabled={!transferValid || submitting}
                        style={{
                          height: 44,
                          borderRadius: 12,
                          fontSize: 13.5,
                          fontWeight: 700,
                          background: "#1d4ed8",
                          color: "#fff",
                          opacity: !transferValid || submitting ? 0.5 : 1,
                        }}
                      >
                        {submitting ? "Saving…" : "Confirm Transfer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
