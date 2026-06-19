"use client";

import { useRef } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ActivitySearchResult } from "@/hooks/useActivityLog";

interface Props {
  barcode: string;
  setBarcode: (v: string) => void;
  onSearch: (barcode: string) => void;
  isLoading: boolean;
  searchResult: ActivitySearchResult | null;
  error: string | null;
  onClear: () => void;
  recentSearches?: string[];
  compact?: boolean;
}

export default function ActivitySearchBar({
  barcode,
  setBarcode,
  onSearch,
  isLoading,
  searchResult,
  error,
  onClear,
  recentSearches = [],
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const notFound     = searchResult?.found === false && !searchResult?.access_denied;
  const accessDenied = searchResult?.found === false && !!searchResult?.access_denied;
  const hasError     = notFound || accessDenied || (!!error && !notFound && !accessDenied);
  const showRecent   = !compact && !hasError && recentSearches.length > 0;
  const showTip      = !compact && !hasError && recentSearches.length === 0;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onSearch(barcode);
  }

  return (
    <div className="space-y-3">
      {/* Input + button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter barcode..."
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoFocus={!compact}
            className="w-full pl-10 pr-4 py-3 text-sm rounded-xl text-[#0f172a] placeholder-[#94a3b8] disabled:opacity-50 transition-shadow"
            style={{ border: "1px solid #e2e8f0", outline: "none" }}
            onFocus={(e) => {
              e.currentTarget.style.border = "1px solid #2563eb";
              e.currentTarget.style.boxShadow = "0 0 0 3px #eff6ff";
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = "1px solid #e2e8f0";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
        <button
          onClick={() => onSearch(barcode)}
          disabled={isLoading || !barcode.trim()}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50 flex-shrink-0"
          style={{ background: "#2563eb" }}
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Searching
            </>
          ) : (
            "Search"
          )}
        </button>
      </div>

      {/* Not found error */}
      {!compact && notFound && (
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: "#fff5f5", border: "1px solid #fee2e2" }}
        >
          <p className="text-sm font-semibold text-[#dc2626] mb-1">
            No item found
          </p>
          <p className="text-sm text-[#94a3b8] mb-1">
            Barcode{" "}
            <span className="font-mono text-[#334155]">&ldquo;{barcode}&rdquo;</span>{" "}
            not found in the system.
          </p>
          <p className="text-xs text-[#94a3b8] mb-3">
            Make sure the item has been logged first.
          </p>
          <button
            onClick={onClear}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg text-white"
            style={{ background: "#dc2626" }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Access denied error */}
      {!compact && accessDenied && (
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
        >
          <p className="text-sm font-semibold text-[#334155] mb-1">
            🔒 Access Denied
          </p>
          <p className="text-sm text-[#64748b] mb-3">
            This item belongs to another PIC.
          </p>
          <button
            onClick={onClear}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg"
            style={{ background: "#eff6ff", color: "#2563eb" }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Generic error */}
      {!compact && error && !notFound && !accessDenied && (
        <p className="text-xs text-[#dc2626]">{error}</p>
      )}

      {/* Recent searches */}
      {showRecent && (
        <div>
          <p className="text-xs font-medium text-[#94a3b8] mb-2">
            Recent Searches
          </p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((bc) => (
              <button
                key={bc}
                onClick={() => {
                  setBarcode(bc);
                  onSearch(bc);
                }}
                className="px-3 py-1 rounded-full text-xs font-medium font-mono transition-colors"
                style={{ background: "#f1f5f9", color: "#475569" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#dbeafe";
                  (e.currentTarget as HTMLElement).style.color = "#2563eb";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#f1f5f9";
                  (e.currentTarget as HTMLElement).style.color = "#475569";
                }}
              >
                {bc}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      {showTip && (
        <p className="text-xs text-[#94a3b8] text-center">
          Tip: Press{" "}
          <kbd className="px-1 py-0.5 rounded bg-[#f1f5f9] text-[#475569] font-mono text-[10px]">
            Enter
          </kbd>{" "}
          to search
        </p>
      )}
    </div>
  );
}
