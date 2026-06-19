"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import type { SortConfig } from "@/hooks/useTableSort";

interface Props {
  label: string;
  column: string;
  sortConfig: SortConfig;
  onSort: (column: string) => void;
  filterable?: boolean;
  filterValues?: string[];
  activeFilters?: string[];
  onFilter?: (values: string[]) => void;
}

export default function SortableHeader({
  label,
  column,
  sortConfig,
  onSort,
  filterable = false,
  filterValues = [],
  activeFilters = [],
  onFilter,
}: Props) {
  const isActive = sortConfig.column === column;
  const hasFilter = activeFilters.length > 0;

  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<string[]>(activeFilters);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) setPending(activeFilters);
  }, [activeFilters, filterOpen]);

  // Close on click outside
  useEffect(() => {
    if (!filterOpen) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
        setSearch("");
        setPending(activeFilters);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen, activeFilters]);

  function openFilter(e: React.MouseEvent) {
    e.stopPropagation();
    setPending(activeFilters);
    setSearch("");
    setFilterOpen((o) => !o);
  }

  function toggleValue(val: string) {
    setPending((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  }

  function applyFilter(e: React.MouseEvent) {
    e.stopPropagation();
    onFilter?.(pending);
    setFilterOpen(false);
    setSearch("");
  }

  function clearFilter(e: React.MouseEvent) {
    e.stopPropagation();
    setPending([]);
    onFilter?.([]);
    setFilterOpen(false);
    setSearch("");
  }

  const visibleOptions = filterValues.filter((v) =>
    v.toLowerCase().includes(search.toLowerCase()),
  );

  // Sort icon
  let SortIcon = ChevronUpDownIcon;
  let sortIconStyle: React.CSSProperties = { color: "#94a3b8", opacity: 0.4 };
  if (isActive && sortConfig.direction === "asc") {
    SortIcon = ChevronUpIcon;
    sortIconStyle = { color: "#2563eb" };
  } else if (isActive && sortConfig.direction === "desc") {
    SortIcon = ChevronDownIcon;
    sortIconStyle = { color: "#2563eb" };
  }

  return (
    <div className="relative inline-flex items-center gap-1 select-none" ref={containerRef}>
      {/* Label + sort icon */}
      <button
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1"
        style={{ color: isActive ? "#2563eb" : "#64748b" }}
      >
        <span
          className={`text-[11px] uppercase tracking-[0.08em] ${isActive ? "font-bold" : "font-semibold"}`}
        >
          {label}
        </span>
        <SortIcon className="w-3.5 h-3.5 flex-shrink-0" style={sortIconStyle} />
      </button>

      {/* Filter icon */}
      {filterable && onFilter && (
        <button
          onClick={openFilter}
          className="relative flex-shrink-0 p-0.5 rounded"
          title={`Filter ${label}`}
        >
          {hasFilter && (
            <span
              className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full z-10"
              style={{ background: "#2563eb" }}
            />
          )}
          <FunnelIcon
            className="w-3.5 h-3.5"
            style={{ color: hasFilter ? "#2563eb" : "#94a3b8" }}
          />
        </button>
      )}

      {/* Dropdown */}
      {filterOpen && (
        <div
          className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-lg overflow-hidden"
          style={{ width: 180, border: "1px solid #e2e8f0" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search */}
          <div className="px-3 py-2" style={{ borderBottom: "1px solid #e2e8f0" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full text-xs text-[#334155] outline-none placeholder:text-[#cbd5e1]"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="overflow-y-auto" style={{ maxHeight: 160 }}>
            {visibleOptions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[#94a3b8]">No options</p>
            ) : (
              visibleOptions.map((val) => (
                <label
                  key={val}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#f8fafc] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={pending.includes(val)}
                    onChange={() => toggleValue(val)}
                    className="w-3.5 h-3.5 flex-shrink-0 accent-[#2563eb]"
                  />
                  <span className="truncate text-xs text-[#334155]">{val}</span>
                </label>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderTop: "1px solid #e2e8f0" }}
          >
            <button
              onClick={clearFilter}
              className="text-xs font-medium text-[#64748b] hover:text-[#334155] transition-colors"
            >
              Clear
            </button>
            <button
              onClick={applyFilter}
              className="text-xs font-semibold px-3 py-1 rounded-lg text-white transition-colors"
              style={{ background: "#2563eb" }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
