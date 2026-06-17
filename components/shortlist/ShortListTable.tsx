"use client";

import type { ShortListEntry } from "@/hooks/useShortList";

type Urgency = "expired" | "critical" | "warning" | "safe";

const BADGE: Record<Urgency, string> = {
  expired:  "bg-red-500/15 text-red-400 border border-red-500/25",
  critical: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
  warning:  "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25",
  safe:     "bg-green-500/15 text-green-400 border border-green-500/25",
};

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
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[urgency as Urgency]}`}>
      {(urgency === "expired" || urgency === "critical") && (
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd" />
        </svg>
      )}
      {label}
    </span>
  );
}

function ReturnBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-600 text-xs">—</span>;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
      status === "returnable"
        ? "bg-green-500/15 text-green-400 border border-green-500/25"
        : "bg-gray-500/15 text-gray-400 border border-gray-500/25"
    }`}>
      {status === "returnable" ? "Return" : "Non-Return"}
    </span>
  );
}

interface Props {
  entries: ShortListEntry[];
  isLoading: boolean;
  isManager: boolean;
  onEditRequest: (entry: ShortListEntry) => void;
  onDeleteRequest: (entry: ShortListEntry) => void;
}

const TH = "sticky top-0 z-10 bg-gray-900 px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-800";
const TD = "px-4 py-3";

export default function ShortListTable({
  entries,
  isLoading,
  isManager,
  onEditRequest,
  onDeleteRequest,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm text-gray-500">No items found.</p>
        <p className="text-xs text-gray-600 mt-1">Try adjusting your filters or adding entries via Log New Expiry.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900">
            <th className={TH}>Date Logged</th>
            <th className={TH}>PIC</th>
            <th className={TH}>Stock ID</th>
            <th className={TH}>Barcode</th>
            <th className={`${TH} max-w-[200px]`}>Description</th>
            <th className={TH}>Category</th>
            <th className={TH}>UOM</th>
            <th className={TH}>Expiry Date</th>
            <th className={TH}>Days Left</th>
            <th className={TH}>Return</th>
            <th className={TH}>Return By</th>
            {isManager && (
              <th className={`${TH} text-right`}>Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {entries.map((entry) => {
            const urgency = entry.urgency as Urgency;
            const rowBg =
              urgency === "expired" ? "bg-red-500/5" :
              urgency === "critical" ? "bg-orange-500/5" : "";

            return (
              <tr key={entry.id} className={`hover:bg-gray-800/50 transition-colors ${rowBg}`}>
                <td className={`${TD} text-gray-400 whitespace-nowrap`}>
                  {formatDate(entry.logged_at)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <span className="text-xs font-medium text-gray-300 bg-gray-800 px-2 py-0.5 rounded">
                    {entry.pic_name}
                  </span>
                </td>
                <td className={`${TD} text-gray-400 font-mono text-xs whitespace-nowrap`}>
                  {entry.stock_id ?? "—"}
                </td>
                <td className={`${TD} text-gray-400 font-mono text-xs whitespace-nowrap`}>
                  {entry.barcode}
                </td>
                <td className={`${TD} max-w-[200px]`}>
                  <span
                    className="block truncate text-white"
                    title={entry.description + (entry.notes ? ` — ${entry.notes}` : "")}
                  >
                    {entry.description}
                  </span>
                  {entry.notes && (
                    <span className="block truncate text-xs text-gray-500 mt-0.5" title={entry.notes}>
                      {entry.notes}
                    </span>
                  )}
                </td>
                <td className={`${TD} text-gray-300 whitespace-nowrap`}>{entry.category}</td>
                <td className={`${TD} text-gray-400 text-xs whitespace-nowrap`}>{entry.uom ?? "—"}</td>
                <td className={`${TD} text-gray-300 whitespace-nowrap`}>
                  {formatDate(entry.expiry_date)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <DaysLeftBadge entry={entry} />
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <ReturnBadge status={entry.return_status} />
                </td>
                <td className={`${TD} text-gray-400 text-xs whitespace-nowrap`}>
                  {entry.return_status === "returnable" && entry.return_by_date
                    ? formatDate(entry.return_by_date)
                    : "—"}
                </td>
                {isManager && (
                  <td className={`${TD} whitespace-nowrap`}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEditRequest(entry)}
                        className="p-1.5 rounded text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteRequest(entry)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
