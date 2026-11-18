"use client";

import React from "react";
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
  PhoneCall,
  Send,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/matches", label: "Matches", icon: Heart },
  { href: "/explore", label: "Explore & Filter", icon: Sparkles },
  { href: "/requests", label: "Intro Requests", icon: Send },
  { href: "/messages", label: "Messages (Max 3)", icon: MessageCircle },
  { href: "/calls", label: "Voice & Video Calls", icon: PhoneCall },
  { href: "/profile/wizard", label: "My Profile Wizard", icon: User },
  { href: "/preferences", label: "Preferences & 5 Dealbreakers", icon: SlidersHorizontal },
  { href: "/verification", label: "ID Verification (Didit)", icon: ShieldCheck },
  { href: "/subscription", label: "Membership", icon: Crown },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Safety & Settings", icon: Settings },
];

export function UserShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

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
              <img src="/logo.png" alt="Ma'aak" className="h-10 w-auto" />
            </Link>
            <p className="mt-1.5 text-[11px] text-[#DFBE8A]/80">
              ME → WHAT I WANT → WHAT I REQUIRE
            </p>
          </div>

          <nav className="mt-4 space-y-1 px-4">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
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
              );
            })}
          </nav>
        </div>

        {/* Decorative Islamic Arch footer & Logout matching Mock1.png */}
        <div className="relative overflow-hidden border-t border-white/10 p-5">
          <div className="mb-4 rounded-xl border border-[#C59B5F]/25 bg-[#1F1A16] p-3.5 text-xs">
            <div className="font-serif font-semibold text-[#DFBE8A]">
              Privacy &amp; Dignity Active
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/65">
              Screenshot deterrents, watermarking, and 3-chat focus limits are
              active.
            </p>
          </div>
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
        {/* Top Mobile / Tablet Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E5DEC9] bg-[#14110E] px-4 py-3 text-[#FAF6F0] lg:bg-[#FAF6F0]/90 lg:px-8 lg:py-4 lg:text-[#1A1612] lg:backdrop-blur">
          <div className="flex items-center gap-3 lg:hidden">
            <Link href="/dashboard">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Ma'aak" className="h-8 w-auto" />
            </Link>
          </div>

          <div className="hidden lg:block">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#8C6D3F]">
              Ma&apos;aak Member Sanctuary
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/verification"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#C59B5F]/40 bg-[#C59B5F]/15 px-3 py-1.5 text-xs font-semibold text-[#8C6D3F] lg:text-[#6E5229]"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#C59B5F]" />
              <span>Verify ID</span>
            </Link>
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="rounded-full border border-[#E5DEC9] bg-white p-2 text-[#1A1612] shadow-xs hover:border-[#C59B5F]"
            >
              <Bell className="h-4 w-4" />
            </Link>
            <Link
              href="/profile/wizard"
              aria-label="My Profile"
              className="rounded-full border border-[#C59B5F] bg-[#14110E] p-2 text-[#DFBE8A]"
            >
              <User className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
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
