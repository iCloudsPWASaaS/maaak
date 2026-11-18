"use client";

import React from "react";
import Link from "next/link";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <span className="text-xs font-bold uppercase tracking-widest text-[#9C743C]">
        {eyebrow}
      </span>
      <h1 className="mt-1 font-serif text-3xl font-semibold text-[#1A1612]">
        {title}
      </h1>
      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#665C4E]">
        {description}
      </p>
    </div>
  );
}

export function AdminNotice({
  message,
  tone = "success",
}: {
  message: string;
  tone?: "success" | "error" | "info";
}) {
  const toneClass =
    tone === "error"
      ? "border-rose-300 bg-rose-50 text-rose-800"
      : tone === "info"
        ? "border-[#C59B5F] bg-[#FAF6F0] text-[#6E5229]"
        : "border-emerald-300 bg-emerald-50 text-emerald-800";
  return (
    <div
      className={`fixed right-6 bottom-20 z-50 max-w-sm rounded-full border px-5 py-3 text-xs font-semibold shadow-xl ${toneClass}`}
    >
      {message}
    </div>
  );
}

export function AdminAccessDenied() {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-10 text-center shadow-xs">
      <h1 className="font-serif text-2xl font-semibold text-[#1A1612]">
        Administrator Access Required
      </h1>
      <p className="mt-2 text-xs leading-relaxed text-[#665C4E]">
        This control room is restricted to super administrators, administrators,
        and moderators. Sign in with an authorised account to continue.
      </p>
      <Link
        href="/login"
        className="mt-5 inline-block rounded-full bg-[#14110E] px-6 py-2.5 text-xs font-semibold text-[#DFBE8A]"
      >
        Go to Secure Sign In
      </Link>
    </div>
  );
}

export function AdminLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="h-32 animate-pulse rounded-2xl bg-[#EAE2D4]" />
      ))}
    </div>
  );
}

export function formatDate(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export function statusStyle(status: unknown): string {
  const s = String(status || "").toLowerCase();
  if (["active", "approved", "resolved", "paid", "published", "completed"].includes(s)) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (
    ["pending", "in_progress", "new", "reviewing", "trialing", "ringing"].includes(s)
  ) {
    return "bg-amber-100 text-amber-800";
  }
  if (
    ["suspended", "rejected", "blocked", "failed", "cancelled", "deactivated"].includes(s)
  ) {
    return "bg-rose-100 text-rose-800";
  }
  return "bg-[#EFE8DC] text-[#6E5229]";
}

export function parseJsonSafe<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
