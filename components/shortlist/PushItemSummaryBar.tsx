"use client";

import type { ShortListEntry } from "@/hooks/useShortList";

interface Props {
  entries: ShortListEntry[];
  isLoading: boolean;
}

export default function PushItemSummaryBar({ entries, isLoading }: Props) {
  const flagged = entries.length;
  const expiringSoon = entries.filter((e) => e.days_left <= 7).length;
  const partialSold = entries.filter(
    (e) => e.original_qty != null && e.quantity < e.original_qty,
  ).length;
  const noMovement = entries.filter(
    (e) => e.original_qty == null || e.quantity === e.original_qty,
  ).length;

  if (isLoading) {
    return (
      <div className="text-xs text-[#94a3b8] animate-pulse">Loading summary…</div>
    );
  }

  return (
    <div className="text-xs text-[#64748b]">
      {flagged} items flagged · {expiringSoon} expiring within 7 days · {partialSold} partial sold · {noMovement} no movement yet
    </div>
  );
}
