"use client";

import { useState } from "react";
import type { ShortListEntry } from "@/hooks/useShortList";
import {
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
  TagIcon,
  DocumentTextIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

type Urgency = "expired" | "critical" | "warning" | "safe";

const BADGE_STYLE: Record<Urgency, { bg: string; color: string; dotColor: string; fontWeight: number }> = {
  expired:  { bg: "#dc2626", color: "#ffffff", dotColor: "#ffffff", fontWeight: 700 },
  critical: { bg: "#ea580c", color: "#ffffff", dotColor: "#ffffff", fontWeight: 700 },
  warning:  { bg: "#fef3c7", color: "#92400e", dotColor: "#92400e", fontWeight: 600 },
  safe:     { bg: "#dcfce7", color: "#16a34a", dotColor: "#16a34a", fontWeight: 600 },
};

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

function StatusBadge({ status, urgency }: { status: string; urgency?: Urgency }) {
  const style = urgency
    ? BADGE_STYLE[urgency]
    : { bg: "#f1f5f9", color: "#475569", dotColor: "#94a3b8", fontWeight: 600 };
  return (
    <span
      className="badge"
      style={{ background: style.bg, color: style.color, fontWeight: style.fontWeight }}
    >
      <Dot color={style.dotColor} />
      {status}
    </span>
  );
}

function OfferBadge({ entry }: { entry: ShortListEntry }) {
  const { quantity, total_offered, offer_status } = entry;
  if (offer_status === "not-offered") {
    return <span className="text-xs text-[#cbd5e1]">—</span>;
  }
  const isComplete = total_offered >= quantity;
  return (
    <span
      className="badge"
      style={{
        background: isComplete ? "#dcfce7" : "#dbeafe",
        color: isComplete ? "#16a34a" : "#2563eb",
      }}
    >
      <Dot color={isComplete ? "#16a34a" : "#2563eb"} />
      {total_offered}/{quantity} offered
    </span>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function formatDaysLeft(days_left: number): string {
  if (days_left < 0) return "Expired";
  if (days_left === 0) return "Today";
  if (days_left <= 30) return `${days_left}d left`;
  return `${Math.round(days_left / 30)}m left`;
}

function DaysLeftBadge({ entry }: { entry: ShortListEntry }) {
  const { days_left, urgency } = entry;
  const u = urgency as Urgency;
  const style = BADGE_STYLE[u] ?? BADGE_STYLE.safe;
  return (
    <span className="badge" style={{ background: style.bg, color: style.color, fontWeight: style.fontWeight }}>
      <Dot color={style.dotColor} />
      {formatDaysLeft(days_left)}
    </span>
  );
}

function ReturnBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[#cbd5e1] text-xs">—</span>;
  const isPending = status === "pending";
  return (
    <span
      className="badge"
      style={{
        background: isPending ? "#fef3c7" : "#f1f5f9",
        color: isPending ? "#d97706" : "#64748b",
      }}
    >
      <Dot color={isPending ? "#d97706" : "#94a3b8"} />
      {isPending ? "Return" : "Non-Return"}
    </span>
  );
}

function calcReviewInfo(entry: ShortListEntry): {
  label: string;
  colorClass: string;
  statusLabel: string;
  statusBg: string;
  statusColor: string;
} {
  if (entry.return_status === "returned" || entry.quantity === 0) {
    return {
      label: "Resolved",
      colorClass: "text-[#64748b]",
      statusLabel: "Resolved",
      statusBg: "#f1f5f9",
      statusColor: "#64748b",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ref = entry.last_reviewed_at ?? entry.logged_at;
  const refDate = new Date(ref);
  refDate.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - refDate.getTime()) / 86_400_000);

  if (days <= 7) {
    return {
      label: days === 0 ? "Just now" : `${days}d ago`,
      colorClass: "text-[#16a34a]",
      statusLabel: "Up to date",
      statusBg: "#dcfce7",
      statusColor: "#16a34a",
    };
  }
  if (days <= 14) {
    return {
      label: `${days}d ago`,
      colorClass: "text-[#d97706]",
      statusLabel: "Needs Review",
      statusBg: "#fef3c7",
      statusColor: "#d97706",
    };
  }
  return {
    label: entry.last_reviewed_at ? `${days}d ago` : "Never",
    colorClass: "text-[#dc2626]",
    statusLabel: "Critical",
    statusBg: "#fee2e2",
    statusColor: "#dc2626",
  };
}

interface Props {
  entries: ShortListEntry[];
  isLoading: boolean;
  isManager: boolean;
  currentPicName: string;
  onEditRequest: (entry: ShortListEntry) => void;
  onDeleteRequest: (entry: ShortListEntry) => void;
  onOfferRequest: (entry: ShortListEntry) => void;
  onMarkReviewed?: (id: number) => Promise<void>;
}

const TH =
  "sticky top-0 z-10 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap";
const TD = "px-5 py-3.5 font-medium";

export default function ShortListTable({
  entries,
  isLoading,
  isManager,
  currentPicName,
  onEditRequest,
  onDeleteRequest,
  onOfferRequest,
  onMarkReviewed,
}: Props) {
  const [reviewingIds, setReviewingIds] = useState<Set<number>>(new Set());
  const [justReviewedIds, setJustReviewedIds] = useState<Set<number>>(new Set());
  const [sellingIds, setSellingIds] = useState<Set<number>>(new Set());
  const [sellConfirmEntry, setSellConfirmEntry] = useState<ShortListEntry | null>(null);
  const { toasts, showSuccess, showError, dismiss } = useToast();

  async function handleMarkReviewed(id: number) {
    setReviewingIds((prev) => { const s = new Set(prev); s.add(id); return s; });
    try {
      const res = await fetch(`/api/expiry/${id}/review`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to mark reviewed");
      setJustReviewedIds((prev) => { const s = new Set(prev); s.add(id); return s; });
      setTimeout(() => {
        setJustReviewedIds((prev) => {
          const s = new Set(prev);
          s.delete(id);
          return s;
        });
      }, 3000);
      await onMarkReviewed?.(id);
    } finally {
      setReviewingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  }

  async function handleMarkSold(entry: ShortListEntry) {
    setSellConfirmEntry(entry);
  }

  async function confirmSell() {
    if (!sellConfirmEntry) return;
    const entry = sellConfirmEntry;
    setSellConfirmEntry(null);
    setSellingIds((prev) => { const s = new Set(prev); s.add(entry.id); return s; });
    try {
      const res = await fetch(`/api/expiry/${entry.id}/sell`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      showSuccess("Item marked as sold");
      await onMarkReviewed?.(entry.id);
    } catch {
      showError("Failed to mark as sold");
    } finally {
      setSellingIds((prev) => { const s = new Set(prev); s.delete(entry.id); return s; });
    }
  }

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
        <p className="text-sm text-[#94a3b8]">No items found</p>
      </div>
    );
  }

  return (
    <>
    <Toast toasts={toasts} onDismiss={dismiss} />

    {/* Sell confirm modal */}
    {sellConfirmEntry && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
        <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-sm p-6 space-y-5">
          <h3 className="text-base font-semibold text-[#1e293b]">Confirm Item Sold</h3>
          <p className="text-sm text-[#64748b]">
            Mark{" "}
            <span className="font-semibold text-[#334155]">
              {sellConfirmEntry.description}
            </span>{" "}
            as fully sold? This will move it to Completed.
          </p>
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={() => setSellConfirmEntry(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmSell}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#16a34a] hover:bg-[#15803d] transition-colors"
            >
              Confirm Sold
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="overflow-x-auto overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
            <th className={TH}>Date Logged</th>
            <th className={TH}>PIC</th>
            <th className={TH}>Stock ID</th>
            <th className={TH}>Barcode</th>
            <th className={`${TH} max-w-[200px]`}>Description</th>
            <th className={TH}>Category</th>
            <th className={TH}>UOM</th>
            <th className={TH}>Qty</th>
            <th className={TH}>Expiry Date</th>
            <th className={TH}>Days Left</th>
            <th className={TH}>Return</th>
            <th className={TH}>Return By</th>
            <th className={TH}>Offered</th>
            <th className={TH}>Last Review</th>
            <th className={TH}>Status</th>
            <th className={TH}>Review</th>
            {isManager && <th className={`${TH} text-right`}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const urgency = entry.urgency as Urgency;
            const canReview = isManager || entry.pic_name === currentPicName;
            const isReviewing = reviewingIds.has(entry.id);
            const justReviewed = justReviewedIds.has(entry.id);
            const review = calcReviewInfo(entry);
            const canSell =
              (entry.item_status === "active" || entry.item_status === undefined) &&
              (isManager || entry.pic_name === currentPicName);
            const isSelling = sellingIds.has(entry.id);

            return (
              <tr
                key={entry.id}
                className="transition-colors duration-150"
                style={{ borderBottom: "1px solid #f1f5f9" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "#f8fafc")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "")
                }
              >
                <td className={`${TD} text-[#334155] whitespace-nowrap`}>
                  {formatDate(entry.logged_at)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <span
                    className="badge"
                    style={{ background: "#dbeafe", color: "#2563eb" }}
                  >
                    {entry.pic_name}
                  </span>
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
                <td className={`${TD} text-[#334155] whitespace-nowrap`}>
                  {entry.category}
                </td>
                <td className={`${TD} text-[#334155] text-xs whitespace-nowrap`}>
                  {entry.uom ?? "—"}
                </td>
                <td className={`${TD} text-[#334155] whitespace-nowrap`}>
                  {entry.quantity}
                </td>
                <td className={`${TD} text-[#334155] whitespace-nowrap`}>
                  {formatDate(entry.expiry_date)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <DaysLeftBadge entry={entry} />
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <ReturnBadge status={entry.return_status} />
                </td>
                <td className={`${TD} text-[#334155] text-xs whitespace-nowrap`}>
                  {entry.return_status === "pending" && entry.return_by_date
                    ? formatDate(entry.return_by_date)
                    : "—"}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <OfferBadge entry={entry} />
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <span className={`text-xs font-medium ${justReviewed ? "text-[#16a34a]" : review.colorClass}`}>
                    {justReviewed ? "Just now" : review.label}
                  </span>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <span
                    className="badge"
                    style={{
                      background: justReviewed ? "#dcfce7" : review.statusBg,
                      color: justReviewed ? "#16a34a" : review.statusColor,
                    }}
                  >
                    <Dot color={justReviewed ? "#16a34a" : review.statusColor} />
                    {justReviewed ? "Up to date" : review.statusLabel}
                  </span>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <div className="flex items-center gap-1">
                    {canReview &&
                      entry.return_status !== "returned" &&
                      entry.quantity > 0 && (
                        <button
                          onClick={() => handleMarkReviewed(entry.id)}
                          disabled={isReviewing || justReviewed}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ color: "#16a34a" }}
                          title="Mark Reviewed"
                          onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.background = "#dcfce7")
                          }
                          onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.background = "")
                          }
                        >
                          {isReviewing ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <CheckIcon className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    {canSell && (
                      <button
                        onClick={() => handleMarkSold(entry)}
                        disabled={isSelling}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ color: "#16a34a" }}
                        title="Mark as Sold"
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.background = "#dcfce7")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.background = "")
                        }
                      >
                        {isSelling ? (
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <BanknotesIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </td>
                {isManager && (
                  <td className={`${TD} whitespace-nowrap`}>
                    <div className="flex items-center justify-end gap-1">
                      {entry.total_offered < entry.quantity && (
                        <button
                          onClick={() => onOfferRequest(entry)}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                          style={{ color: "#2563eb" }}
                          title={`Offer to Outlet — ${entry.quantity - entry.total_offered} unit${entry.quantity - entry.total_offered === 1 ? "" : "s"} remaining`}
                          onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.background = "#dbeafe")
                          }
                          onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.background = "")
                          }
                        >
                          <TagIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onEditRequest(entry)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ color: "#2563eb" }}
                        title="Edit"
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.background = "#eff6ff")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.background = "")
                        }
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteRequest(entry)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ color: "#dc2626" }}
                        title="Delete"
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.background = "#fee2e2")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.background = "")
                        }
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
