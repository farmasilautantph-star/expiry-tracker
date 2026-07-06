"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export interface ExistingEntry {
  id: number;
  description: string;
  barcode: string;
  expiry_date: string;
  current_qty: number;
  pic_name: string;
  logged_at: string;
  category: string;
  uom: string;
}

interface AddStockResult {
  previous_qty: number;
  additional_qty: number;
  new_qty: number;
  reason: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingEntry: ExistingEntry;
  onSuccess: (result: AddStockResult) => void;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function todayDDMMYYYY(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

const INPUT_BASE =
  "w-full border border-[#e2e8f0] bg-white text-[#0f172a] placeholder-[#94a3b8] text-sm font-medium transition-colors focus:outline-none";
const INPUT_STYLE = { borderRadius: "10px", padding: "10px 16px" };

export default function AddStockModal({ isOpen, onClose, existingEntry, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false);
  const [additionalQty, setAdditionalQty] = useState(1);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    setAdditionalQty(1);
    setReason("");
    setReasonError(false);
    setSubmitError("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const newTotal = existingEntry.current_qty + additionalQty;
  // NOTE: do NOT include `!reason.trim()` here — otherwise the button is silently
  // disabled with no feedback ("nothing happens"). handleSubmit validates the
  // reason and surfaces an inline "Reason is required" error instead.
  const isDisabled = submitting || additionalQty < 1;

  async function handleSubmit() {
    if (!reason.trim()) {
      setReasonError(true);
      return;
    }
    setReasonError(false);
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/expiry/add-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existing_id: existingEntry.id,
          additional_qty: additionalQty,
          reason: reason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSubmitError(json.error ?? "Failed to update stock");
        return;
      }
      onSuccess({
        previous_qty: json.data.previous_qty,
        additional_qty: json.data.additional_qty,
        new_qty: json.data.new_qty,
        reason: json.data.reason,
      });
    } catch {
      setSubmitError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const infoRows: [string, string][] = [
    ["Description", existingEntry.description],
    ["Barcode", existingEntry.barcode],
    ["Expiry", fmtDate(existingEntry.expiry_date)],
    ["Logged by", existingEntry.pic_name],
    ["Current Qty", `${existingEntry.current_qty} unit${existingEntry.current_qty !== 1 ? "s" : ""}`],
  ];

  const modal = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-white flex flex-col max-h-[90vh] overflow-hidden"
        style={{ borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0"
          style={{ borderBottom: "1px solid #f1f5f9" }}
        >
          <h2 className="text-lg font-bold text-[#0f172a]">Item Already in System</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-[#64748b]"
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f1f5f9")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
          >
            <XMarkIcon className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          {/* Alert row */}
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-[#d97706] flex-shrink-0" />
            <p className="text-sm text-[#475569]">This item is already logged.</p>
          </div>

          {/* Info grid */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid #e2e8f0" }}
          >
            {infoRows.map(([label, value], i) => (
              <div
                key={label}
                className="grid grid-cols-[120px_1fr] text-sm"
                style={{
                  borderBottom: i < infoRows.length - 1 ? "1px solid #f1f5f9" : undefined,
                }}
              >
                <span className="px-4 py-2.5 font-semibold text-[#64748b] bg-[#f8fafc]">
                  {label}
                </span>
                <span className="px-4 py-2.5 text-[#0f172a] font-medium">{value}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #f1f5f9" }} className="pt-4 space-y-4">
            <p className="text-sm font-semibold text-[#0f172a]">
              Would you like to add more stock?
            </p>

            {/* Additional Qty */}
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">
                Additional Quantity <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={additionalQty}
                onChange={(e) => setAdditionalQty(Math.max(1, Math.round(Number(e.target.value))))}
                className={INPUT_BASE}
                style={INPUT_STYLE}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "";
                }}
              />
            </div>

            {/* Live new total */}
            <div
              className="rounded-lg p-2 text-sm font-bold text-center"
              style={{ background: "#eff6ff", color: "#2563eb" }}
            >
              New Total: {newTotal} unit{newTotal !== 1 ? "s" : ""}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">
                Reason <span className="text-[#ef4444]">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (e.target.value.trim()) setReasonError(false);
                }}
                placeholder={`e.g. Warehouse distributed additional stock on ${todayDDMMYYYY()}`}
                className={INPUT_BASE}
                style={{
                  ...INPUT_STYLE,
                  resize: "none",
                  borderColor: reasonError ? "#ef4444" : "#e2e8f0",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = reasonError ? "#ef4444" : "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.05)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = reasonError ? "#ef4444" : "#e2e8f0";
                  e.currentTarget.style.boxShadow = "";
                }}
              />
              {reasonError && (
                <p className="text-red-500 text-xs mt-1">Reason is required</p>
              )}
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-[#ef4444] text-sm">
                {submitError}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid #f1f5f9" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="bg-white border border-[#e2e8f0] text-[#374151] font-semibold rounded-xl px-5 py-2.5 text-sm hover:bg-[#f8fafc] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isDisabled}
            className="flex items-center gap-2 text-white font-semibold rounded-xl px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ background: "#2563eb", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}
            onMouseEnter={(e) => {
              if (!isDisabled) (e.currentTarget as HTMLElement).style.background = "#1d4ed8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#2563eb";
            }}
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Updating…
              </>
            ) : (
              <>
                <PlusIcon className="w-4 h-4" />
                Update Quantity
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
