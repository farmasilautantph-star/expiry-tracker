"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export interface MonthValue {
  month: number; // 1-12
  year: number;
}

interface Props {
  value: MonthValue | null;
  onChange: (val: MonthValue | null) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatLabel(val: MonthValue | null, placeholder: string): string {
  if (!val) return placeholder;
  const date = new Date(val.year, val.month - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export default function MonthPicker({
  value,
  onChange,
  placeholder = "All Time",
  minYear,
  maxYear,
}: Props) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [navYear, setNavYear] = useState(value?.year ?? now.getFullYear());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const resolvedMinYear = minYear ?? currentYear - 3;
  const resolvedMaxYear = maxYear ?? currentYear + 1;

  function openPicker() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
    });
    setNavYear(value?.year ?? currentYear);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  function selectMonth(month: number) {
    onChange({ month, year: navYear });
    setOpen(false);
  }

  function isFuture(month: number) {
    return navYear > currentYear || (navYear === currentYear && month > currentMonth);
  }

  function isSelected(month: number) {
    return value?.year === navYear && value?.month === month;
  }

  function isCurrent(month: number) {
    return navYear === currentYear && month === currentMonth;
  }

  const panel = open ? (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        width: 280,
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        padding: "12px",
      }}
    >
      {/* Year navigator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button
          onClick={() => setNavYear((y) => Math.max(resolvedMinYear, y - 1))}
          disabled={navYear <= resolvedMinYear}
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: "1px solid #e2e8f0",
            background: navYear <= resolvedMinYear ? "#f8fafc" : "white",
            color: navYear <= resolvedMinYear ? "#cbd5e1" : "#334155",
            cursor: navYear <= resolvedMinYear ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronLeftIcon style={{ width: 14, height: 14 }} />
        </button>

        <span style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{navYear}</span>

        <button
          onClick={() => setNavYear((y) => Math.min(resolvedMaxYear, y + 1))}
          disabled={navYear >= resolvedMaxYear}
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: "1px solid #e2e8f0",
            background: navYear >= resolvedMaxYear ? "#f8fafc" : "white",
            color: navYear >= resolvedMaxYear ? "#cbd5e1" : "#334155",
            cursor: navYear >= resolvedMaxYear ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronRightIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Month grid — 4×3 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
        {MONTHS.map((label, i) => {
          const month = i + 1;
          const future = isFuture(month);
          const selected = isSelected(month);
          const current = isCurrent(month);

          let bg = "transparent";
          let color = "#334155";
          let border = "1px solid transparent";
          let cursor: React.CSSProperties["cursor"] = "pointer";

          if (selected) {
            bg = "#2563eb";
            color = "white";
            border = "1px solid #2563eb";
          } else if (future) {
            color = "#cbd5e1";
            cursor = "not-allowed";
          } else if (current) {
            border = "1px solid #2563eb";
          }

          return (
            <button
              key={month}
              onClick={() => !future && selectMonth(month)}
              disabled={future}
              style={{
                padding: "7px 4px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: selected ? 600 : 400,
                background: bg,
                color,
                border,
                cursor,
                textAlign: "center",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (!future && !selected)
                  (e.currentTarget as HTMLElement).style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                if (!future && !selected)
                  (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid #f1f5f9",
          gap: 6,
        }}
      >
        <button
          onClick={() => { onChange(null); setOpen(false); }}
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 500,
            background: "#f8fafc",
            color: "#334155",
            border: "1px solid #e2e8f0",
            cursor: "pointer",
          }}
        >
          All Time
        </button>
        <button
          onClick={() => { onChange(null); setOpen(false); }}
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 500,
            background: "#f8fafc",
            color: "#64748b",
            border: "1px solid #e2e8f0",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={open ? () => setOpen(false) : openPicker}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          border: `1px solid ${open ? "#2563eb" : "#e2e8f0"}`,
          borderRadius: 10,
          background: "white",
          color: value ? "#334155" : "#94a3b8",
          fontSize: 14,
          cursor: "pointer",
          boxShadow: open ? "0 0 0 2px rgba(37,99,235,0.1)" : undefined,
          whiteSpace: "nowrap",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!open) (e.currentTarget as HTMLElement).style.borderColor = "#2563eb";
        }}
        onMouseLeave={(e) => {
          if (!open) (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
        }}
      >
        <CalendarIcon style={{ width: 15, height: 15, flexShrink: 0 }} />
        <span>{formatLabel(value, placeholder)}</span>
        <ChevronDownIcon
          style={{
            width: 13,
            height: 13,
            flexShrink: 0,
            color: "#94a3b8",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      </button>

      {typeof window !== "undefined" && panel && createPortal(panel, document.body)}
    </>
  );
}
