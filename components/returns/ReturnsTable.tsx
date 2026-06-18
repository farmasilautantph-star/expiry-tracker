"use client";

import { useState } from "react";
import type { ReturnEntry } from "@/hooks/useReturns";
import { CheckIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function Dot({ color }: { color: string }) {
  return (
    <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
  );
}

function StatusBadge({ entry }: { entry: ReturnEntry }) {
  if (entry.return_status === "returned") {
    return (
      <span className="badge" style={{ background: "#dcfce7", color: "#16a34a" }}>
        <Dot color="#16a34a" />
        Returned
      </span>
    );
  }
  if (entry.overdue) {
    return (
      <span className="badge" style={{ background: "#fee2e2", color: "#dc2626" }}>
        <Dot color="#dc2626" />
        Overdue
      </span>
    );
  }
  return (
    <span className="badge" style={{ background: "#fef3c7", color: "#d97706" }}>
      <Dot color="#d97706" />
      Pending
    </span>
  );
}

interface EditDateCellProps {
  entry: ReturnEntry;
  onSave: (id: number, date: string) => Promise<void>;
}

function EditDateCell({ entry, onSave }: EditDateCellProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(entry.return_by_date?.split("T")[0] ?? "");
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-1 group">
        <span className={entry.overdue ? "text-[#ef4444] font-medium" : "text-[#334155]"}>
          {formatDate(entry.return_by_date)}
          {entry.overdue && <span className="ml-1 text-xs text-[#ef4444]">(overdue)</span>}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#94a3b8] hover:text-[#2563eb] transition-all"
          title="Edit return date"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="text-xs px-1.5 py-1 rounded bg-white border border-[#2563eb] text-[#0f172a] focus:outline-none"
        autoFocus
      />
      <button
        onClick={async () => {
          if (!val) return;
          setSaving(true);
          try {
            await onSave(entry.id, val);
            setEditing(false);
          } catch {
            /* keep editing open */
          } finally {
            setSaving(false);
          }
        }}
        disabled={saving}
        className="text-[#16a34a] hover:text-[#15803d] disabled:opacity-50"
        title="Save"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button onClick={() => setEditing(false)} className="text-[#94a3b8] hover:text-[#0f172a]" title="Cancel">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface Props {
  entries: ReturnEntry[];
  isLoading: boolean;
  isManager: boolean;
  onMarkReturned: (id: number) => Promise<void>;
  onUpdateReturnDate: (id: number, date: string) => Promise<void>;
}

const TH =
  "sticky top-0 z-10 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap";
const TD = "px-5 py-3.5 font-medium";

export default function ReturnsTable({
  entries,
  isLoading,
  isManager,
  onMarkReturned,
  onUpdateReturnDate,
}: Props) {
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
        <p className="text-xs text-[#94a3b8] mt-1">Items appear here when logged as Returnable.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
      <p className="px-5 py-2.5 text-xs text-[#64748b] bg-[#f8fafc]" style={{ borderBottom: "1px solid #e2e8f0" }}>
        Showing {entries.length} {entries.length === 1 ? "item" : "items"}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
            <th className={TH}>Return By</th>
            <th className={TH}>Date Logged</th>
            <th className={TH}>PIC</th>
            <th className={TH}>Stock ID</th>
            <th className={TH}>Barcode</th>
            <th className={`${TH} max-w-[200px]`}>Description</th>
            <th className={TH}>Category</th>
            <th className={TH}>UOM</th>
            <th className={TH}>Status</th>
            <th className={`${TH} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="transition-colors duration-150"
              style={{ borderBottom: "1px solid #f1f5f9" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
            >
              <td className={`${TD} whitespace-nowrap`}>
                {isManager ? (
                  <EditDateCell entry={entry} onSave={onUpdateReturnDate} />
                ) : (
                  <span className={entry.overdue ? "text-[#ef4444] font-medium" : "text-[#334155]"}>
                    {formatDate(entry.return_by_date)}
                    {entry.overdue && <span className="ml-1 text-xs">(overdue)</span>}
                  </span>
                )}
              </td>
              <td className={`${TD} text-[#334155] whitespace-nowrap`}>{formatDate(entry.logged_at)}</td>
              <td className={`${TD} whitespace-nowrap`}>
                <span className="badge" style={{ background: "#dbeafe", color: "#2563eb" }}>
                  {entry.pic_name}
                </span>
              </td>
              <td className={`${TD} text-[#334155] font-mono text-xs whitespace-nowrap`}>{entry.stock_id ?? "—"}</td>
              <td className={`${TD} text-[#334155] font-mono text-xs whitespace-nowrap`}>{entry.barcode}</td>
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
              <td className={`${TD} whitespace-nowrap`}>
                <StatusBadge entry={entry} />
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                <div className="flex items-center justify-end">
                  {entry.return_status !== "returned" && (
                    <button
                      onClick={() => onMarkReturned(entry.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{ color: "#16a34a" }}
                      title="Mark as Returned"
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background = "#dcfce7")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background = "")
                      }
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
