"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { OfferEntry } from "@/hooks/useOffers";

interface Props {
  entries: OfferEntry[]; // all offers (any status) — powers the full breakdown
}

type Outcome = "received" | "rejected" | "pending";

const OUTCOME_DEFS: { key: Outcome; label: string; color: string; tint: string }[] = [
  { key: "received", label: "Received", color: "#16a34a", tint: "#f0fdf4" },
  { key: "rejected", label: "Rejected", color: "#dc2626", tint: "#fef2f2" },
  { key: "pending", label: "Pending", color: "#d97706", tint: "#fffbeb" },
];

function classifyOutcome(status: OfferEntry["offer_status"]): Outcome {
  if (status === "rejected") return "rejected";
  if (status === "offered") return "pending";
  return "received"; // accepted or completed — outlet kept the item
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #f0f4f8", borderRadius: 18, padding: 20 }}>
      {children}
    </div>
  );
}

function CardHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h3 style={{ margin: "0 0 3px", fontSize: 16, fontWeight: 600 }}>{title}</h3>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>{subtitle}</p>
    </>
  );
}

function EmptyCard() {
  return (
    <div className="flex items-center justify-center" style={{ height: 100, fontSize: 13, color: "#94a3b8" }}>
      No offers yet
    </div>
  );
}

function OutcomeDonutCard({ entries }: { entries: OfferEntry[] }) {
  const total = entries.length;
  const counts = useMemo(() => {
    const c: Record<Outcome, number> = { received: 0, rejected: 0, pending: 0 };
    for (const e of entries) c[classifyOutcome(e.offer_status)]++;
    return c;
  }, [entries]);

  const R = 62, SW = 20, size = 168, c = size / 2, gap = 3;
  const circ = 2 * Math.PI * R;
  let acc = 0;
  const segs = OUTCOME_DEFS.map((o) => {
    const v = counts[o.key];
    const frac = total > 0 ? v / total : 0;
    const len = frac * circ;
    const off = -acc;
    acc += len;
    return { ...o, v, len, off };
  });

  return (
    <CardShell>
      <CardHeading title="Offer Outcome Breakdown" subtitle="How outlets responded to items offered" />

      {total === 0 ? (
        <EmptyCard />
      ) : (
        <>
          <div className="flex items-center justify-center" style={{ marginBottom: 18 }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle cx={c} cy={c} r={R} fill="none" stroke="#f4f7fb" strokeWidth={SW} />
              {segs
                .filter((s) => s.v > 0)
                .map((s) => (
                  <circle
                    key={s.key}
                    cx={c}
                    cy={c}
                    r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={SW}
                    strokeDasharray={`${Math.max(s.len - gap, 0)} ${circ}`}
                    strokeDashoffset={s.off}
                    strokeLinecap="round"
                    style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                  />
                ))}
              <text x={c} y={c - 4} textAnchor="middle" fontSize={40} fontWeight={700} fill="#0f172a">
                {total}
              </text>
              <text x={c} y={c + 20} textAnchor="middle" fontSize={12.5} fontWeight={500} fill="#64748b">
                Total Offers
              </text>
            </svg>
          </div>

          <div className="flex flex-col" style={{ gap: 2 }}>
            {segs.map((s) => {
              const pct = total > 0 ? Math.round((s.v / total) * 100) : 0;
              return (
                <div
                  key={s.key}
                  className="flex items-center"
                  style={{ gap: 10, padding: "9px 10px", borderRadius: 10, background: s.tint }}
                >
                  <span className="flex-none" style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                  <span className="flex-1" style={{ fontSize: 13.5, fontWeight: 500, color: "#0f172a" }}>{s.label}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{s.v}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: s.color, width: 40, textAlign: "right" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </CardShell>
  );
}

interface OutletRow {
  code: string;
  pct: number;
  detail: string;
  width: number;
  color: string;
}

function RejectionRateCard({ entries }: { entries: OfferEntry[] }) {
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo<OutletRow[]>(() => {
    const map = new Map<string, { rej: number; tot: number }>();
    for (const e of entries) {
      const row = map.get(e.outlet_name) ?? { rej: 0, tot: 0 };
      row.tot++;
      if (e.offer_status === "rejected") row.rej++;
      map.set(e.outlet_name, row);
    }
    const withPct = Array.from(map.entries())
      .filter(([, r]) => r.tot > 0)
      .map(([code, r]) => ({ code, rej: r.rej, tot: r.tot, p: (r.rej / r.tot) * 100 }))
      .sort((a, b) => b.p - a.p);
    const maxP = Math.max(...withPct.map((o) => o.p), 1);
    const redFor = (p: number) => {
      const t = p / maxP;
      const light = 92 - t * 47;
      const sat = 55 + t * 20;
      return `hsl(0, ${sat}%, ${light}%)`;
    };
    return withPct.map((o) => ({
      code: o.code,
      pct: Math.round(o.p),
      detail: `${o.rej} of ${o.tot}`,
      width: Math.max((o.p / maxP) * 100, o.p > 0 ? 6 : 3),
      color: o.p === 0 ? "#e2e8f0" : redFor(o.p),
    }));
  }, [entries]);

  const visible = expanded ? rows : rows.slice(0, 5);

  return (
    <CardShell>
      <CardHeading title="Rejection Rate by Outlet" subtitle="Share of offers each outlet declined, highest first" />

      {rows.length === 0 ? (
        <EmptyCard />
      ) : (
        <>
          <div className="flex flex-col" style={{ gap: 13 }}>
            {visible.map((row) => (
              <div key={row.code}>
                <div className="flex items-baseline justify-between" style={{ marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{row.code}</span>
                  <span style={{ fontSize: 12.5, color: "#64748b" }}>
                    <b style={{ color: "#0f172a" }}>{row.pct}%</b>&nbsp;({row.detail})
                  </span>
                </div>
                <div style={{ height: 9, background: "#f4f7fb", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${row.width}%`, background: row.color, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>

          {rows.length > 5 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{
                marginTop: 14,
                fontSize: 12.5,
                fontWeight: 600,
                color: "#2563eb",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {expanded ? "Show less" : `View all ${rows.length} outlets →`}
            </button>
          )}
        </>
      )}
    </CardShell>
  );
}

function CategoryVolumeCard({ entries }: { entries: OfferEntry[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const label = e.category ?? "Uncategorized";
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  const maxC = Math.max(...rows.map((r) => r.count), 1);

  return (
    <CardShell>
      <CardHeading title="Category Offer Volume" subtitle="Number of offers made per product category" />

      {rows.length === 0 ? (
        <EmptyCard />
      ) : (
        <div className="flex flex-col" style={{ gap: 15 }}>
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "#0f172a", letterSpacing: ".01em" }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>{r.count}</span>
              </div>
              <div style={{ height: 10, background: "#f4f7fb", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(r.count / maxC) * 100}%`, background: "#1d4ed8", borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

export default function OfferAnalytics({ entries }: Props) {
  const total = entries.length;

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="flex items-baseline" style={{ gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>Offer Analytics</h2>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>Performance across {total} offers</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 18,
        }}
      >
        <OutcomeDonutCard entries={entries} />
        <RejectionRateCard entries={entries} />
        <CategoryVolumeCard entries={entries} />
      </div>
    </div>
  );
}
