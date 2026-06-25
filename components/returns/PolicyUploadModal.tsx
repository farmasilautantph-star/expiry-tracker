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
  onSuccess: (inserted: number) => void;
}

interface UploadResult {
  success: boolean;
  inserted?: number;
  skipped?: number;
  total?: number;
  error?: string;
}

export default function PolicyUploadModal({ isOpen, onClose, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setError(null);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    if (uploading) return;
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

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/return-policies/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const json: UploadResult = await res.json();
      if (!json.success) throw new Error(json.error ?? "Upload failed");
      onSuccess(json.inserted ?? 0);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
      <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#1e293b]">Update Return Policy Data</h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Upload the latest Return Policy Excel file. This will replace all existing policy data.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-[#94a3b8] hover:text-[#0f172a] transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          className="hidden"
        />

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
            <p className="text-xs text-[#94a3b8]">Sheet name must be &quot;Return Policy&quot;</p>
          </button>
        ) : (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}
          >
            <DocumentIcon className="w-8 h-8 text-[#2563eb] flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#0f172a] truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-[#64748b]">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={reset}
              disabled={uploading}
              className="text-xs font-semibold text-[#64748b] hover:text-[#ef4444] transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        )}

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-[#ef4444]"
            style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "#2563eb" }}
            onMouseEnter={(e) => {
              if (file && !uploading) (e.currentTarget as HTMLElement).style.background = "#1d4ed8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#2563eb";
            }}
          >
            {uploading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                Uploading…
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
