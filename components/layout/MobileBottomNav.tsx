"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ArrowUturnLeftIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";

interface NavTab {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const TABS: NavTab[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <HomeIcon style={{ width: 23, height: 23 }} strokeWidth={1.9} />,
  },
  {
    label: "Expiry",
    href: "/dashboard/shortlist",
    icon: <ClipboardDocumentListIcon style={{ width: 23, height: 23 }} strokeWidth={1.9} />,
  },
  {
    label: "Returns",
    href: "/dashboard/returns",
    icon: <ArrowUturnLeftIcon style={{ width: 23, height: 23 }} strokeWidth={1.9} />,
  },
  {
    label: "Offers",
    href: "/dashboard/offers",
    icon: <BuildingStorefrontIcon style={{ width: 23, height: 23 }} strokeWidth={1.9} />,
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white flex items-start"
      style={{
        height: "calc(74px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "6px",
        borderTop: "1.5px solid #f0f4f8",
        boxShadow: "0 -2px 12px rgba(15,23,42,0.04)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        const color = isActive ? "#1d4ed8" : "#94a3b8";
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-start gap-1 pt-2"
            style={{ color }}
          >
            {tab.icon}
            <span
              className="text-[10px]"
              style={{ fontWeight: isActive ? 700 : 500, color }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
