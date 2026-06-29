"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ArrowUturnLeftIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  Squares2X2Icon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

interface NavSection {
  label: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  managerOnly?: boolean;
  icon: React.ReactNode;
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "MAIN",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <HomeIcon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />,
      },
    ],
  },
  {
    label: "TRACKING",
    items: [
      {
        label: "Expiry Monitor",
        href: "/dashboard/shortlist",
        icon: <ClipboardDocumentListIcon style={{ width: 18, height: 18 }} />,
      },
      {
        label: "Return Management",
        href: "/dashboard/returns",
        icon: <ArrowUturnLeftIcon style={{ width: 18, height: 18 }} />,
      },
      {
        label: "Outlet Offers",
        href: "/dashboard/offers",
        icon: <BuildingStorefrontIcon style={{ width: 18, height: 18 }} />,
      },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      {
        label: "History Log",
        href: "/dashboard/history-log",
        managerOnly: true,
        icon: <ClockIcon style={{ width: 18, height: 18 }} />,
      },
      {
        label: "Staff Report",
        href: "/dashboard/staff-report",
        managerOnly: true,
        icon: <UserGroupIcon style={{ width: 18, height: 18 }} />,
      },
    ],
  },
  {
    label: "TOOLS",
    items: [
      {
        label: "Item Timeline",
        href: "/dashboard/activity-log",
        icon: <Squares2X2Icon style={{ width: 18, height: 18 }} />,
      },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/shortlist": "Expiry Monitor",
  "/dashboard/returns": "Return Management",
  "/dashboard/offers": "Outlet Offers",
  "/dashboard/history-log": "History Log",
  "/dashboard/staff-report": "Staff Report",
  "/dashboard/expiry": "Log New Expiry",
  "/dashboard/activity-log": "Item Timeline",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SidebarContent({
  pathname,
  isManager,
  userInitial,
  username,
  picName,
  role,
  onLinkClick,
  onLogout,
}: {
  pathname: string;
  isManager: boolean;
  userInitial: string;
  username: string;
  picName: string | null | undefined;
  role: string;
  onLinkClick: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{ height: "72px", borderBottom: "1px solid #f1f5f9" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#2563eb" }}
        >
          <ClipboardDocumentListIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[#0f172a] font-bold text-sm leading-none">Expiry Tracker</p>
          <p className="text-[#94a3b8] text-xs font-medium mt-0.5">Outlet Inventory</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.managerOnly || isManager,
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label} className="mb-1">
              <p
                className="px-5 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "#94a3b8" }}
              >
                {section.label}
              </p>
              {visibleItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    className={cn(
                      "flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                      isActive
                        ? "font-semibold bg-[#eff6ff] text-[#2563eb]"
                        : "font-medium text-[#64748b] hover:bg-[#f8fafc] hover:text-[#334155]",
                    )}
                  >
                    <span
                      className="flex-shrink-0"
                      style={{ color: isActive ? "#2563eb" : "#94a3b8" }}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="px-0 pb-1 flex-shrink-0">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all text-[#64748b] hover:bg-[#f8fafc] hover:text-[#334155]"
        >
          <span className="flex-shrink-0" style={{ color: "#94a3b8" }}>
            <ArrowRightOnRectangleIcon style={{ width: 18, height: 18 }} />
          </span>
          Sign Out
        </button>
      </div>

      {/* User section */}
      <div className="px-3 py-4 flex-shrink-0" style={{ borderTop: "1px solid #f1f5f9" }}>
        <div className="flex items-center gap-3 px-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
            style={{ background: "#2563eb" }}
          >
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#0f172a] text-sm font-semibold truncate leading-none">
              {picName || username}
            </p>
            <p className="text-[#94a3b8] text-xs font-medium capitalize mt-0.5">{role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isManager, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#eef2f7" }}>
        <div className="flex items-center gap-3 text-[#64748b]">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const currentUser = user;
  const pageTitle = PAGE_TITLES[pathname] ?? "Dashboard";
  const userInitial = (currentUser.picName?.charAt(0) ?? currentUser.username.charAt(0)).toUpperCase();
  const avatarBg = "#2563eb";

  const sidebarProps = {
    pathname,
    isManager,
    userInitial,
    username: currentUser.username,
    picName: currentUser.picName,
    role: currentUser.role,
    onLinkClick: () => {},
    onLogout: logout,
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f4f7fb" }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-56 flex-shrink-0"
        style={{
          background: "#ffffff",
          boxShadow: "2px 0 16px rgba(0,0,0,0.06)",
        }}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside
            className="relative w-56 flex flex-col flex-shrink-0 z-10 bg-white"
            style={{ boxShadow: "2px 0 16px rgba(0,0,0,0.12)" }}
          >
            <SidebarContent {...sidebarProps} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar — desktop only */}
        <header
          className="hidden md:flex items-center px-6 flex-shrink-0 bg-white"
          style={{
            height: "72px",
            borderBottom: "1px solid #f1f5f9",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {/* Left: hamburger + title */}
          <div className="flex items-center gap-3 flex-shrink-0" style={{ minWidth: 180 }}>
            <button
              className="lg:hidden p-2 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-[15px] font-bold text-[#0f172a] leading-none">{pageTitle}</h1>
              <p className="text-[11px] text-[#94a3b8] mt-0.5">{formatDate(new Date())}</p>
            </div>
          </div>

          {/* Center: search */}
          <div className="flex-1 flex justify-center">
            <div className="relative hidden sm:block">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="Search items, barcodes..."
                className="pl-10 pr-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 w-80"
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid #e2e8f0",
                  color: "#0f172a",
                }}
              />
            </div>
          </div>

          {/* Right: bell + user */}
          <div className="flex items-center gap-3 flex-shrink-0" style={{ minWidth: 180, justifyContent: "flex-end" }}>
            {/* Bell with notification dot */}
            <div className="relative">
              <button
                className="flex items-center justify-center w-9 h-9 rounded-full transition-colors text-[#64748b] hover:bg-[#f1f5f9]"
              >
                <BellIcon className="w-5 h-5" />
              </button>
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: "#ef4444", border: "1.5px solid white" }}
              />
            </div>

            {/* User */}
            <div className="flex items-center gap-2.5">
              <span className="hidden sm:block text-sm font-semibold text-[#0f172a]">
                {(currentUser.picName || currentUser.username).toUpperCase()}
              </span>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                style={{ background: avatarBg }}
              >
                {userInitial}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto p-0 md:p-6 pb-[calc(74px+env(safe-area-inset-bottom)+24px)] md:pb-6"
          style={{ background: "#eef2f7" }}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — below md only */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
