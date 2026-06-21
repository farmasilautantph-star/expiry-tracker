"use client";

import { useState } from "react";
import type { ReturnEntry } from "@/hooks/useReturns";
import {
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

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
  if (entry.return_status === "not_approved") {
    return (
      <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
        <Dot color="#991b1b" />
        Not Approved
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
  mode: "active" | "history";
  onMarkReturned: (id: number, notes?: string) => Promise<void>;
  onMarkNotApproved: (id: number, notes?: string) => Promise<void>;
  onUpdateReturnDate: (id: number, date: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

const TH =
  "sticky top-0 z-10 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap";
const TD = "px-5 py-3.5 font-medium";

export default function ReturnsTable({
  entries,
  isLoading,
  isManager,
  mode,
  onMarkReturned,
  onMarkNotApproved,
  onUpdateReturnDate,
  onRefresh,
}: Props) {
  const [confirmEntry, setConfirmEntry] = useState<ReturnEntry | null>(null);
  const [notApprovingEntry, setNotApprovingEntry] = useState<ReturnEntry | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toasts, showSuccess, showError, dismiss } = useToast();

  async function handleConfirmReturn() {
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

  async function handleConfirmNotApproved() {
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
        <p className="text-sm text-[#94a3b8]">
          {mode === "history" ? "No completed returns yet" : "No items found"}
        </p>
        {mode === "active" && (
          <p className="text-xs text-[#94a3b8] mt-1">Items appear here when logged as Returnable.</p>
        )}
      </div>
    );
  }

  // ── History mode (read-only) ──────────────────────────────────────────────
  if (mode === "history") {
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
              <th className={`${TH} max-w-[200px]`}>Description</th>
              <th className={TH}>Barcode</th>
              <th className={TH}>Category</th>
              <th className={TH}>Status</th>
              <th className={TH}>Completed Date</th>
              <th className={TH}>Notes</th>
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
                <td className={`${TD} whitespace-nowrap text-[#334155]`}>{formatDate(entry.return_by_date)}</td>
                <td className={`${TD} text-[#334155] whitespace-nowrap`}>{formatDate(entry.logged_at)}</td>
                <td className={`${TD} whitespace-nowrap`}>
                  <span className="badge" style={{ background: "#dbeafe", color: "#2563eb" }}>{entry.pic_name}</span>
                </td>
                <td className={`${TD} max-w-[200px]`}>
                  <span className="block truncate text-[#334155] font-medium" title={entry.description}>
                    {entry.description}
                  </span>
                </td>
                <td className={`${TD} text-[#334155] font-mono text-xs whitespace-nowrap`}>{entry.barcode}</td>
                <td className={`${TD} text-[#334155] whitespace-nowrap`}>{entry.category}</td>
                <td className={`${TD} whitespace-nowrap`}>
                  <StatusBadge entry={entry} />
                </td>
                <td className={`${TD} whitespace-nowrap text-[#334155]`}>{formatDate(entry.completed_at)}</td>
                <td className={`${TD} max-w-[180px] text-xs text-[#64748b]`}>
                  <span className="block truncate" title={entry.return_notes ?? ""}>{entry.return_notes ?? "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Active mode ───────────────────────────────────────────────────────────
  return (
    <>
      <Toast toasts={toasts} onDismiss={dismiss} />

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
            {entries.map((entry) => {
              const isPending = entry.return_status === "pending";

              return (
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
                    <span className="badge" style={{ background: "#dbeafe", color: "#2563eb" }}>{entry.pic_name}</span>
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
                    <div className="flex items-center justify-end gap-1.5">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => { setConfirmEntry(entry); setActionNotes(""); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                            style={{ background: "#dcfce7", color: "#16a34a" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#bbf7d0")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#dcfce7")}
                            title="Mark as Returned"
                          >
                            <CheckIcon className="w-3 h-3" />
                            Mark Returned
                          </button>
                          <button
                            onClick={() => { setNotApprovingEntry(entry); setActionNotes(""); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                            style={{ background: "#fee2e2", color: "#dc2626" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#fecaca")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#fee2e2")}
                            title="Mark as Not Approved"
                          >
                            <XMarkIcon className="w-3 h-3" />
                            Not Approved
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium"
                          style={{ color: entry.return_status === "returned" ? "#16a34a" : "#991b1b" }}>
                          {entry.return_status === "returned"
                            ? <CheckCircleIcon className="w-3.5 h-3.5" />
                            : <XCircleIcon className="w-3.5 h-3.5" />}
                          {entry.return_status === "returned" ? "Returned" : "Not Approved"}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mark Returned confirm modal */}
      {confirmEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-[#1e293b]">Confirm Return Completed</h3>
              <button onClick={() => setConfirmEntry(null)} className="text-[#94a3b8] hover:text-[#0f172a] transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1 text-sm text-[#64748b]">
              <p className="font-medium text-[#334155]">{confirmEntry.description}</p>
              <p>Barcode: <span className="font-mono text-[#334155]">{confirmEntry.barcode}</span></p>
              {confirmEntry.return_by_date && (
                <p>Return By: <span className="font-medium text-[#334155]">{formatDate(confirmEntry.return_by_date)}</span></p>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wide">Notes (optional)</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                placeholder="Add any return notes..."
                className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-sm text-[#0f172a] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setConfirmEntry(null)} disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleConfirmReturn} disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "#16a34a" }}
                onMouseEnter={(e) => { if (!submitting) (e.currentTarget as HTMLElement).style.background = "#15803d"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#16a34a"; }}
              >
                <CheckIcon className="w-4 h-4" />
                {submitting ? "Saving..." : "Confirm Returned"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Not Approved modal */}
      {notApprovingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-[#1e293b]">Return Not Approved</h3>
              <button onClick={() => setNotApprovingEntry(null)} className="text-[#94a3b8] hover:text-[#0f172a] transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1 text-sm text-[#64748b]">
              <p className="font-medium text-[#334155]">{notApprovingEntry.description}</p>
              <p>Barcode: <span className="font-mono text-[#334155]">{notApprovingEntry.barcode}</span></p>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wide">Reason (optional)</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                placeholder="Reason for rejection..."
                className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-sm text-[#0f172a] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setNotApprovingEntry(null)} disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleConfirmNotApproved} disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "#dc2626" }}
                onMouseEnter={(e) => { if (!submitting) (e.currentTarget as HTMLElement).style.background = "#b91c1c"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#dc2626"; }}
              >
                <XMarkIcon className="w-4 h-4" />
                {submitting ? "Saving..." : "Confirm Not Approved"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
