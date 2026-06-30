"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handleClose() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentError(null);
    setNewError(null);
    setConfirmError(null);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  }

  async function handleSubmit() {
    setCurrentError(null);
    setNewError(null);
    setConfirmError(null);

    let valid = true;
    if (!currentPassword) {
      setCurrentError("Current password is required");
      valid = false;
    }
    if (newPassword.length < 6) {
      setNewError("New password must be at least 6 characters");
      valid = false;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match");
      valid = false;
    }
    if (!valid) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      let json: { success?: boolean; error?: string } = {};
      try {
        json = await res.json();
      } catch {
        // Response was not JSON (e.g. 500 HTML error page)
      }
      if (!res.ok || !json.success) {
        const msg = json.error ?? "Something went wrong. Please try again.";
        if (msg.toLowerCase().includes("current")) setCurrentError(msg);
        else setNewError(msg);
        return;
      }
      onSuccess("Password updated successfully");
      handleClose();
    } catch (err) {
      console.error("Change password error:", err);
      setCurrentError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#eff6ff" }}
            >
              <LockClosedIcon className="w-4 h-4 text-[#2563eb]" />
            </div>
            <h2 className="text-sm font-bold text-[#0f172a]">Change Password</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-slate-100"
          >
            <XMarkIcon className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setCurrentError(null); }}
                placeholder="Enter current password"
                autoFocus
                className="w-full text-sm text-slate-800 rounded-lg px-3 py-2.5 pr-10 outline-none transition-colors"
                style={{
                  border: currentError ? "1.5px solid #dc2626" : "1px solid #e2e8f0",
                  background: currentError ? "#fff5f5" : "white",
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                {showCurrent ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {currentError && (
              <p className="text-[11px] text-red-500 mt-1">{currentError}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setNewError(null); }}
                placeholder="Enter new password"
                className="w-full text-sm text-slate-800 rounded-lg px-3 py-2.5 pr-10 outline-none transition-colors"
                style={{
                  border: newError ? "1.5px solid #dc2626" : "1px solid #e2e8f0",
                  background: newError ? "#fff5f5" : "white",
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                {showNew ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {newError ? (
              <p className="text-[11px] text-red-500 mt-1">{newError}</p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">Minimum 6 characters</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(null); }}
                placeholder="Repeat new password"
                className="w-full text-sm text-slate-800 rounded-lg px-3 py-2.5 pr-10 outline-none transition-colors"
                style={{
                  border: confirmError ? "1.5px solid #dc2626" : "1px solid #e2e8f0",
                  background: confirmError ? "#fff5f5" : "white",
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                {showConfirm ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {confirmError && (
              <p className="text-[11px] text-red-500 mt-1">{confirmError}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 h-10 rounded-xl text-sm font-medium transition-colors"
            style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            style={{ background: "#2563eb" }}
          >
            {submitting && (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
