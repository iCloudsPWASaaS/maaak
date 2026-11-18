"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  FileText,
  GitBranch,
  ScrollText,
  CreditCard,
  BadgeCheck,
  MessageSquareText,
  ExternalLink,
  LogOut,
} from "lucide-react";

const ADMIN_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Members", icon: Users },
  { href: "/admin/moderation", label: "Reports & Moderation", icon: ShieldAlert },
  { href: "/admin/verifications", label: "ID Verifications", icon: BadgeCheck },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/matching", label: "Matching Engine", icon: GitBranch },
  { href: "/admin/cms", label: "CMS & Plans", icon: FileText },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquareText },
  { href: "/admin/audit", label: "Audit Logs", icon: ScrollText },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-[#F4F0E8] text-[#1A1612]">
      <aside className="hidden w-72 shrink-0 flex-col justify-between bg-[#14110E] text-[#FAF6F0] lg:flex">
        <div>
          <div className="border-b border-white/10 px-7 py-6">
            <Link href="/" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Ma'aak" className="h-10 w-auto" />
            </Link>
            <p className="mt-1.5 text-[11px] text-[#DFBE8A]/80">
              Administration &amp; Moderation
            </p>
          </div>

          <nav className="mt-4 space-y-1 px-4">
            {ADMIN_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-medium transition ${
                    active
                      ? "border border-[#C59B5F]/30 bg-[#332A1E] text-[#DFBE8A]"
                      : "text-white/75 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      active ? "text-[#C59B5F]" : "text-white/60"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-white/10 p-5">
          <Link
            href="/api/docs"
            target="_blank"
            className="flex items-center justify-between rounded-xl border border-[#C59B5F]/25 bg-[#1F1A16] px-3.5 py-3 text-xs text-[#DFBE8A]"
          >
            <span>API Documentation</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-white/80 hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E5DEC9] bg-[#14110E] px-4 py-3 text-[#FAF6F0] lg:bg-[#FAF6F0]/90 lg:px-8 lg:py-4 lg:text-[#1A1612] lg:backdrop-blur">
          <div className="lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Ma'aak" className="h-8 w-auto" />
          </div>
          <span className="hidden text-xs font-semibold uppercase tracking-widest text-[#8C6D3F] lg:block">
            MAAAK Control Room
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#DFBE8A] lg:hidden">
            Admin
          </span>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <nav className="fixed right-0 bottom-0 left-0 z-40 flex items-center justify-around overflow-x-auto border-t border-[#E5DEC9] bg-white px-2 py-2.5 shadow-lg lg:hidden">
        {ADMIN_ITEMS.slice(0, 6).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-16 flex-col items-center gap-1 text-[10px] font-medium ${
                active ? "text-[#9C743C]" : "text-[#665C4E]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
