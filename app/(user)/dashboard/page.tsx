"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  Lock,
  Check,
  Heart,
  MessageCircle,
  Sparkles,
  Crown,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { WatermarkedPhoto } from "@/components/SecurityProtectionLayer";

interface MatchItem {
  id: string;
  first_name: string;
  username: string;
  id_verified: boolean;
  age: number | null;
  city: string;
  postcode_area: string;
  profession: string;
  has_children: boolean;
  children_count: string;
  short_bio: string;
  photos: { id: string; url: string; watermark?: string }[];
  compatibility?: {
    mutual_score: number;
    is_gale_shapley_optimal?: boolean;
    area_breakdown?: Record<string, number>;
    match_reasons?: string[];
  };
}

export default function UserDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [meData, setMeData] = useState<Record<string, unknown> | null>(null);
  const [recommended, setRecommended] = useState<MatchItem[]>([]);
  const [topMatch, setTopMatch] = useState<MatchItem | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Email/Mobile OTP verification quick box
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");

  async function loadDashboard() {
    setLoading(true);
    try {
      const [meRes, recRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/matches/recommended"),
      ]);
      if (meRes.ok) {
        const meJson = await meRes.json();
        setMeData(meJson.data || null);
      }
      if (recRes.ok) {
        const recJson = await recRes.json();
        setRecommended(recJson.data?.recommended || []);
        setTopMatch(recJson.data?.topMatch || null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleRecalculate() {
    setRecalculating(true);
    const res = await fetch("/api/v1/matches/recalculate", { method: "POST" });
    if (res.ok) {
      setToast("Gale-Shapley stable matches recalculated!");
      await loadDashboard();
    }
    setRecalculating(false);
    setTimeout(() => setToast(null), 4000);
  }

  async function handleLike(targetId: string) {
    const res = await fetch(`/api/v1/profiles/${targetId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "like" }),
    });
    if (res.ok) {
      setToast("Saved to your liked profiles!");
      setTimeout(() => setToast(null), 3000);
    }
  }

  async function handleVerifyOtp(type: "email" | "mobile") {
    const endpoint =
      type === "email"
        ? "/api/v1/auth/verify-email"
        : "/api/v1/auth/verify-mobile";
    const code = type === "email" ? emailOtp : mobileOtp;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    setToast(json.message);
    if (res.ok) loadDashboard();
    setTimeout(() => setToast(null), 4000);
  }

  if (loading) {
    return (
      <div className="space-y-6 py-8">
        <div className="h-28 animate-pulse rounded-3xl bg-[#EFE8DC]" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-80 animate-pulse rounded-3xl bg-[#EFE8DC]" />
          <div className="h-80 animate-pulse rounded-3xl bg-[#EFE8DC]" />
          <div className="h-80 animate-pulse rounded-3xl bg-[#EFE8DC]" />
        </div>
      </div>
    );
  }

  const user = (meData?.user || {}) as Record<string, unknown>;
  const completion = (meData?.completion || { percentage: 0 }) as {
    percentage: number;
    hasMinimumPhotos?: boolean;
  };
  const entitlements = (meData?.entitlements || {}) as {
    planName?: string;
    planSlug?: string;
    isTrial?: boolean;
    introductionRequestsRemaining?: number | null;
    maxIntroductionRequests?: number | null;
  };
  const activeChatsCount = Number(meData?.activeChatsCount || 0);

  const highlightMatch = topMatch || recommended[0] || null;
  const highlightScore = highlightMatch?.compatibility?.mutual_score || 92;
  const highlightReasons = highlightMatch?.compatibility?.match_reasons || [
    "Similar family values",
    "Aligned relationship goals",
    "Compatible lifestyle and interests",
  ];

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl">
          {toast}
        </div>
      )}

      {/* Header matching Mock1.png */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold text-[#1A1612]">
            Welcome to <span className="text-[#9C743C]">Ma&apos;aak</span>
            {user.first_name ? `, ${String(user.first_name)}` : ""}
          </h1>
          <p className="mt-1 text-sm text-[#5C5346]">
            A meaningful space for single parents &amp; marriage-minded Muslims
            to find a compatible partner.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="inline-flex items-center gap-2 rounded-full border border-[#C59B5F] bg-white px-4 py-2 text-xs font-semibold text-[#1A1612] shadow-xs hover:bg-[#FAF6F0]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-[#9C743C] ${
                recalculating ? "animate-spin" : ""
              }`}
            />
            <span>Recalculate Gale-Shapley Matches</span>
          </button>
          <Link
            href="/profile/wizard"
            className="inline-flex items-center gap-2 rounded-full bg-[#14110E] px-5 py-2 text-xs font-semibold text-[#DFBE8A]"
          >
            <span>Profile {completion.percentage}% Complete</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 3 Trust Cards matching Mock1.png */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3.5 rounded-2xl border border-[#E5DEC9] bg-white p-5 shadow-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FAF6F0] text-[#9C743C]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1A1612]">
              Verified members
            </h3>
            <p className="mt-0.5 text-xs text-[#665C4E]">
              Didit Identity &amp; age checked
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 rounded-2xl border border-[#E5DEC9] bg-white p-5 shadow-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FAF6F0] text-[#9C743C]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1A1612]">
              Single-parent focused
            </h3>
            <p className="mt-0.5 text-xs text-[#665C4E]">
              Meet people who understand family life
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 rounded-2xl border border-[#E5DEC9] bg-white p-5 shadow-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FAF6F0] text-[#9C743C]">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1A1612]">
              A safer experience
            </h3>
            <p className="mt-0.5 text-xs text-[#665C4E]">
              Active Chats: {String(activeChatsCount)}/3 • Copy &amp; screenshot
              deterrents
            </p>
          </div>
        </div>
      </div>

      {/* Subscription & Verification Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#C59B5F]/40 bg-[#14110E] px-6 py-4 text-xs text-[#FAF6F0]">
        <div className="flex items-center gap-3">
          <Crown className="h-4 w-4 text-[#DFBE8A]" />
          <span>
            Current Plan: <strong className="text-[#DFBE8A]">{entitlements.planName || "Free Membership"}</strong>
            {entitlements.isTrial && " (1st Month Free Trial Active)"}
            {entitlements.maxIntroductionRequests !== null &&
              entitlements.maxIntroductionRequests !== undefined &&
              ` • ${entitlements.introductionRequestsRemaining} of ${entitlements.maxIntroductionRequests} Free Intro Requests Remaining`}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/preferences"
            className="font-semibold text-[#DFBE8A] underline"
          >
            Manage 5 Dealbreakers
          </Link>
          <Link
            href="/subscription"
            className="rounded-full bg-[#C59B5F] px-3.5 py-1 font-bold text-[#14110E]"
          >
            Manage Plan
          </Link>
        </div>
      </div>

      {/* Optional Email/Mobile OTP Verification Bar if unverified */}
      {Boolean(user.id) && (!user.email_verified || !user.mobile_verified) && (
        <div className="rounded-2xl border border-amber-600/30 bg-amber-50/70 p-4 text-xs text-[#1A1612]">
          <div className="font-semibold text-[#8C6D3F]">
            Complete Account Contact Verification
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {Boolean(!user.email_verified) && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Email 6-digit OTP"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  className="rounded-lg border border-[#E5DEC9] bg-white px-3 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => handleVerifyOtp("email")}
                  className="rounded-lg bg-[#14110E] px-3 py-1.5 font-semibold text-[#DFBE8A]"
                >
                  Verify Email
                </button>
              </div>
            )}
            {Boolean(!user.mobile_verified) && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Mobile 6-digit OTP"
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value)}
                  className="rounded-lg border border-[#E5DEC9] bg-white px-3 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => handleVerifyOtp("mobile")}
                  className="rounded-lg bg-[#14110E] px-3 py-1.5 font-semibold text-[#DFBE8A]"
                >
                  Verify Mobile
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommended for You Section matching Mock1.png */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[#1A1612]">
            Recommended for you
          </h2>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#9C743C] hover:underline"
          >
            <span>See all matches</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recommended.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-[#E5DEC9] bg-white p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-[#9C743C]" />
            <h3 className="mt-3 font-serif text-xl font-semibold text-[#1A1612]">
              Complete Your Profile or Sign In to View Personalised Matches
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-[#665C4E]">
              Our Gale-Shapley engine filters out dealbreaker mismatches first
              to show you only mutually eligible marriage candidates.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                href="/profile/wizard"
                className="rounded-full bg-[#14110E] px-5 py-2.5 text-xs font-semibold text-[#DFBE8A]"
              >
                Open Profile Wizard
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-[#C59B5F] px-5 py-2.5 text-xs font-semibold text-[#1A1612]"
              >
                Switch Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.slice(0, 6).map((m) => {
              const photoUrl =
                m.photos?.[0]?.url ||
                "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80";
              const score = m.compatibility?.mutual_score ?? 90;
              const isGsOptimal = Boolean(
                m.compatibility?.is_gale_shapley_optimal,
              );

              return (
                <div
                  key={m.id}
                  className="group overflow-hidden rounded-3xl border border-[#E5DEC9] bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative h-80 w-full">
                    <WatermarkedPhoto
                      src={photoUrl}
                      alt={m.first_name}
                      watermarkText={
                        m.photos?.[0]?.watermark || "MA'AAK VERIFIED"
                      }
                      className="h-full w-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3.5 right-3.5 left-3.5 flex items-center justify-between">
                      {m.id_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#1A1612] shadow">
                          <ShieldCheck className="h-3.5 w-3.5 text-[#9C743C]" />
                          Verified
                        </span>
                      ) : (
                        <span />
                      )}

                      {isGsOptimal && (
                        <span className="rounded-full bg-[#14110E]/90 px-3 py-1 text-[10px] font-semibold text-[#DFBE8A] border border-[#C59B5F]/50">
                          Gale-Shapley #1
                        </span>
                      )}
                    </div>

                    {/* Bottom Overlay Info matching Mock1.png */}
                    <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between text-white">
                      <div>
                        <h3 className="font-serif text-2xl font-semibold">
                          {m.first_name}
                          {m.age ? `, ${m.age}` : ""}
                        </h3>
                        <p className="text-xs text-white/85">
                          {m.has_children
                            ? `Parent of ${m.children_count}`
                            : m.profession || m.city}
                          {m.city ? ` • ${m.city}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#B58E53] px-3 py-1 text-xs font-bold text-white shadow">
                        {score}% Match
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-4">
                    <Link
                      href={`/profiles/${m.id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#14110E] py-2.5 text-xs font-semibold text-[#FAF6F0] transition hover:bg-[#2A221B]"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-[#DFBE8A]" />
                      <span>View Profile &amp; Connect</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleLike(m.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E5DEC9] bg-[#FAF6F0] px-4 py-2.5 text-xs font-semibold text-[#1A1612] hover:border-[#C59B5F]"
                    >
                      <Heart className="h-3.5 w-3.5 text-[#9C743C]" />
                      <span>Like</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Compatibility & Single-Parent Cards matching Mock1.png */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-[#E5DEC9] bg-white p-7 shadow-xs sm:flex-row lg:col-span-7">
          <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-[6px] border-[#B58E53] bg-[#FAF6F0]">
            <span className="font-serif text-3xl font-bold text-[#1A1612]">
              {highlightScore}%
            </span>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#9C743C]">
              Your Compatibility
              {highlightMatch ? ` with ${highlightMatch.first_name}` : ""}
            </div>
            <h3 className="mt-1 font-serif text-xl font-semibold text-[#1A1612]">
              Why this is a great match
            </h3>
            <ul className="mt-3 space-y-1.5 text-xs text-[#3D362D]">
              {highlightReasons.map((reason, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#9C743C]" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center gap-5 rounded-3xl border border-[#E5DEC9] bg-[#F2EBE0] p-7 lg:col-span-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#9C743C] shadow-xs">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#1A1612]">
              Tailored for single parents
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#5C5346]">
              Find someone who understands your family life, parenting
              commitments, and future household goals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
