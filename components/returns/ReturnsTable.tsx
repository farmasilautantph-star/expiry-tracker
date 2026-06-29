"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReturnEntry } from "@/hooks/useReturns";
import {
  DocumentTextIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function StatusBadge({ entry }: { entry: ReturnEntry }) {
  if (entry.return_status === "returned") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{ background: "#dcfce7", color: "#16a34a" }}>
        Returned
      </span>
    );
  }
  if (entry.return_status === "not_approved") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{ background: "#ffedd5", color: "#ea580c" }}>
        Not Approved
      </span>
    );
  }
  if (entry.overdue) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{ background: "#fee2e2", color: "#dc2626" }}>
        Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: "#fef3c7", color: "#d97706" }}>
      Pending
    </span>
  );
}

function MobileStatusPill({ entry }: { entry: ReturnEntry }) {
  let bg = "#fffbeb", border = "#fde68a", color = "#b45309", label = "Pending";
  if (entry.return_status === "returned") {
    bg = "#eff6ff"; border = "#bfdbfe"; color = "#1d4ed8"; label = "Returned";
  } else if (entry.return_status === "not_approved") {
    bg = "#ffedd5"; border = "#fed7aa"; color = "#c2410c"; label = "Not Approved";
  } else if (entry.overdue) {
    bg = "#fee2e2"; border = "#fecaca"; color = "#b91c1c"; label = "Overdue";
  }
  return (
    <span
      className="text-[11.5px] font-bold px-2.5 py-[3px] rounded-full"
      style={{ background: bg, border: `1.5px solid ${border}`, color }}
    >
      {label}
    </span>
  );
}

interface EditDateCellProps {
  entry: ReturnEntry;
  onSave: (id: number, date: string) => Promise<void>;
  alwaysShowEdit?: boolean;
}

function EditDateCell({ entry, onSave, alwaysShowEdit = false }: EditDateCellProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(entry.return_by_date?.split("T")[0] ?? "");
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-1 group">
        <span className={entry.overdue ? "text-[#ef4444] font-medium" : "text-[#334155]"}>
          {formatShortDate(entry.return_by_date)}
        </span>
        <button
          onClick={() => setEditing(true)}
          className={`${alwaysShowEdit ? "opacity-100" : "opacity-0 group-hover:opacity-100"} p-0.5 rounded text-[#94a3b8] hover:text-[#2563eb] transition-all`}
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
  "sticky top-0 z-10 bg-[#f8fafc] px-4 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap";
const TD = "px-4 py-3";

export default function ReturnsTable({
  entries,
  isLoading,
  isManager,
  mode,
  onMarkReturned,
  onMarkNotApproved,
  onUpdateReturnDate,
}: Props) {
  const router = useRouter();
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
          <div key={i} className="px-4 py-4 border-b border-[#f1f5f9] animate-pulse">
            <div className="flex gap-4">
              <div className="h-4 w-40 bg-[#f1f5f9] rounded" />
              <div className="h-4 w-24 bg-[#f1f5f9] rounded" />
              <div className="h-4 w-16 bg-[#f1f5f9] rounded" />
              <div className="h-4 w-20 bg-[#f1f5f9] rounded" />
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
        <p className="text-sm font-medium text-[#94a3b8]">
          {mode === "history" ? "No completed returns yet" : "No active return items"}
        </p>
        {mode === "active" && (
          <p className="text-xs text-[#94a3b8] mt-1">Items appear here when logged as Returnable.</p>
        )}
      </div>
    );
  }

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* Mobile card list — below md */}
      <div className="md:hidden flex flex-col gap-2.5">
        {entries.map((entry) => {
          const isPending = entry.return_status === "pending";
          const headerDate = mode === "active"
            ? (entry.return_by_date ? `Due: ${formatShortDate(entry.return_by_date)}` : "")
            : (entry.completed_at ? formatShortDate(entry.completed_at) : "");
          const metaParts = [
            entry.uom ? `UOM: ${entry.uom}` : null,
            `Exp: ${formatShortDate(entry.expiry_date)}`,
            `PIC: ${entry.pic_name}`,
          ].filter(Boolean);

          return (
            <div
              key={entry.id}
              className="bg-white p-4"
              style={{
                borderRadius: 18,
                border: "1px solid #eef1f6",
                boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
                opacity: mode === "history" ? 0.78 : 1,
              }}
            >
              {/* Header: status pill + date */}
              <div className="flex items-center justify-between mb-2.5">
                <MobileStatusPill entry={entry} />
                {headerDate && (
                  <span className="text-[11px] font-medium text-[#94a3b8]">
                    {headerDate}
                  </span>
                )}
              </div>

              {/* Name */}
              <p
                className="text-[13.5px] font-bold text-[#0f172a] leading-[1.3] mb-1.5"
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                title={entry.description}
              >
                {entry.description}
              </p>

              {/* Meta */}
              <p className="text-xs text-[#64748b] mb-3 leading-[1.45]">
                {metaParts.join(" · ")}
              </p>

              {/* Active + Pending: action buttons */}
              {mode === "active" && isPending && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setConfirmEntry(entry); setActionNotes(""); }}
                    className="flex-1 h-11 rounded-xl text-[13px] font-bold text-white"
                    style={{ background: "#1d4ed8", border: "none" }}
                  >
                    Mark Returned
                  </button>
                  <button
                    onClick={() => { setNotApprovingEntry(entry); setActionNotes(""); }}
                    className="flex-1 h-11 rounded-xl text-[13px] font-bold"
                    style={{ background: "#fef2f2", color: "#b91c1c", border: "1.5px solid #fecaca" }}
                  >
                    Not Approved
                  </button>
                </div>
              )}

              {/* History: view link */}
              {mode === "history" && (
                <button
                  onClick={() => router.push(`/dashboard/shortlist?review=${entry.id}`)}
                  className="text-xs font-bold mt-1"
                  style={{ color: "#1d4ed8" }}
                >
                  View Details →
                </button>
              )}

              {/* Manager edit-return-date (active mode) */}
              {mode === "active" && isManager && (
                <div className="mt-2.5 pt-2.5 border-t flex items-center justify-between" style={{ borderColor: "#f1f5f9" }}>
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Return By
                  </span>
                  <EditDateCell entry={entry} onSave={onUpdateReturnDate} alwaysShowEdit />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table — md and up */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        {/* Row count */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#f8fafc]"
          style={{ borderBottom: "1px solid #e2e8f0" }}>
          <span className="text-xs text-[#94a3b8]">
            {entries.length} {entries.length === 1 ? "item" : "items"}
          </span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <th className={`${TH} min-w-[180px]`}>Item</th>
              <th className={TH}>Barcode</th>
              <th className={TH}>Category</th>
              {mode === "active" && isManager && <th className={TH}>Return By</th>}
              <th className={TH}>Logged</th>
              <th className={TH}>Status</th>
              <th className={TH}>Return Date</th>
              <th className={`${TH} text-right`}>Action</th>
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
                  {/* ITEM */}
                  <td className={`${TD} min-w-[180px]`}>
                    <p className="text-sm font-semibold text-[#0f172a] leading-snug"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      title={entry.description}>
                      {entry.description}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-[#94a3b8] mt-0.5 truncate" title={entry.notes}>
                        {entry.notes}
                      </p>
                    )}
                  </td>

                  {/* BARCODE */}
                  <td className={`${TD} font-mono text-xs text-[#334155] whitespace-nowrap`}>
                    {entry.barcode}
                  </td>

                  {/* CATEGORY */}
                  <td className={`${TD} text-xs text-[#475569] whitespace-nowrap`}>
                    {entry.category}
                  </td>

                  {/* RETURN BY — active manager only */}
                  {mode === "active" && isManager && (
                    <td className={`${TD} whitespace-nowrap`}>
                      <EditDateCell entry={entry} onSave={onUpdateReturnDate} />
                    </td>
                  )}

                  {/* LOGGED */}
                  <td className={`${TD} text-xs text-[#475569] whitespace-nowrap`}>
                    {formatShortDate(entry.logged_at)}
                  </td>

                  {/* STATUS */}
                  <td className={`${TD} whitespace-nowrap`}>
                    <StatusBadge entry={entry} />
                  </td>

                  {/* RETURN DATE */}
                  <td className={`${TD} text-xs text-[#475569] whitespace-nowrap`}>
                    {formatShortDate(mode === "active" ? entry.return_by_date : entry.completed_at)}
                  </td>

                  {/* ACTION */}
                  <td className={`${TD} whitespace-nowrap text-right`}>
                    {mode === "history" ? (
                      <button
                        onClick={() => router.push(`/dashboard/shortlist?review=${entry.id}`)}
                        className="text-xs font-semibold transition-colors"
                        style={{ color: "#2563eb" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#1d4ed8")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#2563eb")}
                      >
                        View →
                      </button>
                    ) : isPending ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setConfirmEntry(entry); setActionNotes(""); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                          style={{ background: "#dcfce7", color: "#16a34a" }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#bbf7d0")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#dcfce7")}
                        >
                          <CheckIcon className="w-3 h-3" />
                          Returned
                        </button>
                        <button
                          onClick={() => { setNotApprovingEntry(entry); setActionNotes(""); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                          style={{ background: "#ffedd5", color: "#ea580c" }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#fed7aa")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#ffedd5")}
                        >
                          <XMarkIcon className="w-3 h-3" />
                          Not Approved
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#94a3b8]">—</span>
                    )}
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
                <p>Return By: <span className="font-medium text-[#334155]">{formatShortDate(confirmEntry.return_by_date)}</span></p>
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
                style={{ background: "#ea580c" }}
                onMouseEnter={(e) => { if (!submitting) (e.currentTarget as HTMLElement).style.background = "#c2410c"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#ea580c"; }}
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
