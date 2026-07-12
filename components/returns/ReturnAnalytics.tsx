"use client";

import { useMemo, type ReactNode } from "react";
import type { ReturnEntry, ReturnCounts } from "@/hooks/useReturns";

interface Props {
  entries: ReturnEntry[]; // open (pending) returns for the current view
  counts: ReturnCounts;
}

const STATUS_SEGMENTS = [
  { key: "pending" as const, label: "Pending", color: "#f59e0b" },
  { key: "overdue" as const, label: "Overdue", color: "#ef4444" },
  { key: "returned" as const, label: "Returned", color: "#22c55e" },
  { key: "not_approved" as const, label: "Not Approved", color: "#f97316" },
];

const AGING_BUCKETS = [
  { key: "1-7" as const, label: "1–7 days late", color: "#fca5a5" },
  { key: "8-14" as const, label: "8–14 days late", color: "#ef4444" },
  { key: "15+" as const, label: "15+ days late", color: "#b91c1c" },
];

function daysLate(returnByDate: string, todayISO: string): number {
  const due = new Date(returnByDate.split("T")[0]);
  const today = new Date(todayISO);
  return Math.round((today.getTime() - due.getTime()) / 86_400_000);
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #f0f4f8",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 1px 2px rgba(15,23,42,.03)",
      }}
    >
      {children}
    </div>
  );
}

function StatusBreakdownCard({ counts }: { counts: ReturnCounts }) {
  const total = counts.total;
  let cumulative = 0;
  const arcs = STATUS_SEGMENTS.map((seg) => {
    const count = counts[seg.key];
    const pct = total > 0 ? (count / total) * 100 : 0;
    const offset = -cumulative;
    cumulative += pct;
    return { ...seg, count, pct, offset };
  });

  return (
    <CardShell>
      <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>
        Return Status Breakdown
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
        Distribution of all {total} active returns
      </div>

      <div className="flex items-center gap-5 mt-5">
        <div className="relative flex-none" style={{ width: 132, height: 132 }}>
          <svg viewBox="0 0 120 120" width={132} height={132} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={60} cy={60} r={52} fill="none" stroke="#f1f5f9" strokeWidth={16} />
            {arcs
              .filter((a) => a.count > 0)
              .map((a) => (
                <circle
                  key={a.key}
                  cx={60}
                  cy={60}
                  r={52}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={16}
                  pathLength={100}
                  strokeDasharray={`${a.pct} ${100 - a.pct}`}
                  strokeDashoffset={a.offset}
                />
              ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>Total Returns</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-[11px] min-w-0">
          {arcs.map((a) => (
            <div key={a.key} className="flex items-center gap-[9px]">
              <span
                className="flex-none"
                style={{ width: 10, height: 10, borderRadius: 3, background: a.color }}
              />
              <span className="flex-1 truncate" style={{ fontSize: 13, color: "#334155" }}>
                {a.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{a.count}</span>
              <span style={{ fontSize: 12, color: "#94a3b8", width: 34, textAlign: "right" }}>
                {Math.round(a.pct)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

function OverdueAgingCard({ entries }: { entries: ReturnEntry[] }) {
  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);

  const buckets = useMemo(() => {
    const counts = { "1-7": 0, "8-14": 0, "15+": 0 };
    for (const e of entries) {
      if (!e.overdue || !e.return_by_date) continue;
      const d = daysLate(e.return_by_date, todayISO);
      if (d >= 15) counts["15+"]++;
      else if (d >= 8) counts["8-14"]++;
      else if (d >= 1) counts["1-7"]++;
    }
    return counts;
  }, [entries, todayISO]);

  const overdueTotal = buckets["1-7"] + buckets["8-14"] + buckets["15+"];
  const max = Math.max(buckets["1-7"], buckets["8-14"], buckets["15+"], 1);

  return (
    <CardShell>
      <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>Overdue Aging</div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
        How long the {overdueTotal} overdue items have slipped
      </div>

      {overdueTotal === 0 ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 100, fontSize: 13, color: "#94a3b8" }}
        >
          No overdue items
        </div>
      ) : (
        <div className="flex flex-col gap-[18px] mt-6">
          {AGING_BUCKETS.map((b) => {
            const count = buckets[b.key];
            const pct = (count / max) * 100;
            return (
              <div key={b.key}>
                <div className="flex justify-between items-baseline mb-[7px]">
                  <span style={{ fontSize: 13, color: "#334155" }}>{b.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{count}</span>
                </div>
                <div style={{ height: 12, borderRadius: 999, background: "#f4f7fb", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: b.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {buckets["15+"] > 0 && (
        <div
          className="flex items-center gap-[7px]"
          style={{ marginTop: 22, paddingTop: 14, borderTop: "1px solid #f0f4f8" }}
        >
          <span className="flex-none" style={{ width: 8, height: 8, borderRadius: 2, background: "#b91c1c" }} />
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {buckets["15+"]} item{buckets["15+"] === 1 ? "" : "s"} over two weeks late — escalate first
          </span>
        </div>
      )}
    </CardShell>
  );
}

function StaffWorkloadCard({ entries }: { entries: ReturnEntry[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, { pending: number; overdue: number }>();
    for (const e of entries) {
      const row = map.get(e.pic_name) ?? { pending: 0, overdue: 0 };
      if (e.overdue) row.overdue++;
      else row.pending++;
      map.set(e.pic_name, row);
    }
    return Array.from(map.entries())
      .map(([name, r]) => ({ name, ...r, total: r.pending + r.overdue }))
      .sort((a, b) => b.total - a.total);
  }, [entries]);

  const maxTotal = Math.max(...rows.map((r) => r.total), 1);

  return (
    <CardShell>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>Return Workload by Staff</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>Open returns assigned per PIC</div>
        </div>
        <div className="flex items-center gap-3 flex-none">
          <span className="flex items-center gap-[5px]" style={{ fontSize: 11, color: "#64748b" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: "#f59e0b" }} />
            Pending
          </span>
          <span className="flex items-center gap-[5px]" style={{ fontSize: 11, color: "#64748b" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: "#ef4444" }} />
            Overdue
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 100, fontSize: 13, color: "#94a3b8" }}
        >
          No open returns
        </div>
      ) : (
        <div className="flex flex-col gap-[15px] mt-[22px]">
          {rows.map((r) => (
            <div key={r.name}>
              <div className="flex justify-between items-baseline mb-[6px]">
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#334155",
                    letterSpacing: ".02em",
                    textTransform: "uppercase",
                  }}
                >
                  {r.name}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{r.total}</span>
              </div>
              <div className="flex" style={{ height: 11, borderRadius: 999, overflow: "hidden", background: "#f4f7fb" }}>
                <div style={{ width: `${(r.pending / maxTotal) * 100}%`, background: "#f59e0b" }} />
                <div style={{ width: `${(r.overdue / maxTotal) * 100}%`, background: "#ef4444" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

export default function ReturnAnalytics({ entries, counts }: Props) {
  const openEntries = useMemo(
    () => entries.filter((e) => e.return_status === "pending"),
    [entries],
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3.5">
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Analytics
        </span>
        <span className="flex-1" style={{ height: 1, background: "#f0f4f8" }} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18,
        }}
      >
        <StatusBreakdownCard counts={counts} />
        <OverdueAgingCard entries={openEntries} />
        <StaffWorkloadCard entries={openEntries} />
      </div>
    </div>
  );
}
