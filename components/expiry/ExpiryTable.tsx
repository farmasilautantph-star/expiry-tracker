"use client";

import { ExpiryEntry } from "@/hooks/useExpiry";
import {
  PencilSquareIcon,
  TrashIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

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
  if (days < 90) return "critical";
  if (days <= 240) return "warning";
  return "safe";
}

const BADGE_STYLE: Record<Urgency, { bg: string; color: string; dotColor: string; fontWeight: number }> = {
  expired:  { bg: "#fee2e2", color: "#dc2626", dotColor: "#dc2626", fontWeight: 600 },
  critical: { bg: "#ffedd5", color: "#ea580c", dotColor: "#ea580c", fontWeight: 600 },
  warning:  { bg: "#fef9c3", color: "#ca8a04", dotColor: "#ca8a04", fontWeight: 600 },
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

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function DaysLeftBadge({ expiryDate }: { expiryDate: string }) {
  const days = getDaysLeft(expiryDate);
  const urgency = getUrgency(days);
  const style = BADGE_STYLE[urgency];

  let label: string;
  if (days < 0) label = "Expired";
  else if (days === 0) label = "Today";
  else if (days <= 30) label = `${days}d left`;
  else label = `${Math.round(days / 30)}m left`;

  return (
    <span className="badge" style={{ background: style.bg, color: style.color, fontWeight: style.fontWeight }}>
      <Dot color={style.dotColor} />
      {label}
    </span>
  );
}

function ReturnBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[#cbd5e1] text-xs">—</span>;
  const isPending = status === "returnable";
  return (
    <span
      className="badge"
      style={{
        background: isPending ? "#dcfce7" : "#f1f5f9",
        color: isPending ? "#16a34a" : "#64748b",
      }}
    >
      <Dot color={isPending ? "#16a34a" : "#94a3b8"} />
      {isPending ? "Returnable" : "Non-Return"}
    </span>
  );
}

const TH =
  "sticky top-0 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap";
const TD = "px-5 py-3.5 font-medium";

export default function ExpiryTable({
  entries,
  isManager,
  onEditRequest,
  onDeleteRequest,
}: Props) {
  if (entries.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm flex flex-col items-center justify-center py-16 text-center">
        <DocumentTextIcon className="w-12 h-12 text-[#cbd5e1] mb-3" />
        <p className="text-sm text-[#94a3b8]">No items found</p>
      </div>
    );
  }

  return (
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
            <th className={TH}>Expiry Date</th>
            <th className={TH}>Days Left</th>
            <th className={TH}>Return</th>
            {isManager && (
              <th className="sticky top-0 bg-[#f8fafc] px-5 py-3 text-right text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const days = getDaysLeft(entry.expiry_date);
            const urgency = getUrgency(days);

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
                  {formatDisplayDate(entry.logged_at)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <span className="badge" style={{ background: "#dbeafe", color: "#2563eb" }}>
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
                <td className={`${TD} text-[#334155] whitespace-nowrap`}>{entry.category}</td>
                <td className={`${TD} text-[#334155] text-xs whitespace-nowrap`}>{entry.uom ?? "—"}</td>
                <td className={`${TD} text-[#334155] whitespace-nowrap`}>
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
  );
}
