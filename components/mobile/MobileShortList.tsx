"use client";

import { useMemo, useRef, useState } from "react";
import type {
  ShortListEntry,
  ShortListFilters as Filters,
  ShortListCounts,
} from "@/hooks/useShortList";
import MobileItemReviewModal from "@/components/mobile/MobileItemReviewModal";

type Urgency = "expired" | "critical" | "warning" | "safe";

const BADGE_STYLE: Record<
  Urgency,
  { bg: string; color: string; border: string }
> = {
  expired:  { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" },
  critical: { bg: "#ffedd5", color: "#ea580c", border: "#fdba74" },
  warning:  { bg: "#fef9c3", color: "#ca8a04", border: "#fde047" },
  safe:     { bg: "#dcfce7", color: "#16a34a", border: "#86efac" },
};

const CHIPS: Array<{ value: string; label: string; key: keyof ShortListCounts }> = [
  { value: "",         label: "All",      key: "total"    },
  { value: "expired",  label: "Expired",  key: "expired"  },
  { value: "critical", label: "Critical", key: "critical" },
  { value: "warning",  label: "Warning",  key: "warning"  },
  { value: "safe",     label: "Safe",     key: "safe"     },
];

const ACTIVE_CHIP_STYLE: Record<string, { bg: string; color: string }> = {
  "":         { bg: "#1d4ed8", color: "#ffffff" },
  expired:    { bg: "#dc2626", color: "#ffffff" },
  critical:   { bg: "#ea580c", color: "#ffffff" },
  warning:    { bg: "#ca8a04", color: "#ffffff" },
  safe:       { bg: "#16a34a", color: "#ffffff" },
};

function formatShortDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mi = parseInt(m, 10) - 1;
  return `${d} ${months[mi] ?? m} ${y}`;
}

function daysLeftLabel(entry: ShortListEntry): string {
  if (entry.days_left < 0) return "Expired";
  if (entry.days_left === 0) return "Today";
  if (entry.days_left <= 30) return `${entry.days_left}d left`;
  return `${Math.round(entry.days_left / 30)}mo left`;
}

interface ReturnStyle { bg: string; color: string; border: string; label: string }

function returnStyle(status: string | null): ReturnStyle | null {
  if (!status) return null;
  if (status === "pending")
    return { bg: "#fffbeb", color: "#b45309", border: "#fde68a", label: "Pending" };
  if (status === "returned")
    return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", label: "Returned" };
  if (status === "returning")
    return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", label: "Returning" };
  if (status === "not_approved")
    return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", label: "Not Approved" };
  if (status === "non-returnable")
    return { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0", label: "Non-Return" };
  return { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0", label: status };
}

interface Props {
  entries: ShortListEntry[];
  counts: ShortListCounts;
  isLoading: boolean;
  isManager: boolean;
  picName: string;
  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  onRefresh: () => Promise<void>;
  onPatchEntry?: (id: number, patch: Partial<ShortListEntry>) => void;
  onRemoveEntry?: (id: number) => void;
  onSwitchToSales?: () => void;
  onSwitchToActive?: () => void;
  activeTab?: "active" | "push" | "sales";
  onToast?: (msg: string) => void;
  deepLinkReviewId?: number | null;
  deepLinkModalOpen?: boolean;
  onCloseDeepLink?: () => void;
  /** Header title shown at the top of the mobile page. Defaults to "Expiry Monitor". */
  headerTitle?: string;
  /** Hide the tab bar entirely (used on the standalone Push Item page). */
  hideTabs?: boolean;
  /** When set, card taps call this instead of opening the built-in review modal. */
  onOpenItem?: (id: number) => void;
}

export default function MobileShortList({
  entries,
  counts,
  isLoading,
  isManager,
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  onRefresh,
  onPatchEntry,
  onRemoveEntry,
  onSwitchToSales,
  onSwitchToActive,
  activeTab = "active",
  onToast,
  deepLinkReviewId,
  deepLinkModalOpen,
  onCloseDeepLink,
  headerTitle = "Expiry Monitor",
  hideTabs = false,
  onOpenItem,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const savedScrollY = useRef(0);

  const picOptions = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const e of entries) {
      if (!seen.has(e.pic_name)) {
        seen.add(e.pic_name);
        names.push(e.pic_name);
      }
    }
    return names.sort();
  }, [entries]);

  const categoryOptions = useMemo(() => {
    const seen: Record<string, true> = {};
    for (const e of entries) {
      if (e.category) seen[e.category] = true;
    }
    return Object.keys(seen).sort();
  }, [entries]);

  function openReview(id: number) {
    if (onOpenItem) { onOpenItem(id); return; }
    savedScrollY.current = window.scrollY;
    setReviewingId(id);
    setReviewOpen(true);
  }

  function closeReview() {
    setReviewOpen(false);
    window.scrollTo({ top: savedScrollY.current, behavior: "instant" });
  }

  return (
    <div className="mobile-page-enter md:hidden" style={{ background: "#f4f7fb", minHeight: "100%" }}>
      {/* ─── Header card (Outlet Inventory + Expiry Monitor + filter button) ─── */}
      <div
        style={{
          background: "#fff",
          padding: "18px 16px 14px",
          borderBottom: "1px solid #f0f4f8",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "1.2px",
                color: "#94a3b8",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              Outlet Inventory
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.4px",
              }}
            >
              {headerTitle}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-label="More filters"
            aria-pressed={moreOpen}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: moreOpen ? "#1d4ed8" : "#f1f5f9",
              color: moreOpen ? "#fff" : "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M7 12h10M11 18h2" />
            </svg>
            {activeFilterCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9999,
                  background: "#2563eb",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 5px",
                  border: "2px solid #fff",
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── Tabs (Item Status / Sales Record) ─── */}
      {!hideTabs && (
      <div
        style={{
          background: "#fff",
          padding: "0 16px",
          display: "flex",
          gap: 4,
          borderBottom: "1px solid #f0f4f8",
        }}
      >
        <button
          type="button"
          onClick={() => onSwitchToActive?.()}
          style={{
            flex: 1,
            padding: "12px 8px",
            fontSize: 13,
            fontWeight: 700,
            background: "transparent",
            color: activeTab === "active" ? "#1d4ed8" : "#94a3b8",
            borderBottom:
              activeTab === "active"
                ? "2.5px solid #1d4ed8"
                : "2.5px solid transparent",
            marginBottom: -1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          Item Status
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: "1.5px 6px",
              borderRadius: 999,
              background: activeTab === "active" ? "#dbeafe" : "#f1f5f9",
              color: activeTab === "active" ? "#1d4ed8" : "#64748b",
            }}
          >
            {counts.total}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSwitchToSales?.()}
          style={{
            flex: 1,
            padding: "12px 8px",
            fontSize: 13,
            fontWeight: 700,
            background: "transparent",
            color: activeTab === "sales" ? "#1d4ed8" : "#94a3b8",
            borderBottom:
              activeTab === "sales"
                ? "2.5px solid #1d4ed8"
                : "2.5px solid transparent",
            marginBottom: -1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          Sales Record
        </button>
      </div>
      )}

      {/* ─── Search ─── */}
      <div style={{ background: "#fff", padding: "12px 16px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#f4f7fb",
            borderRadius: 14,
            padding: "0 14px",
            height: 46,
            border: "1.5px solid #eef1f6",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            type="text"
            placeholder="Search items, category, PIC…"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            style={{
              flex: 1,
              border: "none",
              background: "none",
              fontFamily: "inherit",
              fontSize: 14,
              color: "#0f172a",
              outline: "none",
              minWidth: 0,
            }}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilter("search", "")}
              aria-label="Clear search"
              style={{ color: "#94a3b8", flexShrink: 0, display: "flex" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ─── Filter chips (scrollable) ─── */}
      <div
        style={{
          background: "#fff",
          padding: "10px 16px 14px",
          display: "flex",
          gap: 8,
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {CHIPS.map((chip) => {
          const active = filters.status === chip.value;
          const count = counts[chip.key];
          const activeColors = ACTIVE_CHIP_STYLE[chip.value] ?? ACTIVE_CHIP_STYLE[""];
          return (
            <button
              key={chip.value || "all"}
              type="button"
              onClick={() => setFilter("status", chip.value)}
              style={{
                flexShrink: 0,
                padding: "0 14px",
                height: 36,
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                whiteSpace: "nowrap",
                background: active ? activeColors.bg : "#fff",
                color: active ? activeColors.color : "#64748b",
                border: active
                  ? `1.5px solid ${activeColors.bg}`
                  : "1.5px solid #e2e8f0",
                transition: "background-color 0.15s",
              }}
            >
              {chip.label} · {count}
            </button>
          );
        })}
      </div>

      {/* ─── More filters panel ─── */}
      {moreOpen && (
        <div
          style={{
            background: "#fff",
            padding: "0 16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderBottom: "1px solid #f0f4f8",
          }}
        >
          <select
            value={filters.category}
            onChange={(e) => setFilter("category", e.target.value)}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              border: "1.5px solid #eef1f6",
              background: "#f4f7fb",
              padding: "0 14px",
              fontSize: 14,
              color: "#0f172a",
              outline: "none",
            }}
          >
            <option value="">All Categories</option>
            {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filters.return_status}
            onChange={(e) => setFilter("return_status", e.target.value)}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              border: "1.5px solid #eef1f6",
              background: "#f4f7fb",
              padding: "0 14px",
              fontSize: 14,
              color: "#0f172a",
              outline: "none",
            }}
          >
            <option value="">All Returns</option>
            <option value="returnable">Returnable</option>
            <option value="pending">Pending</option>
            <option value="returned">Returned</option>
            <option value="non-returnable">Non-Returnable</option>
            <option value="none">Not Set</option>
          </select>
          {isManager && (
            <select
              value={filters.pic}
              onChange={(e) => setFilter("pic", e.target.value)}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1.5px solid #eef1f6",
                background: "#f4f7fb",
                padding: "0 14px",
                fontSize: 14,
                color: "#0f172a",
                outline: "none",
              }}
            >
              <option value="">All PICs</option>
              {picOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                alignSelf: "flex-start",
                fontSize: 12.5,
                fontWeight: 600,
                color: "#64748b",
                padding: "6px 0",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Clear filters
              <span
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  width: 18,
                  height: 18,
                  borderRadius: 9999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>
      )}

      {/* ─── Item cards ─── */}
      <div
        style={{
          padding: "8px 16px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: "14px 15px",
                border: "1px solid #eef1f6",
                boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
                height: 100,
              }}
            >
              <div style={{ height: 14, width: "40%", background: "#f1f5f9", borderRadius: 4, marginBottom: 10 }} />
              <div style={{ height: 14, width: "85%", background: "#f1f5f9", borderRadius: 4, marginBottom: 12 }} />
              <div style={{ height: 12, width: "60%", background: "#f1f5f9", borderRadius: 4 }} />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: "32px 16px",
              border: "1px solid #eef1f6",
              boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            No items found
          </div>
        ) : (
          entries.map((entry) => {
            const urg = entry.urgency as Urgency;
            const daysStyle = BADGE_STYLE[urg] ?? BADGE_STYLE.safe;
            const rs = returnStyle(entry.return_status);
            const initial = (entry.pic_name?.charAt(0) ?? "?").toUpperCase();
            return (
              <div
                key={entry.id}
                onClick={() => openReview(entry.id)}
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: "14px 15px",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
                  border: "1px solid #eef1f6",
                }}
              >
                {/* Top row: category + PIC */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 9,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "#64748b",
                      background: "#f1f5f9",
                      padding: "3px 8px",
                      borderRadius: 6,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 160,
                    }}
                  >
                    {entry.category}
                  </span>
                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "#1d4ed8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: 8, fontWeight: 800, color: "#fff" }}>
                        {initial}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#1d4ed8",
                        background: "#eef3fa",
                        padding: "2px 7px",
                        borderRadius: 5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.pic_name}
                    </span>
                  </div>
                </div>

                {/* Name — 2-line clamp */}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0f172a",
                    lineHeight: 1.35,
                    marginBottom: 10,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {entry.description}
                </div>

                {/* Barcode */}
                <div
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                    fontWeight: 500,
                    marginBottom: 6,
                  }}
                >
                  {entry.barcode}
                </div>

                {/* Bottom row: expiry + days-left + return */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{ flexShrink: 0 }}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M3 10h18M8 2v4M16 2v4" />
                  </svg>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      fontWeight: 500,
                      flex: 1,
                    }}
                  >
                    {formatShortDate(entry.expiry_date)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      background: daysStyle.bg,
                      color: daysStyle.color,
                      border: `1.5px solid ${daysStyle.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {daysLeftLabel(entry)}
                  </span>
                  {rs && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 9px",
                        borderRadius: 999,
                        background: rs.bg,
                        color: rs.color,
                        border: `1.5px solid ${rs.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rs.label}
                    </span>
                  )}
                </div>

                {/* Last reviewed */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 6,
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={entry.last_reviewed_display ? "#16a34a" : "#94a3b8"}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: entry.last_reviewed_display ? "#16a34a" : "#94a3b8",
                    }}
                  >
                    {entry.last_reviewed_display
                      ? `Reviewed: ${entry.last_reviewed_display}`
                      : "Not yet reviewed"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Item Review modal — tap-to-open */}
      <MobileItemReviewModal
        isOpen={reviewOpen}
        onClose={closeReview}
        entryId={reviewingId}
        onUpdated={() => {
          onRefresh();
        }}
        onReviewed={(ts) => {
          if (reviewingId !== null) {
            onPatchEntry?.(reviewingId, {
              last_reviewed_at: ts.last_reviewed_at,
              last_reviewed_display: ts.last_reviewed_display,
              review_status: "pending",
            });
          }
        }}
        onSwitchToSales={onSwitchToSales}
        onPatchEntry={onPatchEntry}
        onDeleted={onRemoveEntry}
        onToast={onToast}
      />

      {/* Deep-link Review modal (from ?review=<id> URL param) */}
      <MobileItemReviewModal
        isOpen={!!deepLinkModalOpen}
        onClose={() => onCloseDeepLink?.()}
        entryId={deepLinkReviewId ?? null}
        onUpdated={() => onRefresh()}
        onSwitchToSales={onSwitchToSales}
        onToast={onToast}
        onDeleted={onRemoveEntry}
      />
    </div>
  );
}
