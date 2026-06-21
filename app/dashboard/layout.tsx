"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  ListBulletIcon,
  ArrowUturnLeftIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  QrCodeIcon,
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
        icon: <HomeIcon className="w-5 h-5" />,
      },
    ],
  },
  {
    label: "TRACKING",
    items: [
      {
        label: "Item Short List",
        href: "/dashboard/shortlist",
        icon: <ListBulletIcon className="w-5 h-5" />,
      },
      {
        label: "Return List",
        href: "/dashboard/returns",
        icon: <ArrowUturnLeftIcon className="w-5 h-5" />,
      },
      {
        label: "Offer Ke Outlet",
        href: "/dashboard/offers",
        icon: <BuildingStorefrontIcon className="w-5 h-5" />,
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
        icon: <ClockIcon className="w-5 h-5" />,
      },
    ],
  },
  {
    label: "TOOLS",
    items: [
      {
        label: "Activity Log",
        href: "/dashboard/activity-log",
        icon: <QrCodeIcon className="w-5 h-5" />,
      },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/shortlist": "Item Short List",
  "/dashboard/returns": "Return List",
  "/dashboard/offers": "Offer Ke Outlet",
  "/dashboard/history-log": "History Log",
  "/dashboard/expiry": "Log New Expiry",
  "/dashboard/activity-log": "Activity Log",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Module-level sidebar — stable component identity so it doesn't unmount/remount
// when DashboardLayout state (e.g. mobileSidebarOpen) changes.
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
        style={{ height: "72px", borderBottom: "1px solid #e2e8f0" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#eff6ff" }}
        >
          <ClipboardDocumentListIcon className="w-5 h-5 text-[#2563eb]" />
        </div>
        <div>
          <p className="text-[#0f172a] font-bold text-sm leading-none">Expiry Tracker</p>
          <p className="text-[#64748b] text-xs font-medium mt-0.5">Outlet Inventory</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.managerOnly || isManager,
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label}>
              <p
                className="px-5 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
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
                      "flex items-center gap-3 pl-5 pr-4 py-2.5 text-sm transition-all border-l-[3px]",
                      isActive ? "font-semibold" : "font-medium hover:bg-[#f8fafc]",
                    )}
                    style={
                      isActive
                        ? { borderLeftColor: "#2563eb", background: "#eff6ff", color: "#2563eb" }
                        : { borderLeftColor: "transparent", color: "#64748b" }
                    }
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

      {/* User section */}
      <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: "1px solid #e2e8f0" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
            style={{ background: "#2563eb" }}
          >
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#0f172a] text-sm font-semibold truncate">{picName || username}</p>
            <p className="text-[#64748b] text-xs font-medium capitalize">{role}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="p-1.5 rounded-lg transition-colors text-[#94a3b8] hover:text-[#ef4444]"
          >
            <ArrowRightOnRectangleIcon className="w-[18px] h-[18px]" />
          </button>
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

  // Close mobile sidebar on route change instead of on every Link click. This
  // avoids triggering a layout re-render in the middle of navigation.
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
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
    <div className="flex h-screen overflow-hidden" style={{ background: "#f8fafc" }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0"
        style={{
          background: "#ffffff",
          boxShadow: "2px 0 12px rgba(0,0,0,0.06)",
          borderRight: "1px solid #e2e8f0",
        }}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside
            className="relative w-64 flex flex-col flex-shrink-0 z-10"
            style={{
              background: "#ffffff",
              boxShadow: "2px 0 12px rgba(0,0,0,0.12)",
            }}
          >
            <SidebarContent {...sidebarProps} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="flex items-center px-6 flex-shrink-0 bg-white relative"
          style={{
            height: "72px",
            borderBottom: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {/* Left: hamburger + title */}
          <div className="flex items-center gap-3 w-48 flex-shrink-0">
            <button
              className="lg:hidden p-2 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-[#0f172a]">{pageTitle}</h1>
              <p className="text-xs text-[#94a3b8] mt-0.5">{formatDate(new Date())}</p>
            </div>
          </div>

          {/* Center: search */}
          <div className="flex-1 flex justify-center">
            <div className="relative hidden sm:block">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="Search items, barcodes..."
                className="pl-9 pr-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] w-72"
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#0f172a",
                }}
              />
            </div>
          </div>

          {/* Right: bell + avatar */}
          <div className="flex items-center gap-2 w-48 justify-end flex-shrink-0">
            <button
              className="flex items-center justify-center rounded-full transition-colors text-[#64748b] hover:bg-[#f1f5f9]"
              style={{ width: "36px", height: "36px" }}
            >
              <BellIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#e2e8f0]">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-[#0f172a] leading-none">
                  {currentUser.picName || currentUser.username}
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                style={{ background: "#2563eb" }}
              >
                {userInitial}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6" style={{ background: "#f8fafc" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
