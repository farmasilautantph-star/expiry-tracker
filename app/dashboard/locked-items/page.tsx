"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useShortList } from "@/hooks/useShortList";
import type { ShortListEntry } from "@/hooks/useShortList";
import ItemReviewModal from "@/components/shortlist/ItemReviewModal";
import MobileItemReviewModal from "@/components/mobile/MobileItemReviewModal";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import {
  LockClosedIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysLeftLabel(n: number): string {
  if (n < 0) return "Expired";
  if (n === 0) return "Today";
  if (n <= 30) return `${n}d left`;
  return `${Math.round(n / 30)}mo left`;
}

export default function LockedItemsPage() {
  const { user, isManager } = useAuth();
  const { toasts, showSuccess, dismiss } = useToast();
  const {
    lockedEntries,
    isLoading,
    error,
    refresh,
    patchEntry,
    removeEntry,
  } = useShortList();

  const [search, setSearch] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => { document.title = "Locked Items | Expiry Tracker"; }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobileViewport(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Deep-link: ?review=<id> opens the review popup (used by the lock notification)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("review");
    if (id) {
      const n = parseInt(id, 10);
      if (!isNaN(n)) { setReviewId(n); setReviewOpen(true); }
      window.history.replaceState({}, "", "/dashboard/locked-items");
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lockedEntries;
    return lockedEntries.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.barcode.toLowerCase().includes(q) ||
        (e.stock_id ?? "").toLowerCase().includes(q),
    );
  }, [lockedEntries, search]);

  if (!user) return null;

  function openReview(id: number) {
    setReviewId(id);
    setReviewOpen(true);
  }

  const modalProps = {
    isOpen: reviewOpen,
    onClose: () => setReviewOpen(false),
    entryId: reviewId,
    onUpdated: () => {},
    onToast: showSuccess,
    onPatchEntry: patchEntry,
    onDeleted: removeEntry,
    onRemoveEntry: removeEntry,
  };

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismiss} />

      {isMobileViewport ? (
        <MobileItemReviewModal {...modalProps} />
      ) : (
        <ItemReviewModal {...modalProps} />
      )}

      <div className="space-y-5 p-4 md:p-0">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-[#1e293b]">Locked Items</h2>
          <p className="text-sm text-[#64748b] mt-0.5">
            Near-expiry items automatically removed from sale
          </p>
        </div>

        {/* Banner */}
        <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-[#b91c1c] mb-0.5">
            <LockClosedIcon className="w-4 h-4" />
            Locked Items ({lockedEntries.length})
          </div>
          <div className="text-xs text-[#b91c1c]/80">
            Near-expiry items removed from sale. Physically separate these from sellable
            stock.
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, barcode, stock ID…"
            className="w-full h-10 pl-9 pr-3 rounded-xl text-sm text-[#334155] bg-white outline-none focus:ring-2 focus:ring-[#2563eb]/20"
            style={{ border: "1px solid #e2e8f0" }}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-4 py-3.5 border-b border-[#f1f5f9] animate-pulse">
                <div className="flex gap-4">
                  <div className="h-4 w-24 bg-[#f1f5f9] rounded" />
                  <div className="h-4 flex-1 bg-[#f1f5f9] rounded" />
                  <div className="h-4 w-16 bg-[#f1f5f9] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm flex flex-col items-center justify-center py-16 text-center">
            <DocumentTextIcon className="w-12 h-12 text-[#cbd5e1] mb-3" />
            <p className="text-sm text-[#94a3b8]">
              {lockedEntries.length === 0
                ? "No locked items. Near-expiry stock will appear here automatically."
                : "No locked items match your search."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-2.5">
              {filtered.map((entry) => (
                <LockedCard key={entry.id} entry={entry} onClick={() => openReview(entry.id)} />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    {["Description", "Barcode", "PIC", "Category", "Qty", "Expiry", "Days Left", "Locked Since"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-[#64748b]"
                          style={{ background: "#f8fafc" }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => openReview(entry.id)}
                      className="transition-colors hover:bg-[#f8fafc]"
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                    >
                      <td className="px-4 py-3 max-w-[220px]">
                        <span
                          className="text-sm font-medium text-[#334155]"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                          title={entry.description}
                        >
                          {entry.description}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#334155] whitespace-nowrap">
                        {entry.barcode}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="badge" style={{ background: "#dbeafe", color: "#2563eb" }}>
                          {entry.pic_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#334155] whitespace-nowrap">
                        {entry.category}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#334155] whitespace-nowrap">
                        {entry.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#334155] whitespace-nowrap">
                        {fmtDate(entry.expiry_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="badge"
                          style={{
                            background: entry.days_left < 0 ? "#fee2e2" : "#ffedd5",
                            color: entry.days_left < 0 ? "#dc2626" : "#ea580c",
                            fontWeight: 600,
                          }}
                        >
                          {daysLeftLabel(entry.days_left)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#64748b] whitespace-nowrap">
                        {fmtDateTime(entry.locked_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function LockedCard({ entry, onClick }: { entry: ShortListEntry; onClick: () => void }) {
  const initial = (entry.pic_name?.charAt(0) ?? "?").toUpperCase();
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl px-4 py-3.5 cursor-pointer active:bg-[#f8fafc]"
      style={{ border: "1px solid #eef1f6", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md text-[#64748b] truncate max-w-[160px]"
          style={{ background: "#f1f5f9" }}
        >
          {entry.category}
        </span>
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#1d4ed8" }}>
            <span className="text-[8px] font-extrabold text-white">{initial}</span>
          </div>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap"
            style={{ color: "#1d4ed8", background: "#eef3fa" }}
          >
            {entry.pic_name}
          </span>
        </div>
      </div>
      <p
        className="text-sm font-bold text-[#0f172a] leading-[1.35] mb-2.5"
        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {entry.description}
      </p>
      <div className="flex items-center gap-2 flex-wrap text-[12px] text-[#64748b]">
        <span className="font-mono text-[11px]">{entry.barcode}</span>
        <span>·</span>
        <span>Qty {entry.quantity}</span>
        <span>·</span>
        <span>Exp {fmtDate(entry.expiry_date)}</span>
        <span
          className="badge ml-auto"
          style={{
            background: entry.days_left < 0 ? "#fee2e2" : "#ffedd5",
            color: entry.days_left < 0 ? "#dc2626" : "#ea580c",
            fontWeight: 600,
          }}
        >
          {daysLeftLabel(entry.days_left)}
        </span>
      </div>
      <p className="text-[11px] text-[#94a3b8] mt-1.5">Locked since {fmtDateTime(entry.locked_at)}</p>
    </div>
  );
}
