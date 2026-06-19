"use client";

import type { ActivityEntry, TimelineEvent } from "@/hooks/useActivityLog";

const URGENCY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  expired:  { bg: "#fee2e2", color: "#dc2626", label: "Expired" },
  critical: { bg: "#fee2e2", color: "#dc2626", label: "Critical" },
  warning:  { bg: "#fef9c3", color: "#ca8a04", label: "Warning" },
  safe:     { bg: "#dcfce7", color: "#16a34a", label: "Safe" },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const day  = String(d.getDate()).padStart(2, "0");
    const mo   = String(d.getMonth() + 1).padStart(2, "0");
    const yr   = d.getFullYear();
    const hr   = String(d.getHours()).padStart(2, "0");
    const mn   = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${mo}/${yr} ${hr}:${mn}`;
  } catch {
    return iso;
  }
}

function formatDaysLeft(daysLeft: number): string {
  if (daysLeft < 0) return "Expired";
  if (daysLeft === 0) return "Today";
  if (daysLeft <= 30) return `${daysLeft}d left`;
  return `${Math.round(daysLeft / 30)}m left`;
}

function EventDot({ color, pulse }: { color: string; pulse: boolean }) {
  return (
    <div className="relative flex-shrink-0 flex items-center justify-center w-5 h-5">
      {pulse && (
        <span
          className="absolute inline-flex h-4 w-4 rounded-full animate-ping opacity-40"
          style={{ background: color }}
        />
      )}
      <div
        className="relative w-3 h-3 rounded-full flex-shrink-0"
        style={{
          background: color,
          boxShadow: `0 0 0 2px white, 0 0 0 4px ${color}`,
        }}
      />
    </div>
  );
}

function TimelineRow({
  event,
  isLast,
}: {
  event: TimelineEvent;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* Left: dot + line */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
        {isLast && (
          <p className="text-[9px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-1 whitespace-nowrap" style={{ marginLeft: -28 }}>
            Current
          </p>
        )}
        <EventDot color={event.color} pulse={isLast} />
        {!isLast && (
          <div
            className="flex-1 mt-1"
            style={{ width: 2, background: "#e2e8f0", minHeight: 20 }}
          />
        )}
      </div>

      {/* Right: event card */}
      <div className="flex-1 pb-4">
        <div
          className="bg-white rounded-xl p-3 shadow-sm"
          style={{ borderLeft: `3px solid ${event.color}` }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-[#0f172a]">{event.title}</p>
          </div>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            {formatDateTime(event.date)}
          </p>
          <p className="text-sm text-[#475569] mt-1.5">{event.description}</p>
          {event.pic_name && (
            <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs bg-[#f1f5f9] text-[#475569] font-medium">
              {event.pic_name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  entry: ActivityEntry;
  onNewSearch: () => void;
}

export default function ActivityTimeline({ entry, onNewSearch }: Props) {
  const urgencyStyle = URGENCY_STYLE[entry.urgency] ?? URGENCY_STYLE.safe;
  const { timeline } = entry;

  return (
    <div className="space-y-4">
      {/* Item header card */}
      <div
        className="bg-white rounded-2xl p-5 shadow-sm"
        style={{ border: "1px solid #e2e8f0" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Urgency + status badges */}
            <div className="flex flex-wrap gap-2 mb-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: urgencyStyle.bg, color: urgencyStyle.color }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: urgencyStyle.color }}
                />
                {urgencyStyle.label} · {formatDaysLeft(entry.days_left)}
              </span>
              {entry.item_status !== "active" && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#16a34a]">
                  {entry.item_status === "sold" ? "Fully Sold" : entry.item_status}
                </span>
              )}
            </div>

            {/* Description */}
            <h3 className="text-lg font-bold text-[#0f172a] leading-tight">
              {entry.description}
            </h3>

            {/* Details row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[#64748b]">
              <span>
                Barcode:{" "}
                <span className="font-mono text-[#334155]">{entry.barcode}</span>
              </span>
              {entry.stock_id && (
                <span>
                  Stock ID:{" "}
                  <span className="font-mono text-[#334155]">{entry.stock_id}</span>
                </span>
              )}
              <span>Category: <span className="text-[#334155]">{entry.category}</span></span>
              {entry.uom && (
                <span>UOM: <span className="text-[#334155]">{entry.uom}</span></span>
              )}
              <span>
                Qty:{" "}
                <span className="font-semibold text-[#0f172a]">
                  {entry.current_qty}
                </span>
              </span>
              <span>
                Expiry:{" "}
                <span className="text-[#334155]">{formatDate(entry.expiry_date)}</span>
              </span>
              <span>
                PIC:{" "}
                <span className="font-medium text-[#334155]">{entry.pic_name}</span>
              </span>
            </div>
          </div>

          {/* New Search button */}
          <button
            onClick={onNewSearch}
            className="flex-shrink-0 text-sm font-semibold text-[#2563eb] hover:underline whitespace-nowrap"
          >
            New Search
          </button>
        </div>
      </div>

      {/* Timeline section */}
      <div
        className="bg-white rounded-2xl p-5 shadow-sm"
        style={{ border: "1px solid #e2e8f0" }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#0f172a] mb-5">
          Activity History
        </p>

        {timeline.length === 0 ? (
          <p className="text-sm text-[#94a3b8] text-center py-8">
            No activity recorded yet for this item
          </p>
        ) : (
          <div>
            {timeline.map((event, i) => (
              <TimelineRow
                key={event.id}
                event={event}
                isLast={i === timeline.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
