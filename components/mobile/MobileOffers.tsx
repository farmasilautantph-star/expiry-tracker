"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OfferEntry } from "@/hooks/useOffers";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { XMarkIcon, CheckIcon, BuildingStorefrontIcon } from "@heroicons/react/24/outline";

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
  if (days === null) return null;
  const bg    = days < 0 ? "#fee2e2" : days < 90 ? "#ffedd5" : days <= 240 ? "#fef9c3" : "#dcfce7";
  const color = days < 0 ? "#dc2626" : days < 90 ? "#ea580c" : days <= 240 ? "#ca8a04" : "#16a34a";
  const border= days < 0 ? "#fca5a5" : days < 90 ? "#fdba74" : days <= 240 ? "#fde047" : "#86efac";
  const label = days < 0 ? "Expired" : days === 0 ? "Today" : days <= 30 ? `${days}d left` : `${Math.round(days / 30)}mo left`;
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 999,
        background: bg,
        color,
        border: `1.5px solid ${border}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

const HISTORY_STATUS: Record<string, { bg: string; border: string; color: string; label: string }> = {
  accepted: { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", label: "Received" },
  rejected: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c", label: "Rejected"  },
};

interface Props {
  entries: OfferEntry[];
  isLoading: boolean;
  isManager: boolean;
  error?: string | null;
  onUpdateOfferStatus: (
    id: number,
    status: "accepted" | "rejected",
    opts?: { received_at?: string; rejection_notes?: string }
  ) => Promise<{ qty_deducted: number; item_completed: boolean }>;
  onRefresh?: () => Promise<void>;
}

export default function MobileOffers({
  entries,
  isLoading,
  isManager,
  error,
  onUpdateOfferStatus,
  onRefresh,
}: Props) {
  const router = useRouter();
  const [tab, setTab]               = useState<"active" | "history">("active");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "accepted" | "rejected">("");
  const [receivingOffer, setReceivingOffer]   = useState<OfferEntry | null>(null);
  const [rejectingOffer, setRejectingOffer]   = useState<OfferEntry | null>(null);
  const [receivedAt, setReceivedAt]           = useState(() => new Date().toISOString().split("T")[0]);
  const [rejectionNotes, setRejectionNotes]   = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const { toasts, showSuccess, showError, dismiss } = useToast();

  // ── Global counts (unaffected by search/typeFilter) ──
  const countOffered  = useMemo(() => entries.filter((e) => e.offer_status === "offered").length,  [entries]);
  const countAccepted = useMemo(() => entries.filter((e) => e.offer_status === "accepted").length, [entries]);
  const countRejected = useMemo(() => entries.filter((e) => e.offer_status === "rejected").length, [entries]);

  // ── Filtered display entries ──
  const activeEntries = useMemo(() => {
    let data = entries.filter((e) => e.offer_status === "offered");
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.outlet_name.toLowerCase().includes(q) ||
          e.barcode.toLowerCase().includes(q)
      );
    }
    return data;
  }, [entries, search]);

  const historyEntries = useMemo(() => {
    let data = entries.filter(
      (e) => e.offer_status === "accepted" || e.offer_status === "rejected"
    );
    if (typeFilter) {
      data = data.filter((e) => e.offer_status === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.outlet_name.toLowerCase().includes(q) ||
          e.barcode.toLowerCase().includes(q)
      );
    }
    return data;
  }, [entries, typeFilter, search]);

  const displayEntries = tab === "active" ? activeEntries : historyEntries;

  function handleTabChange(t: "active" | "history") {
    setTab(t);
    setSearch("");
    setTypeFilter("");
    if (searchOpen) setSearchOpen(false);
  }

  async function handleReceived() {
    if (!receivingOffer) return;
    setSubmitting(true);
    try {
      const result = await onUpdateOfferStatus(receivingOffer.id, "accepted", {
        received_at: receivedAt || undefined,
      });
      setReceivingOffer(null);
      if (result.item_completed) {
        showSuccess(`Confirmed! ${result.qty_deducted} unit${result.qty_deducted !== 1 ? "s" : ""} deducted — item moved to Sales Record`);
      } else {
        showSuccess(`Confirmed! ${result.qty_deducted} unit${result.qty_deducted !== 1 ? "s" : ""} deducted from stock`);
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

  return (
    <div className="md:hidden" style={{ background: "#f4f7fb", minHeight: "100%" }}>
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* ─── HEADER ─── */}
      <div
        style={{
          background: "#fff",
          padding: "18px 16px 14px",
          borderBottom: "1px solid #f0f4f8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "1.2px",
                color: "#94a3b8",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              Outlet Promotions
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.4px",
              }}
            >
              Outlet Offers
            </div>
          </div>

          {/* Search icon button */}
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            aria-label={searchOpen ? "Close search" : "Search"}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              flexShrink: 0,
              background: searchOpen ? "#1e3a5f" : "#f1f5f9",
              color: searchOpen ? "#fff" : "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
            }}
          >
            {searchOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ─── SEARCH BAR (collapsible) ─── */}
      {searchOpen && (
        <div
          style={{
            background: "#fff",
            padding: "12px 16px 14px",
            borderBottom: "1px solid #f0f4f8",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#f4f7fb",
              borderRadius: 14,
              padding: "0 14px",
              height: 46,
              border: "1.5px solid #eef1f6",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              type="text"
              autoFocus
              placeholder="Search item, outlet, barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                background: "none",
                fontFamily: "inherit",
                fontSize: 14,
                color: "#0f172a",
                outline: "none",
                minWidth: 0,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                style={{
                  color: "#94a3b8",
                  flexShrink: 0,
                  display: "flex",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── TABS ─── */}
      <div
        style={{
          background: "#fff",
          padding: "10px 16px",
          borderBottom: "1px solid #f0f4f8",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "#f1f5f9",
            borderRadius: 12,
            padding: 4,
          }}
        >
          {(["active", "history"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                background: tab === t ? "#1e3a5f" : "transparent",
                color: tab === t ? "#fff" : "#64748b",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t === "active" ? "Active Offers" : "Offer History"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── STATUS CHIPS + TOTAL ─── */}
      <div
        style={{
          background: "#fff",
          padding: "10px 16px 12px",
          borderBottom: "1px solid #f0f4f8",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties}
        >
          {tab === "active" ? (
            <span
              style={{
                flexShrink: 0,
                padding: "5px 13px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "1.5px solid #bfdbfe",
              }}
            >
              Offered · {isLoading ? "…" : countOffered}
            </span>
          ) : (
            <>
              {(["accepted", "rejected"] as const).map((key) => {
                const s = HISTORY_STATUS[key];
                const count = key === "accepted" ? countAccepted : countRejected;
                const isActive = typeFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTypeFilter(isActive ? "" : key)}
                    style={{
                      flexShrink: 0,
                      padding: "5px 13px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      background: isActive ? s.color : s.bg,
                      color: isActive ? "#fff" : s.color,
                      border: `1.5px solid ${s.border}`,
                      cursor: "pointer",
                      transition: "background-color 0.15s",
                    }}
                  >
                    {s.label} · {isLoading ? "…" : count}
                  </button>
                );
              })}
            </>
          )}
        </div>
        <p
          style={{
            textAlign: "right",
            fontSize: 11,
            color: "#94a3b8",
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          Total {isLoading ? "…" : displayEntries.length}
        </p>
      </div>

      {/* ─── CARD LIST ─── */}
      <div
        style={{
          padding: "12px 16px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Error */}
        {error && (
          <div
            style={{
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
              color: "#b91c1c",
              background: "#fef2f2",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}

        {/* Skeletons */}
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: 16,
                border: "1px solid #eef1f6",
                height: 150,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ height: 22, width: "28%", background: "#f1f5f9", borderRadius: 999 }} />
                <div style={{ height: 14, width: "22%", background: "#f1f5f9", borderRadius: 4 }} />
              </div>
              <div style={{ height: 14, width: "90%", background: "#f1f5f9", borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 12, width: "55%", background: "#f1f5f9", borderRadius: 4, marginBottom: 6 }} />
              <div style={{ height: 12, width: "45%", background: "#f1f5f9", borderRadius: 4, marginBottom: 18 }} />
              <div style={{ height: 44, background: "#f1f5f9", borderRadius: 12 }} />
            </div>
          ))
        ) : displayEntries.length === 0 ? (
          /* ── EMPTY STATE ── */
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: "40px 24px",
              border: "1px solid #eef1f6",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              {tab === "active" ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              )}
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
              {tab === "active" ? "No Active Offers" : "No Offer History"}
            </p>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.55, maxWidth: 240 }}>
              {tab === "active"
                ? "Create outlet offers for near-expiry items to reduce waste and recover value."
                : "Completed offers will appear here once received or rejected."}
            </p>
            {tab === "active" && isManager && (
              <button
                type="button"
                onClick={() => router.push("/dashboard/shortlist")}
                style={{
                  marginTop: 20,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 22px",
                  borderRadius: 12,
                  background: "#1e3a5f",
                  color: "#fff",
                  fontSize: 13.5,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Offer
              </button>
            )}
          </div>
        ) : tab === "active" ? (
          /* ── ACTIVE OFFER CARDS ── */
          activeEntries.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: 16,
                boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
                border: "1px solid #eef1f6",
              }}
            >
              {/* TOP ROW: days-left badge + offered date */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9, gap: 8 }}>
                <DaysLeftBadge expiryDate={entry.expiry_date} />
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>
                  Offered: {formatShortDate(entry.created_at)}
                </span>
              </div>

              {/* ITEM NAME */}
              <p
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#0f172a",
                  lineHeight: 1.35,
                  marginBottom: 6,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {entry.description}
              </p>

              {/* OUTLET */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <BuildingStorefrontIcon style={{ width: 13, height: 13, color: "#94a3b8", flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{entry.outlet_name}</span>
              </div>

              {/* META */}
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12, lineHeight: 1.4 }}>
                {[
                  entry.uom ? `UOM: ${entry.uom}` : null,
                  `Qty: ${entry.quantity}`,
                  `Exp: ${formatShortDate(entry.expiry_date)}`,
                ].filter(Boolean).join(" · ")}
              </p>

              {/* ACTIONS */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setReceivingOffer(entry);
                    setReceivedAt(new Date().toISOString().split("T")[0]);
                  }}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    background: "#1e3a5f",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <CheckIcon style={{ width: 15, height: 15 }} />
                  Received
                </button>
                <button
                  type="button"
                  onClick={() => { setRejectingOffer(entry); setRejectionNotes(""); }}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    background: "#fef2f2",
                    color: "#b91c1c",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "1.5px solid #fecaca",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <XMarkIcon style={{ width: 15, height: 15 }} />
                  Rejected
                </button>
              </div>
            </div>
          ))
        ) : (
          /* ── HISTORY CARDS ── */
          historyEntries.map((entry) => {
            const s = HISTORY_STATUS[entry.offer_status as "accepted" | "rejected"] ?? HISTORY_STATUS.rejected;
            const completedDate =
              entry.offer_status === "accepted"
                ? (entry.received_at ?? entry.updated_at)
                : entry.updated_at;
            return (
              <div
                key={entry.id}
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: 16,
                  boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
                  border: "1px solid #eef1f6",
                  opacity: 0.85,
                }}
              >
                {/* TOP ROW: status badge + completed date */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9, gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: s.bg,
                      color: s.color,
                      border: `1.5px solid ${s.border}`,
                    }}
                  >
                    {s.label}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {formatShortDate(completedDate)}
                  </span>
                </div>

                {/* ITEM NAME */}
                <p
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "#0f172a",
                    lineHeight: 1.35,
                    marginBottom: 5,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {entry.description}
                </p>

                {/* DETAILS */}
                <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                  {entry.outlet_name} · Qty: {entry.quantity}
                </p>

                {/* REJECTION NOTES */}
                {entry.rejection_notes && (
                  <p
                    style={{
                      fontSize: 11.5,
                      color: "#94a3b8",
                      fontStyle: "italic",
                      marginTop: 6,
                      lineHeight: 1.4,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    Note: {entry.rejection_notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─── CONFIRM RECEIVED MODAL ─── */}
      {receivingOffer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              width: "100%",
              maxWidth: 400,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>
                Confirm Offer Received
              </h3>
              <button
                type="button"
                onClick={() => setReceivingOffer(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}
              >
                <XMarkIcon style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <p style={{ fontSize: 14, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              {receivingOffer.description}
            </p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
              Outlet: <span style={{ fontWeight: 500, color: "#334155" }}>{receivingOffer.outlet_name}</span>
            </p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
              Qty: <span style={{ fontWeight: 500, color: "#334155" }}>{receivingOffer.quantity} unit{receivingOffer.quantity !== 1 ? "s" : ""}</span>
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 13,
                color: "#2563eb",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                marginBottom: 14,
              }}
            >
              <svg style={{ width: 15, height: 15, marginTop: 1, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>This will deduct {receivingOffer.quantity} unit{receivingOffer.quantity !== 1 ? "s" : ""} from item stock</span>
            </div>

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Date Received (optional)
            </label>
            <input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              style={{
                width: "100%",
                height: 42,
                padding: "0 12px",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 13,
                color: "#0f172a",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
                marginBottom: 16,
              }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setReceivingOffer(null)}
                disabled={submitting}
                style={{ flex: 1, height: 42, borderRadius: 12, background: "#f1f5f9", color: "#64748b", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReceived}
                disabled={submitting}
                style={{ flex: 1, height: 42, borderRadius: 12, background: "#15803d", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRM REJECTED MODAL ─── */}
      {rejectingOffer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              width: "100%",
              maxWidth: 400,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>
                Confirm Offer Rejected
              </h3>
              <button
                type="button"
                onClick={() => { setRejectingOffer(null); setRejectionNotes(""); }}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}
              >
                <XMarkIcon style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <p style={{ fontSize: 14, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              {rejectingOffer.description}
            </p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
              Outlet: <span style={{ fontWeight: 500, color: "#334155" }}>{rejectingOffer.outlet_name}</span> · Qty: {rejectingOffer.quantity}
            </p>

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Reason (optional)
            </label>
            <textarea
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              rows={3}
              placeholder="Enter reason for rejection..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 13,
                color: "#0f172a",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
                marginBottom: 16,
              }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => { setRejectingOffer(null); setRejectionNotes(""); }}
                disabled={submitting}
                style={{ flex: 1, height: 42, borderRadius: 12, background: "#f1f5f9", color: "#64748b", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejected}
                disabled={submitting}
                style={{ flex: 1, height: 42, borderRadius: 12, background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
