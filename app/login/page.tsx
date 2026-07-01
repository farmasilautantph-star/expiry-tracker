"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardDocumentListIcon,
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  XCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Login failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f1f35 0%, #1d4ed8 50%, #2563eb 100%)",
      }}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 24,
            width: 110,
            height: 90,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1.4px, transparent 1.4px)",
            backgroundSize: "14px 14px",
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -90,
            right: -90,
            width: 300,
            height: 300,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -110,
            left: -70,
            width: 260,
            height: 260,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: -50,
            width: 170,
            height: 170,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        />
      </div>

      <div
        className="w-[400px] max-w-full mx-4 relative"
        style={{
          background: "white",
          borderRadius: "28px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.24)",
        }}
      >
        <div className="px-8 pt-8">
          {/* Logo */}
          <div className="flex flex-col items-center">
            <div
              className="flex items-center justify-center"
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "22px",
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                boxShadow: "0 10px 24px rgba(37,99,235,0.35)",
              }}
            >
              <ClipboardDocumentListIcon className="w-9 h-9 text-white" strokeWidth={1.6} />
            </div>
            <h1 className="text-3xl font-black text-[#0f172a] text-center mt-4">
              Expiry Tracker
            </h1>
            <p className="text-sm text-[#64748b] text-center mt-1">
              Outlet Inventory Management
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-3.5">
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "#cbd5e1" }} />
              <span style={{ width: 20, height: 5, borderRadius: 999, background: "#2563eb" }} />
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "#cbd5e1" }} />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-[#374151] mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-11 pr-4 py-3 text-sm text-[#0f172a] font-medium placeholder-[#94a3b8] transition-colors focus:outline-none"
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #eef2f7",
                    borderRadius: "14px",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#2563eb";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#eef2f7";
                    e.currentTarget.style.boxShadow = "";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[#374151] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-10 py-3 text-sm text-[#0f172a] font-medium placeholder-[#94a3b8] transition-colors focus:outline-none"
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #eef2f7",
                    borderRadius: "14px",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#2563eb";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#eef2f7";
                    e.currentTarget.style.boxShadow = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-[#dc2626]"
                style={{
                  background: "#fee2e2",
                  border: "1px solid #fecaca",
                  borderRadius: "12px",
                }}
              >
                <XCircleIcon className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3.5 text-white font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mt-2 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                borderRadius: "14px",
                boxShadow: "0 10px 24px rgba(37,99,235,0.35)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in…
                </span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRightIcon className="w-[18px] h-[18px] absolute right-5" strokeWidth={2.4} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-center gap-2 mt-6"
          style={{
            borderTop: "1px solid #f1f5f9",
            padding: "14px 32px",
            borderBottomLeftRadius: "28px",
            borderBottomRightRadius: "28px",
          }}
        >
          <ShieldCheckIcon className="w-4 h-4 text-[#2563eb]" />
          <span className="text-sm font-semibold text-[#1d4ed8]">Secure &amp; Trusted</span>
        </div>
      </div>

      <p
        className="text-center text-xs mt-6 relative"
        style={{ color: "rgba(255,255,255,0.65)" }}
      >
        © 2026 Expiry Tracker. All rights reserved.
      </p>
    </div>
  );
}
