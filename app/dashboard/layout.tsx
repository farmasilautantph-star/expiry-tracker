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
  TagIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
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
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      {
        label: "Offer Ke Outlet",
        href: "/dashboard/offers",
        managerOnly: true,
        icon: <TagIcon className="w-5 h-5" />,
      },
      {
        label: "History Log",
        href: "/dashboard/history-log",
        managerOnly: true,
        icon: <ClockIcon className="w-5 h-5" />,
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
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#64748b]">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Non-null assertion: we've confirmed user is not null above
  const currentUser = user;
  const pageTitle = PAGE_TITLES[pathname] ?? "Dashboard";
  const userInitial = (currentUser.picName?.charAt(0) ?? currentUser.username.charAt(0)).toUpperCase();

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-0 flex-shrink-0"
          style={{
            height: "72px",
            background: "#172d4a",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
            <ClipboardDocumentListIcon className="w-5 h-5 text-[#2563eb]" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Expiry Tracker</p>
            <p className="text-[#93c5fd] text-xs font-medium mt-0.5">Outlet Inventory</p>
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
              <div key={section.label}>
                <p
                  className="px-4 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: "#93c5fd" }}
                >
                  {section.label}
                </p>
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm transition-all",
                        isActive
                          ? "text-white font-semibold"
                          : "font-medium",
                      )}
                      style={
                        isActive
                          ? {
                              background: "#2563eb",
                              boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
                              color: "white",
                            }
                          : {
                              color: "#cbd5e1",
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.background =
                            "rgba(255,255,255,0.06)";
                          (e.currentTarget as HTMLElement).style.color = "white";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.background = "";
                          (e.currentTarget as HTMLElement).style.color = "#cbd5e1";
                        }
                      }}
                    >
                      <span
                        className="flex-shrink-0"
                        style={{ color: isActive ? "white" : "#64748b" }}
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
        <div
          className="px-4 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
              style={{ background: "#2563eb" }}
            >
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {currentUser.picName || currentUser.username}
              </p>
              <p className="text-[#93c5fd] text-xs font-medium capitalize">
                {currentUser.role}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "#64748b" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#64748b";
              }}
            >
              <ArrowRightOnRectangleIcon className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f8fafc" }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0"
        style={{
          background: "#1e3a5f",
          boxShadow: "2px 0 8px rgba(0,0,0,0.12)",
        }}
      >
        <SidebarContent />
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
              background: "#1e3a5f",
              boxShadow: "2px 0 8px rgba(0,0,0,0.12)",
            }}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="flex items-center justify-between px-6 flex-shrink-0 bg-white"
          style={{
            height: "64px",
            borderBottom: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
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

          <div className="flex items-center gap-2">
            {/* Bell */}
            <button
              className="flex items-center justify-center rounded-full transition-colors text-[#64748b] hover:bg-[#f1f5f9]"
              style={{ width: "36px", height: "36px" }}
            >
              <BellIcon className="w-5 h-5" />
            </button>

            {/* User avatar */}
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
