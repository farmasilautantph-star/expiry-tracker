"use client";

import { useState } from "react";
import type { ReturnEntry } from "@/hooks/useReturns";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function StatusBadge({ entry }: { entry: ReturnEntry }) {
  if (entry.return_status === "returned") {
    return (
      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-[#16a34a] border border-green-200">
        ✅ Returned
      </span>
    );
  }
  if (entry.overdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-[#ef4444] border border-red-200">
        🔴 Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-[#ca8a04] border border-yellow-200">
      🟡 Pending
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
        <span
          className={
            entry.overdue ? "text-[#ef4444] font-medium" : "text-[#1e293b]"
          }
        >
          {formatDate(entry.return_by_date)}
          {entry.overdue && (
            <span className="ml-1 text-xs text-[#ef4444]">(overdue)</span>
          )}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#94a3b8] hover:text-[#1e3a8a] transition-all"
          title="Edit return date"
        >
          <svg
            className="w-3 h-3"
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
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="text-xs px-1.5 py-1 rounded bg-white border border-[#3b82f6] text-[#1e293b] focus:outline-none"
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
            d="M5 13l4 4L19 7"
          />
        </svg>
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-[#94a3b8] hover:text-[#1e293b]"
        title="Cancel"
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
            d="M6 18L18 6M6 6l12 12"
          />
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
  "sticky top-0 z-10 bg-[#f8fafc] px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap border-b border-[#e2e8f0]";
const TD = "px-4 py-3 font-medium";

export default function ReturnsTable({
  entries,
  isLoading,
  isManager,
  onMarkReturned,
  onUpdateReturnDate,
}: Props) {
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
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
        <p className="text-sm text-[#64748b]">
          No returns found for this period.
        </p>
        <p className="text-xs text-[#94a3b8] mt-1">
          Items appear here when logged as Returnable in Log New Expiry.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
      <p className="px-4 py-2.5 text-xs text-[#64748b] bg-[#f8fafc] border-b border-[#e2e8f0]">
        Showing {entries.length} {entries.length === 1 ? "item" : "items"}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f8fafc]">
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
        <tbody className="divide-y divide-[#e2e8f0]">
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className={`hover:bg-[#f0f4ff] transition-colors ${entry.overdue ? "bg-red-50/40" : ""}`}
            >
              <td className={`${TD} whitespace-nowrap`}>
                {isManager ? (
                  <EditDateCell entry={entry} onSave={onUpdateReturnDate} />
                ) : (
                  <span
                    className={
                      entry.overdue
                        ? "text-[#ef4444] font-medium"
                        : "text-[#1e293b]"
                    }
                  >
                    {formatDate(entry.return_by_date)}
                    {entry.overdue && (
                      <span className="ml-1 text-xs">(overdue)</span>
                    )}
                  </span>
                )}
              </td>
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
                    entry.description + (entry.notes ? ` — ${entry.notes}` : "")
                  }
                >
                  {entry.overdue && (
                    <svg
                      className="inline w-3.5 h-3.5 text-[#ef4444] mr-1 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                  )}
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
              <td className={`${TD} whitespace-nowrap`}>
                <StatusBadge entry={entry} />
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                <div className="flex items-center justify-end">
                  {entry.return_status !== "returned" && (
                    <button
                      onClick={() => onMarkReturned(entry.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[#16a34a] hover:text-white hover:bg-[#16a34a] border border-green-200 hover:border-[#16a34a] transition-colors"
                      title="Mark as Returned"
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Mark Returned
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
