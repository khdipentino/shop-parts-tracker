"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";

type NavItem = { href: string; label: string };

export default function AppShell({
  fullName,
  isAdmin,
  children,
}: {
  fullName: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const mainNav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/checkout", label: "Checkout (issue parts)" },
    { href: "/receive", label: "Receive parts" },
    { href: "/returns", label: "Returns" },
    { href: "/parts", label: "Parts" },
    { href: "/employees", label: "Employees" },
    { href: "/invoices", label: "Receipt history" },
  ];
  const adminNav: NavItem[] = [
    { href: "/admin/pending-requests", label: "Pending requests" },
    { href: "/admin/users", label: "Manage staff" },
  ];

  function linkClass(href: string) {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return `block px-3 py-2 rounded-md text-sm transition-colors ${
      active
        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
    }`;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="no-print sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle navigation"
              className="p-2 -ml-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm sm:text-base">
              Shop Parts Tracker
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-sm shrink-0">
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline truncate max-w-48">
              {fullName}
              {isAdmin ? " · Admin" : ""}
            </span>
            <form action={signOut}>
              <button className="text-slate-500 dark:text-slate-400 underline whitespace-nowrap">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {open && (
        <>
          <div
            className="no-print fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />
          <aside className="no-print fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 p-4 space-y-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="px-3 pb-2 text-sm text-slate-500 dark:text-slate-400 sm:hidden">{fullName}</p>
            {mainNav.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <>
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 px-3 pb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Admin
                </div>
                {adminNav.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={linkClass(item.href)}>
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </aside>
        </>
      )}

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
