"use client";

import { useEffect, useRef, useState } from "react";
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
  UserGroupIcon,
} from "@heroicons/react/24/outline";

interface NotifEntry {
  id: number;
  action: string;
  description: string | null;
  timestamp: string;
  pic_name: string | null;
  time_ago: string;
}

const NOTIF_STYLE: Record<string, { color: string; bg: string }> = {
  CREATE: { color: "#15803d", bg: "#f0fdf4" },
  UPDATE: { color: "#1d4ed8", bg: "#eef3fa" },
  DELETE: { color: "#b91c1c", bg: "#fef2f2" },
};
const DEFAULT_NOTIF_STYLE = { color: "#7c3aed", bg: "#f5f3ff" };

function notifTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

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

      {/* User section */}
      <div className="px-3 py-4 flex-shrink-0" style={{ borderTop: "1px solid #f1f5f9" }}>
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
              style={{ background: "#2563eb" }}
            >
              {userInitial}
            </div>
            <div className="min-w-0">
              <p className="text-[#0f172a] text-sm font-semibold truncate leading-none">
                {picName || username}
              </p>
              <p className="text-[#94a3b8] text-xs font-medium capitalize mt-0.5">{role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifEntry[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [lastReadTime, setLastReadTime] = useState<number>(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const stored = localStorage.getItem("last_read_notification_time");
    if (stored) setLastReadTime(Number(stored));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/activity/recent?limit=10")
      .then((r) => r.json())
      .then((d) => { if (d?.success) setNotifications(d.data as NotifEntry[]); })
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  }, [user]);

  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [notifOpen]);

  function markAllRead() {
    const now = Date.now();
    setLastReadTime(now);
    localStorage.setItem("last_read_notification_time", String(now));
  }

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
          className="hidden md:flex items-center justify-between px-6 flex-shrink-0 bg-white"
          style={{
            height: "72px",
            borderBottom: "1px solid #f1f5f9",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {/* Left: hamburger + title */}
          <div className="flex items-center gap-3">
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

          {/* Right: bell + user */}
          <div className="flex items-center gap-3">
            {/* Bell with notification dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors text-[#64748b] hover:bg-[#f1f5f9]"
              >
                <BellIcon className="w-5 h-5" />
                {notifications.some((n) => new Date(n.timestamp).getTime() > lastReadTime) && (
                  <span
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                    style={{ background: "#ef4444", border: "1.5px solid white" }}
                  />
                )}
              </button>

              {notifOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 z-50 bg-white rounded-xl border border-slate-100 shadow-lg overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="text-sm font-semibold text-[#0f172a]">Notifications</span>
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    >
                      Mark all read
                    </button>
                  </div>
                  {/* List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifLoading ? (
                      [0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 animate-pulse">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="h-3 bg-slate-100 rounded w-3/4 mb-2" />
                            <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                          </div>
                        </div>
                      ))
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-[#94a3b8]">
                        <BellIcon className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((n, idx) => {
                        const s = NOTIF_STYLE[n.action] ?? DEFAULT_NOTIF_STYLE;
                        const isUnread = new Date(n.timestamp).getTime() > lastReadTime;
                        return (
                          <div
                            key={n.id}
                            className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0"
                            style={{ background: isUnread ? "#fafbff" : "#fff" }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                              style={{ background: s.bg }}
                            >
                              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-xs leading-snug text-[#0f172a] line-clamp-2"
                                style={{ fontWeight: isUnread ? 600 : 500 }}
                              >
                                {n.description ?? "—"}
                              </p>
                              <p className="text-[11px] text-[#94a3b8] mt-1">
                                {n.pic_name ? `${n.pic_name} · ` : ""}{notifTimeAgo(n.timestamp)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
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
