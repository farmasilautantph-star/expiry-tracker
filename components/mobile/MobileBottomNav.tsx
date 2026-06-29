"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavTab {
  label: string;
  href: string;
  icon: (color: string) => React.ReactNode;
}

const TABS: NavTab[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (color) => (
      <svg
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Expiry",
    href: "/dashboard/shortlist",
    icon: (color) => (
      <svg
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Returns",
    href: "/dashboard/returns",
    icon: (color) => (
      <svg
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 14 4 9 9 4" />
        <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
      </svg>
    ),
  },
  {
    label: "Offers",
    href: "/dashboard/offers",
    icon: (color) => (
      <svg
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <circle cx="7" cy="7" r="1.5" fill={color} stroke="none" />
      </svg>
    ),
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        height: "calc(74px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "6px",
        background: "#fff",
        borderTop: "1.5px solid #f0f4f8",
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        const color = isActive ? "#1d4ed8" : "#94a3b8";
        const weight = isActive ? 700 : 400;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: "5px 4px 0",
              WebkitTapHighlightColor: "transparent",
              textDecoration: "none",
            }}
          >
            {tab.icon(color)}
            <span style={{ fontSize: 10, fontWeight: weight, color }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
