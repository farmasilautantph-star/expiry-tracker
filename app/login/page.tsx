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
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #0f1f35 0%, #1d4ed8 50%, #2563eb 100%)",
      }}
    >
      <div
        className="w-[400px] max-w-full mx-4 p-8"
        style={{
          background: "white",
          borderRadius: "24px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.20)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center">
          <div
            className="flex items-center justify-center"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#2563eb",
              boxShadow: "0 4px 12px rgba(37,99,235,0.4)",
            }}
          >
            <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-[#0f172a] text-center mt-4">
            Expiry Tracker
          </h1>
          <p className="text-sm text-[#64748b] text-center mt-1">
            Outlet Inventory Management
          </p>
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
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-2.5 text-sm text-[#0f172a] font-medium placeholder-[#94a3b8] bg-white transition-colors focus:outline-none"
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
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
              <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-2.5 text-sm text-[#0f172a] font-medium placeholder-[#94a3b8] bg-white transition-colors focus:outline-none"
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
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
            className="w-full py-3 text-white font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            style={{
              background: "#2563eb",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
            onMouseEnter={(e) => {
              if (!loading)
                (e.currentTarget as HTMLElement).style.background = "#1d4ed8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#2563eb";
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
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-center text-[#94a3b8] text-xs mt-6">
          © 2026 Expiry Tracker
        </p>
      </div>
    </div>
  );
}
