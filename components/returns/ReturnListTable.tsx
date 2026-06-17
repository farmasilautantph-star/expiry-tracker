"use client";

import type { ReturnEntry } from "@/hooks/useReturns";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "returned") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
        ✅ Returned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
      🟡 Pending
    </span>
  );
}

interface Props {
  entries: ReturnEntry[];
  isLoading: boolean;
  isManager: boolean;
  onEditRequest: (entry: ReturnEntry) => void;
  onDeleteRequest: (entry: ReturnEntry) => void;
  onMarkReturnedRequest: (entry: ReturnEntry) => void;
}

const TH =
  "sticky top-0 z-10 bg-gray-900 px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-800";
const TD = "px-4 py-3";

export default function ReturnListTable({
  entries,
  isLoading,
  isManager,
  onEditRequest,
  onDeleteRequest,
  onMarkReturnedRequest,
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
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        <p className="text-sm text-gray-500">No return entries found.</p>
        <p className="text-xs text-gray-600 mt-1">
          Try adjusting your filters or log a new return using the button above.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <p className="px-4 py-2.5 text-xs text-gray-500 bg-gray-900 border-b border-gray-800">
        Showing {entries.length} {entries.length === 1 ? "entry" : "entries"}
      </p>
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
            <th className={TH}>Return By</th>
            <th className={TH}>Status</th>
            {isManager && <th className={`${TH} text-right`}>Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {entries.map((entry) => {
            const overdue = entry.status !== "returned" && isOverdue(entry.return_by_date);
            return (
              <tr key={entry.id} className={`hover:bg-gray-800/50 transition-colors ${overdue ? "bg-red-500/5" : ""}`}>
                <td className={`${TD} text-gray-400 whitespace-nowrap`}>
                  {formatDate(entry.logged_date)}
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
                <td className={`${TD} whitespace-nowrap`}>
                  {entry.return_by_date ? (
                    <span className={overdue ? "text-red-400 font-medium" : "text-gray-300"}>
                      {formatDate(entry.return_by_date)}
                      {overdue && <span className="ml-1 text-xs">(overdue)</span>}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <StatusBadge status={entry.status ?? "pending"} />
                </td>
                {isManager && (
                  <td className={`${TD} whitespace-nowrap`}>
                    <div className="flex items-center justify-end gap-1">
                      {entry.status !== "returned" && (
                        <button
                          onClick={() => onMarkReturnedRequest(entry)}
                          className="p-1.5 rounded text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                          title="Mark Returned"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
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
