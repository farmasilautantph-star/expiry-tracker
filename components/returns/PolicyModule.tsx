"use client";

import { useMemo, useState } from "react";
import PolicyStatsCards from "./PolicyStatsCards";
import PolicyFilters from "./PolicyFilters";
import PolicyTable from "./PolicyTable";
import PolicyUploadModal from "./PolicyUploadModal";
import { useReturnPolicies } from "@/hooks/useReturnPolicies";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface Props {
  isManager: boolean;
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

const STALE_THRESHOLD_DAYS = 14;

export default function PolicyModule({ isManager }: Props) {
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

  const [uploadOpen, setUploadOpen] = useState(false);
  const { toasts, showSuccess, dismiss } = useToast();

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

  const staleDays = useMemo(() => {
    const d = daysSince(stats.last_updated);
    return d !== null && d > STALE_THRESHOLD_DAYS ? d : null;
  }, [stats.last_updated]);

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

  async function handleUploadSuccess(inserted: number) {
    showSuccess(`${inserted} policies imported successfully`);
    await refresh();
  }

  return (
    <div className="space-y-4">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* Stale alert */}
      {staleDays !== null && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
          style={{ background: "#fefce8", border: "1px solid #fde68a", color: "#854d0e" }}
        >
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 text-[#ca8a04] mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">
              Return policies were last updated {staleDays} days ago.
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>
              {isManager
                ? "Upload a new Excel file to keep data current."
                : "Ask a manager to upload a refreshed Excel file."}
            </p>
          </div>
          {isManager && (
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors flex-shrink-0"
              style={{ background: "#ca8a04" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#a16207")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#ca8a04")}
            >
              Upload Now
            </button>
          )}
        </div>
      )}

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
        onUpload={isManager ? () => setUploadOpen(true) : undefined}
        isManager={isManager}
        isLoading={isLoading}
        counts={tabCounts}
      />

      <PolicyTable policies={policies} isLoading={isLoading} />

      {isManager && (
        <PolicyUploadModal
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
