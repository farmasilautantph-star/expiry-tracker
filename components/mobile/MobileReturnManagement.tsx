"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReturnEntry, ReturnFilters, ReturnCounts } from "@/hooks/useReturns";
import ReturnAnalytics from "@/components/returns/ReturnAnalytics";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { XMarkIcon } from "@heroicons/react/24/outline";

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pending:      { bg: "#fffbeb", color: "#b45309", border: "#fde68a",  label: "Pending"      },
  overdue:      { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca",  label: "Overdue"      },
  returned:     { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0",  label: "Returned"     },
  not_approved: { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0",  label: "Not Approved" },
};

function statusKey(entry: ReturnEntry): string {
  if (entry.return_status === "returned") return "returned";
  if (entry.return_status === "not_approved") return "not_approved";
  if (entry.overdue) return "overdue";
  return "pending";
}

interface Props {
  activeEntries: ReturnEntry[];
  historyEntries: ReturnEntry[];
  counts: ReturnCounts;
  isLoading: boolean;
  isManager: boolean;
  error?: string | null;
  tab: "active" | "history";
  onTabChange: (tab: "active" | "history") => void;
  filters: ReturnFilters;
  setFilter: <K extends keyof ReturnFilters>(key: K, value: ReturnFilters[K]) => void;
  onMarkReturned: (id: number, notes?: string) => Promise<void>;
  onMarkNotApproved: (id: number, notes?: string) => Promise<void>;
  onUpdateReturnDate: (id: number, date: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export default function MobileReturnManagement({
  activeEntries,
  historyEntries,
  counts,
  isLoading,
  isManager,
  error,
  tab,
  onTabChange,
  filters,
  setFilter,
  onMarkReturned,
  onMarkNotApproved,
  onUpdateReturnDate,
}: Props) {
  const [searchOpen, setSearchOpen]             = useState(false);
  const [confirmEntry, setConfirmEntry]         = useState<ReturnEntry | null>(null);
  const [notApprovingEntry, setNotApprovingEntry] = useState<ReturnEntry | null>(null);
  const [actionNotes, setActionNotes]           = useState("");
  const [submitting, setSubmitting]             = useState(false);
  const [editingDateId, setEditingDateId]       = useState<number | null>(null);
  const [editDateVal, setEditDateVal]           = useState("");
  const [editDateSaving, setEditDateSaving]     = useState(false);
  const { toasts, showSuccess, showError, dismiss } = useToast();
  const router = useRouter();

  const entries = tab === "active" ? activeEntries : historyEntries;

  const chips =
    tab === "active"
      ? [
          { key: "pending"  as const, count: counts.pending  },
          { key: "overdue"  as const, count: counts.overdue  },
        ]
      : [
          { key: "returned"     as const, count: counts.returned     },
          { key: "not_approved" as const, count: counts.not_approved },
        ];

  async function handleMarkReturned() {
    if (!confirmEntry) return;
    setSubmitting(true);
    try {
      await onMarkReturned(confirmEntry.id, actionNotes || undefined);
      showSuccess("Item marked as returned");
      setConfirmEntry(null);
      setActionNotes("");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to mark as returned");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkNotApproved() {
    if (!notApprovingEntry) return;
    setSubmitting(true);
    try {
      await onMarkNotApproved(notApprovingEntry.id, actionNotes || undefined);
      showSuccess("Return marked as not approved");
      setNotApprovingEntry(null);
      setActionNotes("");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDate(id: number) {
    if (!editDateVal) return;
    setEditDateSaving(true);
    try {
      await onUpdateReturnDate(id, editDateVal);
      setEditingDateId(null);
    } catch {
      // keep editing open
    } finally {
      setEditDateSaving(false);
    }
  }

  return (
    <div className="mobile-page-enter md:hidden" style={{ background: "#f4f7fb", minHeight: "100%" }}>
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
              Inventory Management
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.4px",
              }}
            >
              Returns
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
              background: searchOpen ? "#1d4ed8" : "#f1f5f9",
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
              placeholder="Search desc, barcode, stock ID…"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
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
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilter("search", "")}
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
              onClick={() => onTabChange(t)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                background: tab === t ? "#1d4ed8" : "transparent",
                color: tab === t ? "#fff" : "#64748b",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t === "active" ? "Active Returns" : "Return History"}
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
          {chips.map(({ key, count }) => {
            const s = STATUS_STYLE[key];
            const isActive = filters.status === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter("status", isActive ? "" : key)}
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
          Total {isLoading ? "…" : entries.length}
        </p>
      </div>

      {/* ─── ANALYTICS ─── */}
      {isManager && tab === "active" && !isLoading && (
        <div style={{ padding: "14px 16px 0" }}>
          <ReturnAnalytics entries={activeEntries} counts={counts} />
        </div>
      )}

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
                height: 140,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ height: 22, width: "28%", background: "#f1f5f9", borderRadius: 999 }} />
                <div style={{ height: 14, width: "20%", background: "#f1f5f9", borderRadius: 4 }} />
              </div>
              <div style={{ height: 14, width: "88%", background: "#f1f5f9", borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 12, width: "65%", background: "#f1f5f9", borderRadius: 4, marginBottom: 18 }} />
              <div style={{ height: 44, background: "#f1f5f9", borderRadius: 12 }} />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: "32px 16px",
              border: "1px solid #eef1f6",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            {tab === "active" ? "No active return items" : "No completed returns yet"}
          </div>
        ) : (
          entries.map((entry) => {
            const isPending    = entry.return_status === "pending";
            const sk           = statusKey(entry);
            const ss           = STATUS_STYLE[sk];
            const dueDate      =
              tab === "active"
                ? entry.return_by_date
                  ? `Due: ${formatShortDate(entry.return_by_date)}`
                  : ""
                : entry.completed_at
                  ? formatShortDate(entry.completed_at)
                  : "";
            const metaParts    = [
              entry.uom ?? null,
              `Exp: ${formatShortDate(entry.expiry_date)}`,
              `PIC: ${entry.pic_name}`,
            ]
              .filter(Boolean)
              .join(" · ");
            const isEditingDate = editingDateId === entry.id;

            return (
              <div
                key={entry.id}
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: 16,
                  boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
                  border: "1px solid #eef1f6",
                  opacity: tab === "history" ? 0.82 : 1,
                }}
              >
                {/* TOP ROW: status badge + due date */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 9,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: ss.bg,
                      color: ss.color,
                      border: `1.5px solid ${ss.border}`,
                    }}
                  >
                    {ss.label}
                  </span>
                  {dueDate && (
                    <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                      {dueDate}
                    </span>
                  )}
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
                <p
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    lineHeight: 1.4,
                    marginBottom: tab === "active" && isPending ? 12 : 4,
                  }}
                >
                  {metaParts}
                </p>

                {/* ACTIONS — active + pending */}
                {tab === "active" && isPending && (
                  <>
                    {/* Edit date inline */}
                    {isEditingDate ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <input
                          type="date"
                          value={editDateVal}
                          onChange={(e) => setEditDateVal(e.target.value)}
                          autoFocus
                          style={{
                            flex: 1,
                            height: 44,
                            borderRadius: 12,
                            border: "1.5px solid #2563eb",
                            padding: "0 12px",
                            fontSize: 13,
                            color: "#0f172a",
                            outline: "none",
                            fontFamily: "inherit",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveDate(entry.id)}
                          disabled={editDateSaving || !editDateVal}
                          style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: "#dcfce7", color: "#15803d",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: "none", cursor: "pointer", flexShrink: 0,
                          }}
                          aria-label="Save date"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDateId(null)}
                          style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: "#f1f5f9", color: "#64748b",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: "none", cursor: "pointer", flexShrink: 0,
                          }}
                          aria-label="Cancel"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M6 6l12 12M6 18L18 6" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => { setConfirmEntry(entry); setActionNotes(""); }}
                          style={{
                            flex: 1,
                            height: 44,
                            borderRadius: 12,
                            background: "#1d4ed8",
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 700,
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Mark Returned
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDateId(entry.id);
                            setEditDateVal(entry.return_by_date?.split("T")[0] ?? "");
                          }}
                          title="Edit return date"
                          style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: "#f1f5f9", color: "#475569",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: "none", cursor: "pointer", flexShrink: 0,
                          }}
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Not Approved — secondary link */}
                    {!isEditingDate && (
                      <button
                        type="button"
                        onClick={() => { setNotApprovingEntry(entry); setActionNotes(""); }}
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#b91c1c",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Not Approved
                      </button>
                    )}
                  </>
                )}

                {/* HISTORY: view details link */}
                {tab === "history" && (
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/shortlist?review=${entry.id}`)}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#1d4ed8",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    View Details →
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─── CONFIRM MARK RETURNED MODAL ─── */}
      {confirmEntry && (
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
                Confirm Return Completed
              </h3>
              <button
                type="button"
                onClick={() => setConfirmEntry(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}
              >
                <XMarkIcon style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
              {confirmEntry.description}
            </p>
            {confirmEntry.return_by_date && (
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                Return By: {formatShortDate(confirmEntry.return_by_date)}
              </p>
            )}
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Notes (optional)
            </label>
            <textarea
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              rows={3}
              placeholder="Add any return notes..."
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
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setConfirmEntry(null)}
                disabled={submitting}
                style={{
                  flex: 1, height: 42, borderRadius: 12, background: "#f1f5f9",
                  color: "#64748b", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkReturned}
                disabled={submitting}
                style={{
                  flex: 1, height: 42, borderRadius: 12, background: "#15803d",
                  color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRM NOT APPROVED MODAL ─── */}
      {notApprovingEntry && (
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
                Return Not Approved
              </h3>
              <button
                type="button"
                onClick={() => setNotApprovingEntry(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}
              >
                <XMarkIcon style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 12 }}>
              {notApprovingEntry.description}
            </p>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Reason (optional)
            </label>
            <textarea
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              rows={3}
              placeholder="Reason for rejection..."
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
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setNotApprovingEntry(null)}
                disabled={submitting}
                style={{
                  flex: 1, height: 42, borderRadius: 12, background: "#f1f5f9",
                  color: "#64748b", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkNotApproved}
                disabled={submitting}
                style={{
                  flex: 1, height: 42, borderRadius: 12, background: "#ea580c",
                  color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
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
