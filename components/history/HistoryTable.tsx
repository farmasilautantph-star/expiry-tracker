"use client";

import type { HistoryEntry } from "@/hooks/useHistory";

const ACTION_BADGE: Record<string, { label: string; cls: string }> = {
  CREATE: {
    label: "🟢 Create",
    cls: "bg-green-50 text-[#16a34a] border border-green-200",
  },
  UPDATE: {
    label: "🟡 Update",
    cls: "bg-yellow-50 text-[#ca8a04] border border-yellow-200",
  },
  DELETE: {
    label: "🔴 Delete",
    cls: "bg-red-50 text-[#ef4444] border border-red-200",
  },
};

const MODULE_BADGE: Record<string, string> = {
  expiry: "📋 Expiry",
  offers: "🏪 Offers",
  returns: "🔄 Returns",
  users: "👤 Users",
};

function fmt(ts: string): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  const yr = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${mon}/${yr} ${hh}:${mm}`;
}

function fmtDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface Props {
  entries: HistoryEntry[];
  isLoading: boolean;
  total: number;
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
}

export default function HistoryTable({
  entries,
  isLoading,
  total,
  page,
  totalPages,
  setPage,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#64748b] bg-white rounded-2xl border border-[#e2e8f0] shadow-sm">
        <svg
          className="w-5 h-5 mr-2 animate-spin"
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
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
        Loading history…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#64748b] gap-2 bg-white rounded-2xl border border-[#e2e8f0] shadow-sm">
        <svg
          className="w-10 h-10 text-[#cbd5e1]"
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
        <span className="text-sm">No history entries found</span>
      </div>
    );
  }

  // Group by date
  const groups: { date: string; rows: HistoryEntry[] }[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.date === entry.date) {
      last.rows.push(entry);
    } else {
      groups.push({ date: entry.date, rows: [entry] });
    }
  }

  const start = (page - 1) * 50 + 1;
  const end = Math.min(page * 50, total);

  return (
    <div className="flex flex-col gap-4">
      {/* Row count */}
      <p className="text-xs text-[#64748b]">
        Showing {start}–{end} of {total} {total === 1 ? "entry" : "entries"}
      </p>

      {/* Table */}
      <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-left">
                <th className="px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  PIC
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Module
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {groups.map((g) => (
                <>
                  {/* Date separator */}
                  <tr key={`date-${g.date}`} className="bg-[#f1f5f9]">
                    <td
                      colSpan={5}
                      className="px-4 py-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider"
                    >
                      {fmtDate(g.date)}
                    </td>
                  </tr>
                  {g.rows.map((entry) => {
                    const action = ACTION_BADGE[entry.action] ?? {
                      label: entry.action,
                      cls: "bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]",
                    };
                    const moduleLbl =
                      MODULE_BADGE[entry.module] ?? entry.module;
                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-[#f0f4ff] transition-colors"
                      >
                        <td className="px-4 py-3 text-[#64748b] whitespace-nowrap font-mono text-xs">
                          {fmt(entry.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-[#1e293b] whitespace-nowrap">
                          {entry.pic_name ?? (
                            <span className="text-[#94a3b8]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${action.cls}`}
                          >
                            {action.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#f1f5f9] text-[#1e293b] border border-[#e2e8f0]">
                            {moduleLbl}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#1e293b] max-w-xs">
                          {entry.description ?? (
                            <span className="text-[#94a3b8]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-sm text-[#64748b] hover:text-[#1e3a8a] hover:bg-[#f0f4ff] border border-[#e2e8f0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
            )
            .reduce<(number | "…")[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-2 text-[#94a3b8]">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-[#1e3a8a] text-white"
                      : "text-[#64748b] hover:text-[#1e3a8a] hover:bg-[#f0f4ff] border border-[#e2e8f0]"
                  }`}
                >
                  {p}
                </button>
              ),
            )}

          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg text-sm text-[#64748b] hover:text-[#1e3a8a] hover:bg-[#f0f4ff] border border-[#e2e8f0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
