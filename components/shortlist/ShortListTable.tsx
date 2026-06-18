"use client";

import { useState } from "react";
import type { ShortListEntry } from "@/hooks/useShortList";

type Urgency = "expired" | "critical" | "warning" | "safe";

const BADGE: Record<Urgency, string> = {
  expired: "bg-red-50 text-[#ef4444] border border-red-200",
  critical: "bg-orange-50 text-[#f97316] border border-orange-200",
  warning: "bg-yellow-50 text-[#ca8a04] border border-yellow-200",
  safe: "bg-green-50 text-[#16a34a] border border-green-200",
};

function OfferBadge({ entry }: { entry: ShortListEntry }) {
  const { quantity, total_offered, offer_status } = entry;
  if (offer_status === "not-offered") {
    return <span className="text-xs text-[#cbd5e1]">—</span>;
  }
  const badgeCls =
    total_offered >= quantity
      ? "bg-emerald-50 text-[#059669] border border-emerald-200"
      : "bg-blue-50 text-[#1e3a8a] border border-blue-200";
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}
    >
      {total_offered}/{quantity} offered
    </span>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function DaysLeftBadge({ entry }: { entry: ShortListEntry }) {
  const { days_left, urgency } = entry;
  let label: string;
  if (days_left < 0) label = `${Math.abs(days_left)}d ago`;
  else if (days_left === 0) label = "Today";
  else label = `${days_left}d`;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE[urgency as Urgency]}`}
    >
      {(urgency === "expired" || urgency === "critical") && (
        <svg
          className="w-3 h-3 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {label}
    </span>
  );
}

function ReturnBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[#cbd5e1] text-xs">—</span>;
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        status === "pending"
          ? "bg-green-50 text-[#16a34a] border border-green-200"
          : "bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]"
      }`}
    >
      {status === "pending" ? "Return" : "Non-Return"}
    </span>
  );
}

function calcReviewInfo(entry: ShortListEntry): {
  label: string;
  colorClass: string;
  statusLabel: string;
  statusClass: string;
} {
  if (entry.return_status === "returned" || entry.quantity === 0) {
    return {
      label: "Resolved",
      colorClass: "text-[#64748b]",
      statusLabel: "☑️ Resolved",
      statusClass: "bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ref = entry.last_reviewed_at ?? entry.logged_at;
  const refDate = new Date(ref);
  refDate.setHours(0, 0, 0, 0);
  const days = Math.floor(
    (today.getTime() - refDate.getTime()) / 86_400_000,
  );

  if (days <= 7) {
    return {
      label: days === 0 ? "Just now" : `${days}d ago`,
      colorClass: "text-[#16a34a]",
      statusLabel: "🟢 Up to date",
      statusClass: "bg-green-50 text-[#16a34a] border border-green-200",
    };
  }
  if (days <= 14) {
    return {
      label: `${days}d ago`,
      colorClass: "text-[#ca8a04]",
      statusLabel: "🟡 Needs Review",
      statusClass: "bg-yellow-50 text-[#ca8a04] border border-yellow-200",
    };
  }
  return {
    label: entry.last_reviewed_at ? `${days}d ago` : "Never",
    colorClass: "text-[#ef4444]",
    statusLabel: "🔴 Critical",
    statusClass: "bg-red-50 text-[#ef4444] border border-red-200",
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
  "sticky top-0 z-10 bg-[#f8fafc] px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap border-b border-[#e2e8f0]";
const TD = "px-4 py-3 font-medium";

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-[#e2e8f0] shadow-sm">
        <div className="flex items-center gap-3 text-[#64748b]">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-[#e2e8f0] shadow-sm">
        <svg
          className="w-10 h-10 text-[#cbd5e1] mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm text-[#64748b]">No items found.</p>
        <p className="text-xs text-[#94a3b8] mt-1">
          Try adjusting your filters or adding entries via Log New Expiry.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f8fafc]">
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
        <tbody className="divide-y divide-[#e2e8f0]">
          {entries.map((entry) => {
            const urgency = entry.urgency as Urgency;
            const rowBg =
              urgency === "expired"
                ? "bg-red-50/40"
                : urgency === "critical"
                  ? "bg-orange-50/40"
                  : "";

            const canReview =
              isManager || entry.pic_name === currentPicName;
            const isReviewing = reviewingIds.has(entry.id);
            const justReviewed = justReviewedIds.has(entry.id);
            const review = calcReviewInfo(entry);

            return (
              <tr
                key={entry.id}
                className={`hover:bg-[#f0f4ff] transition-colors ${rowBg}`}
              >
                <td className={`${TD} text-[#64748b] whitespace-nowrap`}>
                  {formatDate(entry.logged_at)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <span className="text-xs font-medium text-[#1e3a8a] bg-[#dbeafe] px-2 py-0.5 rounded">
                    {entry.pic_name}
                  </span>
                </td>
                <td
                  className={`${TD} text-[#64748b] font-mono text-xs whitespace-nowrap`}
                >
                  {entry.stock_id ?? "—"}
                </td>
                <td
                  className={`${TD} text-[#64748b] font-mono text-xs whitespace-nowrap`}
                >
                  {entry.barcode}
                </td>
                <td className={`${TD} max-w-[200px]`}>
                  <span
                    className="block truncate text-[#1e293b] font-medium"
                    title={
                      entry.description +
                      (entry.notes ? ` — ${entry.notes}` : "")
                    }
                  >
                    {entry.description}
                  </span>
                  {entry.notes && (
                    <span
                      className="block truncate text-xs text-[#94a3b8] mt-0.5"
                      title={entry.notes}
                    >
                      {entry.notes}
                    </span>
                  )}
                </td>
                <td className={`${TD} text-[#1e293b] whitespace-nowrap`}>
                  {entry.category}
                </td>
                <td
                  className={`${TD} text-[#64748b] text-xs whitespace-nowrap`}
                >
                  {entry.uom ?? "—"}
                </td>
                <td className={`${TD} text-[#1e293b] whitespace-nowrap`}>
                  {entry.quantity}
                </td>
                <td className={`${TD} text-[#1e293b] whitespace-nowrap`}>
                  {formatDate(entry.expiry_date)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <DaysLeftBadge entry={entry} />
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <ReturnBadge status={entry.return_status} />
                </td>
                <td
                  className={`${TD} text-[#64748b] text-xs whitespace-nowrap`}
                >
                  {entry.return_status === "pending" && entry.return_by_date
                    ? formatDate(entry.return_by_date)
                    : "—"}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <OfferBadge entry={entry} />
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <span
                    className={`text-xs font-medium ${justReviewed ? "text-[#16a34a]" : review.colorClass}`}
                  >
                    {justReviewed ? "Just now" : review.label}
                  </span>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${justReviewed ? "bg-green-50 text-[#16a34a] border border-green-200" : review.statusClass}`}
                  >
                    {justReviewed ? "🟢 Up to date" : review.statusLabel}
                  </span>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  {canReview &&
                    entry.return_status !== "returned" &&
                    entry.quantity > 0 && (
                      <button
                        onClick={() => handleMarkReviewed(entry.id)}
                        disabled={isReviewing || justReviewed}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          justReviewed
                            ? "bg-green-50 text-[#16a34a] border border-green-200 cursor-default"
                            : "bg-green-50 text-[#16a34a] hover:bg-green-600 hover:text-white border border-green-200 hover:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        }`}
                      >
                        {isReviewing ? (
                          <svg
                            className="animate-spin w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        ) : (
                          "✓"
                        )}
                        {justReviewed ? "Just now" : "Reviewed"}
                      </button>
                    )}
                </td>
                {isManager && (
                  <td className={`${TD} whitespace-nowrap`}>
                    <div className="flex items-center justify-end gap-1">
                      {entry.total_offered < entry.quantity && (
                        <button
                          onClick={() => onOfferRequest(entry)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[#1e3a8a] bg-[#eff6ff] hover:bg-[#1e3a8a] hover:text-white border border-blue-200 hover:border-[#1e3a8a] transition-colors"
                          title={`Offer to Outlet — ${entry.quantity - entry.total_offered} unit${entry.quantity - entry.total_offered === 1 ? "" : "s"} remaining`}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                            />
                          </svg>
                          Offer
                        </button>
                      )}
                      <button
                        onClick={() => onEditRequest(entry)}
                        className="p-1.5 rounded text-[#64748b] hover:text-[#1e3a8a] hover:bg-[#eff6ff] transition-colors"
                        title="Edit"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteRequest(entry)}
                        className="p-1.5 rounded text-[#64748b] hover:text-[#ef4444] hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
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
  );
}
