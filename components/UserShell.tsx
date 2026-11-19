"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Heart,
  MessageCircle,
  User,
  SlidersHorizontal,
  Crown,
  ShieldCheck,
  Bell,
  Compass,
  Send,
  Settings,
  LogOut,
  LifeBuoy,
  Menu,
  X,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/explore", label: "Discover", icon: Compass },
  { href: "/matches", label: "My Matches", icon: Heart },
  { href: "/requests", label: "Introductions", icon: Send },
  {
    href: "/profile/wizard",
    label: "My Profile",
    icon: User,
    separatorBefore: true,
  },
  { href: "/preferences", label: "My Preferences", icon: SlidersHorizontal },
  { href: "/verification", label: "Verification", icon: ShieldCheck },
  { href: "/subscription", label: "Membership", icon: Crown },
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    separatorBefore: true,
  },
  { href: "/settings", label: "Safety & Settings", icon: Settings },
  { href: "/faq", label: "Help & Support", icon: LifeBuoy },
];

export function UserShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-[#FAF6F0] text-[#1A1612]">
      {/* Desktop Left Sidebar matching Mock1.png */}
      <aside className="hidden w-72 shrink-0 flex-col justify-between bg-[#14110E] text-[#FAF6F0] lg:flex">
        <div>
          <div className="border-b border-white/10 px-7 py-6">
            <Link href="/dashboard" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Ma'aak" className="h-14 w-auto" />
            </Link>
          </div>

          <nav className="mt-4 space-y-1 px-4">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <React.Fragment key={item.href}>
                  {item.separatorBefore && (
                    <div className="mx-2 my-2 border-t border-[#493C2B]" />
                  )}
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-medium transition ${
                      active
                        ? "bg-[#332A1E] text-[#DFBE8A] shadow-inner border border-[#C59B5F]/30"
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
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Decorative Islamic Arch footer & Logout matching Mock1.png */}
        <div className="relative overflow-hidden border-t border-white/10 p-5">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col pb-20 lg:pb-0">
        {/* Mobile Header: hamburger, Verify ID + notifications */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E5DEC9] bg-[#14110E] px-4 py-3 text-[#FAF6F0] lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-1.5 text-white/85 transition hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <Link
              href="/verification"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#C59B5F]/40 bg-[#C59B5F]/15 px-3 py-1.5 text-[11px] font-semibold text-[#DFBE8A]"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Verify ID</span>
            </Link>
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative rounded-full border border-white/20 bg-white/5 p-2 text-white/85"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#DFBE8A]" />
            </Link>
          </div>
        </header>

        <main
          className={`mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-8 ${
            pathname === "/matches"
              ? "pt-0 pb-20 lg:pt-8 lg:pb-6"
              : "py-6 pb-20 lg:pb-0"
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile slide-out navigation drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 h-full w-full bg-black/60 transition-opacity duration-300 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`relative flex h-full w-[82%] max-w-xs flex-col bg-[#14110E] text-[#FAF6F0] shadow-2xl transition-transform duration-300 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <Link
              href="/dashboard"
              onClick={() => setDrawerOpen(false)}
              className="inline-block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Ma'aak" className="h-12 w-auto" />
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <React.Fragment key={item.href}>
                  {item.separatorBefore && (
                    <div className="mx-1 my-2 border-t border-[#493C2B]" />
                  )}
                  <Link
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition ${
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
                </React.Fragment>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation Bar matching Mock1.png & Mock2.png */}
      <nav className="fixed right-0 bottom-0 left-0 z-40 flex items-center justify-around border-t border-[#E5DEC9] bg-white px-2 py-2.5 shadow-lg lg:hidden">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
            pathname === "/dashboard" ? "text-[#9C743C]" : "text-[#665C4E]"
          }`}
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Link>
        <Link
          href="/matches"
          className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
            pathname.startsWith("/matches") || pathname.startsWith("/explore")
              ? "text-[#9C743C]"
              : "text-[#665C4E]"
          }`}
        >
          <Heart className="h-4 w-4" />
          <span>Matches</span>
        </Link>
        <Link
          href="/requests"
          className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
            pathname.startsWith("/requests") ? "text-[#9C743C]" : "text-[#665C4E]"
          }`}
        >
          <Send className="h-4 w-4" />
          <span>Requests</span>
        </Link>
        <Link
          href="/messages"
          className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
            pathname.startsWith("/messages") ? "text-[#9C743C]" : "text-[#665C4E]"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          <span>Messages</span>
        </Link>
        <Link
          href="/profile/wizard"
          className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
            pathname.startsWith("/profile") || pathname.startsWith("/preferences")
              ? "text-[#9C743C]"
              : "text-[#665C4E]"
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
