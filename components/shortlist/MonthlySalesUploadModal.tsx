"use client";

import { useRef, useState } from "react";
import {
  XMarkIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UnmappedSalesman {
  ic_number: string;
  pos_name: string;
  row_count: number;
}

interface PreviewResult {
  success: boolean;
  months?: string[];
  matchedCount?: number;
  excludedCount?: number;
  unmapped?: UnmappedSalesman[];
  error?: string;
}

interface CommitResult {
  success: boolean;
  imported?: number;
  skipped?: number;
  totalRM?: number;
  months?: string[];
  error?: string;
}

interface StaffOption {
  id: number;
  pic_name: string;
  ic_number: string | null;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-MY", { month: "long", year: "numeric" });
}

type Step = "pick" | "preview" | "done";

export default function MonthlySalesUploadModal({ isOpen, onClose, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [mappingChoices, setMappingChoices] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CommitResult | null>(null);

  function reset() {
    setStep("pick");
    setFile(null);
    setError(null);
    setBusy(false);
    setPreview(null);
    setStaff([]);
    setMappingChoices({});
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  function handlePick() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!/\.xlsx$/i.test(f.name)) {
      setError("File must be .xlsx");
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function handlePreview() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/monthly-sales/preview", { method: "POST", body: fd, credentials: "include" });
      const json: PreviewResult = await res.json();
      if (!json.success) throw new Error(json.error ?? "Preview failed");
      setPreview(json);

      if (json.unmapped && json.unmapped.length > 0) {
        const staffRes = await fetch("/api/users/staff", { credentials: "include" });
        const staffJson = await staffRes.json();
        if (staffJson.success) setStaff(staffJson.data);
      }

      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!file || !preview) return;
    setBusy(true);
    setError(null);
    try {
      const mappings: Record<string, { action: "map"; userId: number } | { action: "skip" }> = {};
      for (const u of preview.unmapped ?? []) {
        const choice = mappingChoices[u.ic_number];
        if (choice && choice !== "skip") {
          mappings[u.ic_number] = { action: "map", userId: Number(choice) };
        } else {
          mappings[u.ic_number] = { action: "skip" };
        }
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("mappings", JSON.stringify(mappings));
      const res = await fetch("/api/monthly-sales/commit", { method: "POST", body: fd, credentials: "include" });
      const json: CommitResult = await res.json();
      if (!json.success) throw new Error(json.error ?? "Import failed");
      setResult(json);
      setStep("done");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
      <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#1e293b]">Upload Monthly Sales</h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Upload the POS sales export for a month. This replaces that month&apos;s Sales Record data.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={busy}
            className="text-[#94a3b8] hover:text-[#0f172a] transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {step === "pick" && (
          <>
            <input ref={inputRef} type="file" accept=".xlsx" onChange={handleFileChange} className="hidden" />

            {!file ? (
              <button
                type="button"
                onClick={handlePick}
                className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed transition-colors"
                style={{ borderColor: "#cbd5e1", background: "#f8fafc" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#2563eb";
                  (e.currentTarget as HTMLElement).style.background = "#eff6ff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#cbd5e1";
                  (e.currentTarget as HTMLElement).style.background = "#f8fafc";
                }}
              >
                <CloudArrowUpIcon className="w-10 h-10 text-[#94a3b8]" />
                <p className="text-sm font-medium text-[#334155]">Click to choose .xlsx file</p>
                <p className="text-xs text-[#94a3b8]">Monthly POS sales export</p>
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                <DocumentIcon className="w-8 h-8 text-[#2563eb] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#0f172a] truncate" title={file.name}>{file.name}</p>
                  <p className="text-xs text-[#64748b]">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => setFile(null)} disabled={busy} className="text-xs font-semibold text-[#64748b] hover:text-[#ef4444] transition-colors disabled:opacity-50">
                  Remove
                </button>
              </div>
            )}
          </>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl px-4 py-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">Month(s)</p>
                <p className="text-sm font-semibold text-[#0f172a] mt-0.5">
                  {(preview.months ?? []).map(monthLabel).join(", ") || "—"}
                </p>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">Matched / Excluded</p>
                <p className="text-sm font-semibold text-[#0f172a] mt-0.5">
                  {preview.matchedCount ?? 0} / {preview.excludedCount ?? 0}
                </p>
              </div>
            </div>

            {(preview.unmapped ?? []).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#334155]">
                  Unrecognized salesmen — map each to an existing staff account:
                </p>
                {preview.unmapped!.map((u) => (
                  <div key={u.ic_number} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0f172a] truncate">{u.pos_name}</p>
                      <p className="text-xs text-[#94a3b8] font-mono truncate">
                        ID: {u.ic_number} · {u.row_count} sale(s)
                      </p>
                    </div>
                    <select
                      value={mappingChoices[u.ic_number] ?? "skip"}
                      onChange={(e) => setMappingChoices((prev) => ({ ...prev, [u.ic_number]: e.target.value }))}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-[#334155] focus:outline-none appearance-none"
                    >
                      <option value="skip">Skip these sales</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>{s.pic_name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "done" && result && (
          <div className="rounded-xl px-4 py-4 space-y-1" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <p className="text-sm font-semibold text-[#166534]">
              Imported {result.imported} sale(s) — RM {(result.totalRM ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-[#166534]">
              {(result.months ?? []).map(monthLabel).join(", ")} · {result.skipped ?? 0} row(s) skipped
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm text-[#ef4444]" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          {step === "pick" && (
            <>
              <button onClick={handleClose} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-medium text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={!file || busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "#2563eb" }}
              >
                {busy ? "Reading…" : "Preview"}
              </button>
            </>
          )}

          {step === "preview" && (
            <>
              <button onClick={() => setStep("pick")} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-medium text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors disabled:opacity-50">
                Back
              </button>
              <button
                onClick={handleCommit}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "#2563eb" }}
              >
                {busy ? "Importing…" : "Confirm Import"}
              </button>
            </>
          )}

          {step === "done" && (
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
              style={{ background: "#2563eb" }}
            >
              <CheckCircleIcon className="w-4 h-4" />
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
