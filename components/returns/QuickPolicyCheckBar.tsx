"use client";

import { useState } from "react";
import { QrCodeIcon } from "@heroicons/react/24/outline";
import QuickPolicyCheckModal from "@/components/QuickPolicyCheckModal";

/**
 * Instant barcode/product lookup — distinct from the table filter search
 * below it. Purely informational: never creates or edits any records.
 */
export default function QuickPolicyCheckBar() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Always open the modal — with an empty query it just opens ready for
    // input (same as the mobile entry point), so the button is never a
    // silent no-op when clicked before anything is typed.
    setActiveQuery(query.trim());
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="relative rounded-xl"
        style={{ border: "1.5px solid #93c5fd", background: "#eff6ff" }}
      >
        <QrCodeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Quick Check — scan or type a barcode/product to instantly check its return policy…"
          className="w-full pl-10 pr-24 py-2.5 text-sm bg-transparent placeholder-blue-400 text-[#1e3a8a] font-medium focus:outline-none rounded-xl"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Check
        </button>
      </form>

      <QuickPolicyCheckModal
        key={activeQuery}
        isOpen={activeQuery !== null}
        onClose={() => setActiveQuery(null)}
        initialQuery={activeQuery ?? undefined}
      />
    </>
  );
}
