"use client";

import { useMemo } from "react";
import PolicyStatsCards from "./PolicyStatsCards";
import PolicyFilters from "./PolicyFilters";
import PolicyTable from "./PolicyTable";
import { useReturnPolicies } from "@/hooks/useReturnPolicies";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function PolicyModule() {
  const {
    policies,
    allPolicies,
    stats,
    isLoading,
    error,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    refresh,
  } = useReturnPolicies();

  // Counts shown next to filter tabs are derived from the search-narrowed pool,
  // so the user always sees what each tab will contain.
  const tabCounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchSearch = (p: (typeof allPolicies)[number]) => {
      if (!q) return true;
      return (
        p.supplier_name.toLowerCase().includes(q) ||
        p.supplier_id.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.item_description ?? "").toLowerCase().includes(q) ||
        (p.contact_person ?? "").toLowerCase().includes(q)
      );
    };
    const narrowed = allPolicies.filter(matchSearch);
    return {
      all: narrowed.length,
      returnable: narrowed.filter((p) => p.return_type === "RETURNABLE").length,
      exchangeable: narrowed.filter((p) => p.return_type === "EXCHANGEABLE").length,
      non_returnable: narrowed.filter((p) => p.return_type === "NON_RETURNABLE").length,
    };
  }, [allPolicies, search]);

  function handleExport() {
    const headers = [
      "Supplier ID",
      "Supplier Name",
      "Brand",
      "Scope",
      "Contact Person",
      "Item Description",
      "Return Type",
      "Months Before Expiry",
      "Special Conditions",
      "Strict Supplier",
      "Last Updated",
      "Updated By",
    ];
    const lines = [headers.join(",")];
    for (const p of policies) {
      lines.push(
        [
          p.supplier_id,
          p.supplier_name,
          p.brand,
          p.scope ?? "",
          p.contact_person ?? "",
          p.item_description ?? "",
          p.return_type,
          p.months_before_expiry ?? "",
          p.special_conditions ?? "",
          p.strict_supplier ? "YES" : "NO",
          p.last_updated ?? "",
          p.updated_by ?? "",
        ]
          .map(csvEscape)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `return-policies-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <PolicyStatsCards stats={stats} isLoading={isLoading} />

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm text-[#ef4444]"
          style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
        >
          {error}
        </div>
      )}

      <PolicyFilters
        search={search}
        setSearch={setSearch}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        onRefresh={() => void refresh()}
        onExport={handleExport}
        isLoading={isLoading}
        counts={tabCounts}
      />

      <PolicyTable policies={policies} isLoading={isLoading} />
    </div>
  );
}
