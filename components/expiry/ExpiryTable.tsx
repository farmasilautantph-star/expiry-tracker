"use client";

import { ExpiryEntry } from "@/hooks/useExpiry";

interface Props {
  entries: ExpiryEntry[];
  isManager: boolean;
  onEditRequest: (entry: ExpiryEntry) => void;
  onDeleteRequest: (entry: ExpiryEntry) => void;
}

function getDaysLeft(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(expiryDate);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

type Urgency = "expired" | "critical" | "warning" | "safe";

function getUrgency(days: number): Urgency {
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  return "safe";
}

const BADGE: Record<Urgency, string> = {
  expired: "bg-red-50 text-[#ef4444] border border-red-200",
  critical: "bg-orange-50 text-[#f97316] border border-orange-200",
  warning: "bg-yellow-50 text-[#ca8a04] border border-yellow-200",
  safe: "bg-green-50 text-[#16a34a] border border-green-200",
};

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function DaysLeftBadge({ expiryDate }: { expiryDate: string }) {
  const days = getDaysLeft(expiryDate);
  const urgency = getUrgency(days);

  let label: string;
  if (days < 0) label = `${Math.abs(days)}d ago`;
  else if (days === 0) label = "Today";
  else label = `${days}d left`;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[urgency]}`}
    >
      {(urgency === "expired" || urgency === "critical") && (
        <svg
          className="w-3 h-3 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 4a1 1 0 011 1v3a1 1 0 11-2 0V7a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z" />
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
        status === "returnable"
          ? "bg-green-50 text-[#16a34a] border border-green-200"
          : "bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]"
      }`}
    >
      {status === "returnable" ? "Returnable" : "Non-Return"}
    </span>
  );
}

const TH =
  "sticky top-0 bg-[#f8fafc] px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap";
const TD = "px-4 py-3 font-medium";

export default function ExpiryTable({
  entries,
  isManager,
  onEditRequest,
  onDeleteRequest,
}: Props) {
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
        <p className="text-sm text-[#64748b]">No expiry entries found.</p>
        <p className="text-xs text-[#94a3b8] mt-1">
          Add one using the + Add button above.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
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
            {isManager && (
              <th className="sticky top-0 bg-[#f8fafc] px-4 py-3 text-right text-xs font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e2e8f0]">
          {entries.map((entry) => {
            const days = getDaysLeft(entry.expiry_date);
            const urgency = getUrgency(days);
            const rowBg =
              urgency === "expired"
                ? "bg-red-50/40"
                : urgency === "critical"
                  ? "bg-orange-50/40"
                  : "";

            return (
              <tr
                key={entry.id}
                className={`hover:bg-[#f0f4ff] transition-colors ${rowBg}`}
              >
                <td className={`${TD} text-[#64748b] whitespace-nowrap`}>
                  {formatDisplayDate(entry.logged_at)}
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
                <td className={`${TD} text-[#64748b] text-xs whitespace-nowrap`}>
                  {entry.uom ?? "—"}
                </td>
                <td className={`${TD} text-[#1e293b] whitespace-nowrap`}>
                  {formatDisplayDate(entry.expiry_date)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <DaysLeftBadge expiryDate={entry.expiry_date} />
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <ReturnBadge status={entry.return_status} />
                </td>
                {isManager && (
                  <td className={`${TD} whitespace-nowrap`}>
                    <div className="flex items-center justify-end gap-1">
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
