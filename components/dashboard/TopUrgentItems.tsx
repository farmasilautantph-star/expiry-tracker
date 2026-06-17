"use client";

import { useRouter } from "next/navigation";
import type { UrgentItem } from "@/hooks/useDashboardCharts";

interface Props {
  items: UrgentItem[];
}

const URGENCY = {
  expired: {
    label: "Expired",
    cls: "bg-red-500/20 text-red-400 border border-red-500/30",
  },
  critical: {
    label: "",
    cls: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  },
  warning: {
    label: "",
    cls: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  },
};

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function TopUrgentItems({ items }: Props) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-500">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm">No urgent items!</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gray-800/60 overflow-y-auto max-h-[300px]">
      {items.map((item) => {
        const u = URGENCY[item.urgency];

        return (
          <button
            key={item.id}
            onClick={() => router.push("/dashboard/shortlist")}
            className="flex items-start gap-3 px-1 py-2.5 text-left hover:bg-gray-800/40 transition-colors rounded-lg group"
          >
            <span
              className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap flex-shrink-0 ${u.cls}`}
            >
              {item.days_left <= 0 ? "Expired" : `${item.days_left}d`}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate group-hover:text-blue-400 transition-colors">
                {item.description}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {item.category} · {fmtDate(item.expiry_date)} · {item.pic_name}
              </p>
            </div>
            <span className="text-xs text-gray-600 group-hover:text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
              →
            </span>
          </button>
        );
      })}
    </div>
  );
}
