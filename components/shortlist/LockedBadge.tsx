"use client";

import { LockClosedIcon } from "@heroicons/react/24/solid";

/**
 * "Locked" status badge shown alongside (never replacing) the urgency badges.
 * Solid dark-red styling makes it visually distinct from the light-red
 * "Expired" urgency badge so an item can clearly read as both at once.
 */
export default function LockedBadge({
  onClick,
  compact = false,
}: {
  onClick?: (e: React.MouseEvent) => void;
  compact?: boolean;
}) {
  return (
    <span
      className="badge"
      title="Locked — near expiry, sale blocked. Remove from shelf."
      style={{
        background: "#b91c1c",
        color: "#ffffff",
        fontWeight: 700,
        ...(compact ? { padding: "2px 7px" } : {}),
      }}
      onClick={onClick}
    >
      <LockClosedIcon style={{ width: 11, height: 11, flexShrink: 0 }} />
      Locked
    </span>
  );
}
