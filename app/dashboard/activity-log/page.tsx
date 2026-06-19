"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useActivityLog } from "@/hooks/useActivityLog";
import ActivitySearchBar from "@/components/activity/ActivitySearchBar";
import ActivityEntrySelector from "@/components/activity/ActivityEntrySelector";
import ActivityTimeline from "@/components/activity/ActivityTimeline";

export default function ActivityLogPage() {
  const {
    barcode,
    setBarcode,
    searchResult,
    isLoading,
    error,
    selectedEntryId,
    currentEntry,
    recentSearches,
    searchBarcode,
    selectEntry,
    clearSearch,
  } = useActivityLog();

  const showBigHeader = !searchResult && !isLoading && !error;
  const showSelector =
    !!searchResult?.found && searchResult.multiple && selectedEntryId === null;
  const showTimeline = !!searchResult?.found && currentEntry !== null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {showBigHeader ? (
        /* ── Empty state: centered card with large search ── */
        <div
          className="bg-white rounded-2xl p-8 shadow-sm text-center"
          style={{ border: "1px solid #e2e8f0" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "#eff6ff" }}
          >
            <MagnifyingGlassIcon className="w-8 h-8 text-[#2563eb]" />
          </div>
          <h2 className="text-xl font-bold text-[#0f172a] mb-1">
            Track Item Activity
          </h2>
          <p className="text-sm text-[#94a3b8] mb-6">
            Search by barcode to view the full timeline for any item.
          </p>
          <ActivitySearchBar
            barcode={barcode}
            setBarcode={setBarcode}
            onSearch={searchBarcode}
            isLoading={isLoading}
            searchResult={searchResult}
            error={error}
            onClear={clearSearch}
            recentSearches={recentSearches}
            compact={false}
          />
        </div>
      ) : (
        /* ── Results state: compact search + content below ── */
        <>
          <div
            className="bg-white rounded-2xl px-4 py-3 shadow-sm"
            style={{ border: "1px solid #e2e8f0" }}
          >
            <ActivitySearchBar
              barcode={barcode}
              setBarcode={setBarcode}
              onSearch={searchBarcode}
              isLoading={isLoading}
              searchResult={searchResult}
              error={error}
              onClear={clearSearch}
              recentSearches={recentSearches}
              compact={true}
            />
          </div>

          {showSelector && searchResult && (
            <ActivityEntrySelector
              entries={searchResult.entries}
              selectedEntryId={selectedEntryId}
              onSelect={selectEntry}
              barcode={barcode}
              onNewSearch={clearSearch}
            />
          )}

          {showTimeline && currentEntry && (
            <ActivityTimeline entry={currentEntry} onNewSearch={clearSearch} />
          )}
        </>
      )}
    </div>
  );
}
