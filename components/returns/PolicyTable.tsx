"use client";

import { useState } from "react";
import type { ReturnPolicy } from "@/hooks/useReturnPolicies";
import {
  LinkIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

interface Props {
  policies: ReturnPolicy[];
  isLoading: boolean;
}

const TH =
  "sticky top-0 z-10 bg-[#f8fafc] px-4 py-3 text-left text-[11px] uppercase font-semibold text-[#64748b] tracking-[0.08em] whitespace-nowrap";
const TD = "px-4 py-3 align-top";

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / day);
  if (days < 0) {
    const futureDays = Math.abs(days);
    if (futureDays < 30) return `in ${futureDays}d`;
    const futureMo = Math.floor(futureDays / 30);
    if (futureMo < 12) return `in ${futureMo}mo`;
    return `in ${Math.floor(futureMo / 12)}y`;
  }
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function ReturnTypeBadge({ type }: { type: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    RETURNABLE:     { bg: "#dcfce7", color: "#16a34a", label: "Returnable" },
    EXCHANGEABLE:   { bg: "#dbeafe", color: "#2563eb", label: "Exchangeable" },
    NON_RETURNABLE: { bg: "#fee2e2", color: "#dc2626", label: "Non-Returnable" },
    UNKNOWN:        { bg: "#f1f5f9", color: "#64748b", label: "Unknown" },
  };
  const cfg = map[type] ?? map.UNKNOWN;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function SupplierIdBadge({ id }: { id: string }) {
  // Deterministic colour from supplier id
  const palette = [
    { bg: "#dbeafe", color: "#2563eb" },
    { bg: "#dcfce7", color: "#16a34a" },
    { bg: "#fef3c7", color: "#d97706" },
    { bg: "#fee2e2", color: "#dc2626" },
    { bg: "#ffedd5", color: "#ea580c" },
    { bg: "#f3e8ff", color: "#9333ea" },
    { bg: "#cffafe", color: "#0891b2" },
    { bg: "#fce7f3", color: "#db2777" },
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const cfg = palette[hash % palette.length];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {id}
    </span>
  );
}

export default function PolicyTable({ policies, isLoading }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-4 border-b border-[#f1f5f9] animate-pulse">
            <div className="flex gap-4">
              <div className="h-4 w-48 bg-[#f1f5f9] rounded" />
              <div className="h-4 w-32 bg-[#f1f5f9] rounded" />
              <div className="h-4 w-24 bg-[#f1f5f9] rounded" />
              <div className="h-4 w-16 bg-[#f1f5f9] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm flex flex-col items-center justify-center py-16 text-center">
        <DocumentTextIcon className="w-12 h-12 text-[#cbd5e1] mb-3" />
        <p className="text-sm font-medium text-[#94a3b8]">No policies found</p>
        <p className="text-xs text-[#94a3b8] mt-1">Try adjusting your search or filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-[#f8fafc]"
        style={{ borderBottom: "1px solid #e2e8f0" }}
      >
        <span className="text-xs text-[#94a3b8]">
          {policies.length} {policies.length === 1 ? "policy" : "policies"}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
            <th className={`${TH} min-w-[220px]`}>Supplier</th>
            <th className={`${TH} min-w-[160px]`}>Brand</th>
            <th className={TH}>Return Type</th>
            <th className={TH}>Months</th>
            <th className={`${TH} min-w-[200px]`}>Conditions</th>
            <th className={`${TH} whitespace-nowrap`}>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((p) => {
            const isExpanded = expanded.has(p.id);
            const cond = p.special_conditions ?? "";
            const condShort = cond.length > 80 ? cond.slice(0, 80).trimEnd() + "…" : cond;
            return (
              <tr
                key={p.id}
                className="transition-colors duration-150"
                style={{
                  borderBottom: "1px solid #f1f5f9",
                  borderLeft: p.strict_supplier ? "3px solid #ef4444" : "3px solid transparent",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafc")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
              >
                {/* SUPPLIER */}
                <td className={`${TD} min-w-[220px]`}>
                  <p className="text-sm font-semibold text-[#0f172a] leading-snug" title={p.supplier_name}>
                    {p.supplier_name}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <SupplierIdBadge id={p.supplier_id} />
                    {p.strict_supplier && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                        style={{ background: "#fee2e2", color: "#dc2626" }}
                        title="Strict supplier"
                      >
                        <ShieldExclamationIcon className="w-2.5 h-2.5" />
                        Strict
                      </span>
                    )}
                  </div>
                  {p.contact_person && (
                    <p className="text-xs text-[#94a3b8] mt-1 truncate" title={p.contact_person}>
                      {p.contact_person}
                    </p>
                  )}
                </td>

                {/* BRAND */}
                <td className={`${TD} min-w-[160px]`}>
                  <div className="flex items-start gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#94a3b8] flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#334155] leading-snug">
                        {p.brand || <span className="text-[#94a3b8] italic">—</span>}
                      </p>
                      {p.item_description && (
                        <p
                          className="text-xs text-[#94a3b8] mt-0.5"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                          title={p.item_description}
                        >
                          {p.item_description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* RETURN TYPE */}
                <td className={`${TD} whitespace-nowrap`}>
                  <ReturnTypeBadge type={p.return_type} />
                </td>

                {/* MONTHS */}
                <td className={`${TD} text-center whitespace-nowrap`}>
                  {p.months_before_expiry !== null ? (
                    <span
                      className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-lg text-sm font-semibold"
                      style={{ background: "#f1f5f9", color: "#334155" }}
                    >
                      {p.months_before_expiry}
                    </span>
                  ) : (
                    <span className="text-xs text-[#cbd5e1]">—</span>
                  )}
                </td>

                {/* CONDITIONS */}
                <td className={`${TD} min-w-[200px] text-xs text-[#475569] leading-relaxed`}>
                  {cond ? (
                    <div>
                      <span>{isExpanded ? cond : condShort}</span>
                      {cond.length > 80 && (
                        <button
                          onClick={() => toggle(p.id)}
                          className="ml-1 text-[11px] font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                        >
                          {isExpanded ? "less" : "more"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[#cbd5e1]">—</span>
                  )}
                </td>

                {/* LAST UPDATED */}
                <td className={`${TD} text-xs text-[#64748b] whitespace-nowrap`}>
                  {relativeTime(p.last_updated)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
