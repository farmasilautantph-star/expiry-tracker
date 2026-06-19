"use client";

import type { ActivityEntry } from "@/hooks/useActivityLog";

interface Props {
  entries: ActivityEntry[];
  selectedEntryId: number | null;
  onSelect: (id: number) => void;
  barcode: string;
  onNewSearch: () => void;
}

const URGENCY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  expired:  { bg: "#fee2e2", color: "#dc2626", label: "Expired" },
  critical: { bg: "#fee2e2", color: "#dc2626", label: "Critical" },
  warning:  { bg: "#fef9c3", color: "#ca8a04", label: "Warning" },
  safe:     { bg: "#dcfce7", color: "#16a34a", label: "Safe" },
};

const STATUS_LABEL: Record<string, string> = {
  active:    "Active",
  sold:      "Fully Sold",
  completed: "Completed",
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

export default function ActivityEntrySelector({
  entries,
  selectedEntryId,
  onSelect,
  barcode,
  onNewSearch,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0f172a]">
            Found {entries.length} entries for barcode{" "}
            <span className="font-mono text-[#2563eb]">{barcode}</span>
          </p>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Select which entry to view:
          </p>
        </div>
        <button
          onClick={onNewSearch}
          className="text-xs font-semibold text-[#2563eb] hover:underline"
        >
          New Search
        </button>
      </div>

      {/* Entry cards */}
      <div className="space-y-3">
        {entries.map((entry, i) => {
          const urgencyStyle = URGENCY_STYLE[entry.urgency] ?? URGENCY_STYLE.safe;
          const isSelected = selectedEntryId === entry.entry_id;
          const statusLabel =
            entry.item_status === "active"
              ? `Active (${entry.current_qty} remaining)`
              : STATUS_LABEL[entry.item_status] ?? entry.item_status;

          return (
            <button
              key={entry.entry_id}
              onClick={() => onSelect(entry.entry_id)}
              className="w-full text-left rounded-xl p-4 transition-all"
              style={{
                background: isSelected ? "#eff6ff" : "#ffffff",
                border: `1px solid ${isSelected ? "#2563eb" : "#e2e8f0"}`,
                boxShadow: isSelected ? "0 1px 3px 0 rgba(0,0,0,0.07)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.borderColor = "#2563eb";
                  (e.currentTarget as HTMLElement).style.background = "#eff6ff";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
                  (e.currentTarget as HTMLElement).style.background = "#ffffff";
                }
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#64748b] uppercase tracking-wide">
                  Entry {i + 1}
                </span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: urgencyStyle.bg, color: urgencyStyle.color }}
                >
                  {urgencyStyle.label}
                </span>
              </div>
              <p className="text-sm font-semibold text-[#0f172a] truncate">
                {entry.description}
              </p>
              <p className="text-xs text-[#64748b] mt-0.5">
                {entry.pic_name} · Logged {formatDate(entry.logged_at)} ·{" "}
                {entry.original_qty ?? entry.current_qty} unit
                {(entry.original_qty ?? entry.current_qty) !== 1 ? "s" : ""} ·{" "}
                {entry.category}
              </p>
              <p className="text-xs mt-1" style={{ color: entry.item_status === "sold" ? "#16a34a" : "#64748b" }}>
                Status: {statusLabel}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
