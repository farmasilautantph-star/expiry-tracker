"use client";

import type { HistoryEntry } from "@/hooks/useHistory";

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

const ACTION_BADGE: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  CREATE: { label: "Create",  bg: "#dcfce7", color: "#16a34a", dot: "#16a34a" },
  UPDATE: { label: "Update",  bg: "#fef3c7", color: "#d97706", dot: "#d97706" },
  DELETE: { label: "Delete",  bg: "#fee2e2", color: "#dc2626", dot: "#dc2626" },
};

const MODULE_LABEL: Record<string, string> = {
  expiry:  "Expiry",
  offers:  "Offers",
  returns: "Returns",
  users:   "Users",
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
        <svg className="w-12 h-12 text-[#cbd5e1] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm text-[#94a3b8]">No history entries found</p>
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
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                <th className="sticky top-0 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap">
                  Timestamp
                </th>
                <th className="sticky top-0 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em]">
                  PIC
                </th>
                <th className="sticky top-0 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em]">
                  Action
                </th>
                <th className="sticky top-0 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em]">
                  Module
                </th>
                <th className="sticky top-0 bg-[#f8fafc] px-5 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em]">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <>
                  {/* Date separator */}
                  <tr key={`date-${g.date}`} style={{ background: "#f1f5f9" }}>
                    <td
                      colSpan={5}
                      className="px-5 py-2 text-[11px] font-semibold text-[#64748b] uppercase tracking-wider"
                    >
                      {fmtDate(g.date)}
                    </td>
                  </tr>
                  {g.rows.map((entry) => {
                    const action = ACTION_BADGE[entry.action] ?? {
                      label: entry.action,
                      bg: "#f1f5f9",
                      color: "#64748b",
                      dot: "#94a3b8",
                    };
                    const moduleLbl = MODULE_LABEL[entry.module] ?? entry.module;
                    return (
                      <tr
                        key={entry.id}
                        className="transition-colors duration-150"
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                      >
                        <td className="px-5 py-3.5 text-[#64748b] whitespace-nowrap font-mono text-xs font-medium">
                          {fmt(entry.timestamp)}
                        </td>
                        <td className="px-5 py-3.5 text-[#334155] font-medium whitespace-nowrap">
                          {entry.pic_name ?? <span className="text-[#94a3b8]">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="badge"
                            style={{ background: action.bg, color: action.color }}
                          >
                            <Dot color={action.dot} />
                            {action.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                            style={{ background: "#f1f5f9", color: "#475569" }}
                          >
                            {moduleLbl}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[#334155] font-medium max-w-xs">
                          {entry.description ?? <span className="text-[#94a3b8]">—</span>}
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
            className="px-3 py-1.5 rounded-lg text-sm text-[#64748b] hover:text-[#2563eb] hover:bg-[#eff6ff] border border-[#e2e8f0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                      ? "bg-[#2563eb] text-white"
                      : "text-[#64748b] hover:text-[#2563eb] hover:bg-[#eff6ff] border border-[#e2e8f0]"
                  }`}
                >
                  {p}
                </button>
              ),
            )}

          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg text-sm text-[#64748b] hover:text-[#2563eb] hover:bg-[#eff6ff] border border-[#e2e8f0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
