"use client";

import { DocumentTextIcon } from "@heroicons/react/24/outline";
import type { ActivityEntry, TimelineEvent } from "@/hooks/useActivityLog";

function formatDaysLeftBadge(daysLeft: number): { label: string; bg: string; color: string } {
  if (daysLeft < 0)   return { label: "Expired",              bg: "#fee2e2", color: "#dc2626" };
  if (daysLeft === 0) return { label: "Today",                bg: "#fee2e2", color: "#dc2626" };
  if (daysLeft <= 30) return { label: `${daysLeft}d left`,    bg: "#ffedd5", color: "#ea580c" };
  if (daysLeft <= 90) return { label: `${Math.ceil(daysLeft / 30)}m left`, bg: "#ffedd5", color: "#ea580c" };
  if (daysLeft <= 240) return { label: `${Math.round(daysLeft / 30)}m left`, bg: "#fef9c3", color: "#ca8a04" };
  return { label: `${Math.round(daysLeft / 30)}m left`, bg: "#dcfce7", color: "#16a34a" };
}

function formatEventDate(iso: string): string {
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const mo = months[d.getMonth()];
    const yr = d.getFullYear();
    const hr = String(d.getHours()).padStart(2, "0");
    const mn = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${mo} ${yr} · ${hr}:${mn}`;
  } catch {
    return iso;
  }
}

function TimelineRow({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      {/* Dot + connecting line */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ paddingTop: 3 }}>
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: event.color }}
        />
        {!isLast && (
          <div
            className="flex-1 mt-1.5"
            style={{ width: 1, background: "#e2e8f0", minHeight: 28 }}
          />
        )}
      </div>

      {/* Content */}
      <div className={isLast ? "flex-1 pb-0" : "flex-1 pb-4"}>
        <p
          className="text-sm font-bold leading-snug"
          style={{ color: isLast ? event.color : "#0f172a" }}
        >
          {event.title}
        </p>
        {event.description && (
          <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
            {event.description}
          </p>
        )}
        <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
          {isLast ? "Now" : formatEventDate(event.date)}
        </p>
      </div>
    </div>
  );
}

interface Props {
  entry: ActivityEntry;
  onNewSearch: () => void;
}

export default function ActivityTimeline({ entry, onNewSearch }: Props) {
  const badge = formatDaysLeftBadge(entry.days_left);
  const { timeline } = entry;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      style={{ border: "1px solid #e2e8f0" }}
    >
      {/* Item header */}
      <div className="flex items-start gap-3 px-5 py-4">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#2563eb" }}
        >
          <DocumentTextIcon className="w-5 h-5 text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-[#0f172a] leading-tight truncate">
            {entry.description}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
            {entry.barcode}
            {entry.category ? ` · ${entry.category}` : ""}
            {entry.uom ? ` · ${entry.uom}` : ""}
          </p>
        </div>

        {/* Days-left badge */}
        <span
          className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      {/* Timeline */}
      <div className="px-5 pb-5 pt-2">
        {timeline.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "#94a3b8" }}>
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
