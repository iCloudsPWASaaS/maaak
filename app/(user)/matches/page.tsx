"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Bookmark,
  Compass,
  Crown,
  Heart,
  MapPin,
  MessageCircle,
  Puzzle,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  User,
  Users,
} from "lucide-react";
import { WatermarkedPhoto } from "@/components/SecurityProtectionLayer";

interface MatchCardItem {
  id: string;
  first_name: string;
  username: string;
  id_verified: boolean;
  age: number | null;
  city: string;
  postcode_area: string;
  profession: string;
  education_level: string;
  religion: string;
  religious_denomination: string;
  relationship_status: string;
  looking_for_intention?: string | null;
  country?: string | null;
  hobbies_interests?: string[];
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
  my_action?: string | null;
}

const MOBILE_TABS = [
  { href: "/explore", label: "Discover", icon: Compass },
  { href: "/matches", label: "Matches", icon: Heart },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/profile/wizard", label: "You", icon: User },
];

function isLiked(action?: string | null) {
  return action === "like" || action === "thumbs_up";
}

function isPassed(action?: string | null) {
  return action === "dislike" || action === "thumbs_down";
}

export default function RecommendedMatchesPage() {
  const [matches, setMatches] = useState<MatchCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingBookmark, setPendingBookmark] = useState<string | null>(null);
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  async function loadMatches() {
    setLoading(true);
    const res = await fetch("/api/v1/matches/recommended");
    if (res.ok) {
      const json = await res.json();
      setMatches(json.data?.recommended || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMatches();
  }, []);

  async function handleAction(
    targetId: string,
    type: "like" | "dislike" | "thumbs_up" | "thumbs_down",
  ) {
    const endpoint =
      type === "like" || type === "thumbs_up"
        ? `/api/v1/profiles/${targetId}/like`
        : `/api/v1/profiles/${targetId}/dislike`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: type }),
    });
    if (!res.ok) return;

    setMatches((current) =>
      current.map((match) =>
        match.id === targetId ? { ...match, my_action: type } : match,
      ),
    );
    setToast(`Recorded ${type.replace("_", " ")}!`);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleBookmark(targetId: string) {
    setPendingBookmark(targetId);

    try {
      const res = await fetch(`/api/v1/profiles/${targetId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bookmark" }),
      });

      if (!res.ok) return;

      const json = await res.json();
      const removed = Boolean(json.data?.removed);
      const nextAction = removed ? null : "bookmark";

      setMatches((current) =>
        current.map((match) =>
          match.id === targetId ? { ...match, my_action: nextAction } : match,
        ),
      );
      setToast(removed ? "Removed from bookmarks." : "Saved to your bookmarks.");
      setTimeout(() => setToast(null), 3000);
    } catch {
      return;
    } finally {
      setPendingBookmark(null);
    }
  }

  async function handleSendIntro(targetId: string, name: string) {
    const res = await fetch("/api/v1/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiverId: targetId,
        message: `Assalamu Alaikum ${name}, our compatibility and family values align closely—I would be honoured to introduce myself.`,
      }),
    });
    const json = await res.json();
    setToast(json.message || "Introduction request sent!");
    setTimeout(() => setToast(null), 4000);
  }

  const savedMatches = matches.filter(
    (match) => isLiked(match.my_action) || match.my_action === "bookmark",
  );

  useEffect(() => {
    setSpotlightIndex((current) =>
      current >= savedMatches.length ? 0 : current,
    );
  }, [savedMatches.length]);

  useEffect(() => {
    if (savedMatches.length <= 1) return;

    const interval = window.setInterval(() => {
      setSpotlightIndex((current) => (current + 1) % savedMatches.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [savedMatches.length]);

  const topMatch =
    savedMatches[
      Math.min(spotlightIndex, Math.max(savedMatches.length - 1, 0))
    ] || null;
  const mobileBookmarked = topMatch?.my_action === "bookmark";
  const mobileLiked = isLiked(topMatch?.my_action);
  const mobilePassed = isPassed(topMatch?.my_action);
  const mobileScore = topMatch?.compatibility?.mutual_score ?? 92;
  const mobileIntention = topMatch?.looking_for_intention || "Marriage";
  const mobileParenthood = topMatch?.has_children
    ? `Single parent (${topMatch.children_count || "1"} ${topMatch.children_count === "1" || !topMatch.children_count ? "child" : "children"})`
    : "No children";
  const mobileInterests = topMatch?.hobbies_interests?.length
    ? topMatch.hobbies_interests.slice(0, 4)
    : ["Faith & Values", "Family Oriented", "Outdoors", "Learning"];

  return (
    <div>
      {toast && (
        <div className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl">
          {toast}
        </div>
      )}

      <div className="-mx-4 space-y-4 bg-[#14110E] px-4 pt-3 pb-6 text-[#FAF6F0] sm:-mx-6 sm:px-6 lg:hidden">
        <div className="grid grid-cols-4 gap-2">
          {MOBILE_TABS.map((tab, index) => {
            const Icon = tab.icon;
            const active = index === 0;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[11px] font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-[#C59B5F] to-[#DFBE8A] text-[#14110E]"
                    : "border border-white/15 text-white/70"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        {loading ? (
          <div className="h-[560px] animate-pulse rounded-[2rem] bg-[#1F1A16]" />
        ) : topMatch ? (
          <div className="overflow-hidden rounded-[2rem] bg-[#F3E9DC] text-[#1A1612] shadow-2xl">
            <div className="relative h-[52vh] min-h-[340px] max-h-[460px]">
              <WatermarkedPhoto
                src={
                  topMatch.photos?.[0]?.url ||
                  "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80"
                }
                alt={topMatch.first_name}
                watermarkText={topMatch.photos?.[0]?.watermark || "MA'AAK PROTECTED"}
                className="h-full w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/25" />
              <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#C59B5F] to-[#DFBE8A] px-3 py-1.5 text-[11px] font-bold text-[#14110E] shadow">
                <Crown className="h-3.5 w-3.5" />
                Premium
              </div>
              <button
                type="button"
                aria-label={mobileBookmarked ? "Remove bookmark" : "Save profile"}
                aria-pressed={mobileBookmarked}
                title={mobileBookmarked ? "Remove bookmark" : "Save profile"}
                disabled={pendingBookmark === topMatch.id}
                onClick={() => handleBookmark(topMatch.id)}
                className={`absolute top-4 right-4 rounded-full border p-2.5 text-white backdrop-blur disabled:opacity-50 ${
                  mobileBookmarked
                    ? "border-[#DFBE8A] bg-[#C59B5F]"
                    : "border-white/30 bg-black/40"
                }`}
              >
                <Bookmark
                  className={`h-4 w-4 ${mobileBookmarked ? "fill-current" : ""}`}
                />
              </button>
              <div className="absolute right-5 bottom-6 left-5 text-white">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-3xl font-semibold">
                    {topMatch.first_name}, {topMatch.age}
                  </h2>
                  {topMatch.id_verified && (
                    <BadgeCheck className="h-5 w-5 text-[#DFBE8A]" />
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/85">
                  <MapPin className="h-3.5 w-3.5" />
                  {topMatch.city || "London"}, {topMatch.country || "UK"} · within 15 miles
                </p>
              </div>
            </div>

            <div className="relative -mt-8 rounded-t-[2rem] bg-[#F3E9DC] px-5 pt-6 pb-6 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
              <div className="grid grid-cols-3 divide-x divide-[#DCCBB4]">
                <div className="px-1 text-center">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-[#C59B5F]/40 bg-white/70">
                    <Heart className="h-4 w-4 text-[#9C743C]" />
                  </div>
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-[#8C6D3F]">
                    Relationship Intentions
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#1A1612]">
                    {mobileIntention}
                  </p>
                </div>
                <div className="px-1 text-center">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-[#C59B5F]/40 bg-white/70">
                    <Users className="h-4 w-4 text-[#9C743C]" />
                  </div>
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-[#8C6D3F]">
                    Parenthood
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#1A1612]">
                    {mobileParenthood}
                  </p>
                </div>
                <div className="px-1 text-center">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-[#C59B5F]/40 bg-white/70">
                    <Puzzle className="h-4 w-4 text-[#9C743C]" />
                  </div>
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-[#8C6D3F]">
                    Compatibility
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#1A1612]">
                    High match ({mobileScore}%)
                  </p>
                </div>
              </div>

              <div className="my-5 h-px bg-[#DCCBB4]" />

              <h3 className="font-serif text-lg font-semibold text-[#1A1612]">
                About Me
              </h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5C5346]">
                {topMatch.short_bio ||
                  "A thoughtful, faith-centred partner seeking a meaningful marriage."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {mobileInterests.map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1 rounded-full border border-[#C59B5F]/30 bg-[#E8D8C3] px-3 py-1.5 text-[11px] font-medium text-[#6E5229]"
                  >
                    <Sparkles className="h-3 w-3" />
                    {interest}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-center gap-6">
                <button
                  type="button"
                  aria-label="Dislike"
                  aria-pressed={mobilePassed}
                  onClick={() => handleAction(topMatch.id, "dislike")}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border shadow transition ${
                    mobilePassed
                      ? "border-[#C65B5B] bg-[#FEF3F3] text-[#C65B5B]"
                      : "border-[#E5DEC9] bg-white text-[#1A1612]"
                  }`}
                >
                  <ThumbsDown
                    className={`h-5 w-5 ${mobilePassed ? "fill-current" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  aria-label="Like"
                  aria-pressed={mobileLiked}
                  onClick={() => handleAction(topMatch.id, "like")}
                  className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition ${
                    mobileLiked
                      ? "bg-[#2F8B4E]"
                      : "bg-gradient-to-br from-[#C59B5F] to-[#DFBE8A]"
                  }`}
                >
                  <ThumbsUp
                    className={`h-7 w-7 ${mobileLiked ? "fill-current" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  aria-label="Send message"
                  onClick={() => handleSendIntro(topMatch.id, topMatch.first_name)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E5DEC9] bg-white text-[#1A1612] shadow"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] bg-[#F3E9DC] p-8 text-center">
            <p className="font-serif text-lg font-semibold text-[#1A1612]">
              No saved profiles yet
            </p>
            <p className="mt-1 text-xs text-[#665C4E]">
              Like or bookmark a profile and it will appear here.
            </p>
          </div>
        )}
      </div>

      <div className="hidden space-y-8 lg:block">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#1A1612] sm:text-4xl">
            Your Saved &amp; Liked Profiles
          </h1>
        </div>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/v1/matches/recalculate", { method: "POST" });
            loadMatches();
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#14110E] px-5 py-2.5 text-xs font-semibold text-[#DFBE8A]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Run Gale-Shapley Engine</span>
        </button>
      </div>

      {/* Saved profile spotlight */}
      {topMatch && (
        <div className="overflow-hidden rounded-3xl border border-[#E5DEC9] bg-white shadow-sm">
          <div className="grid items-center gap-6 lg:grid-cols-12">
            <div className="relative h-72 sm:h-80 lg:col-span-6">
              <WatermarkedPhoto
                src={
                  topMatch.photos?.[0]?.url ||
                  "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80"
                }
                alt={topMatch.first_name}
                className="h-full w-full"
                fit="contain"
                showWatermark={false}
              />
            </div>

            <div className="p-5 sm:p-6 lg:col-span-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C59B5F] px-3 py-1 text-xs font-bold text-[#14110E]">
                  <Sparkles className="h-3.5 w-3.5" /> Saved Profile
                  {savedMatches.length > 1
                    ? ` ${spotlightIndex + 1}/${savedMatches.length}`
                    : ""}
                </span>
                <span className="rounded-full border border-[#C59B5F]/50 px-3 py-1 text-xs font-semibold text-[#9C743C]">
                  {topMatch.compatibility?.mutual_score ?? 95}% Mutual
                  Compatibility
                </span>
              </div>

              <h2 className="mt-3 font-serif text-2xl font-semibold text-[#1A1612] sm:text-3xl">
                {topMatch.first_name}
                {topMatch.age ? `, ${topMatch.age}` : ""}
              </h2>
              <p className="mt-1 text-xs text-[#665C4E]">
                {topMatch.city} ({topMatch.postcode_area}) •{" "}
                {topMatch.profession} • {topMatch.relationship_status} •{" "}
                {topMatch.has_children
                  ? `Parent of ${topMatch.children_count}`
                  : "No children"}
              </p>

              <p className="mt-3 text-xs leading-relaxed text-[#4A4238] sm:text-sm">
                {topMatch.short_bio}
              </p>

              {topMatch.compatibility?.area_breakdown && (
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {Object.entries(topMatch.compatibility.area_breakdown).map(
                    ([area, val]) => (
                      <div
                        key={area}
                        className="rounded-xl border border-[#E5DEC9] bg-[#FBF7F2] px-3 py-2"
                      >
                        <div className="text-[10px] uppercase text-[#665C4E]">
                          {area.replace("_", " ")}
                        </div>
                        <div className="font-serif text-lg font-bold text-[#9C743C]">
                          {val}%
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/profiles/${topMatch.id}`}
                  className="rounded-full bg-gradient-to-r from-[#C59B5F] to-[#DFBE8A] px-6 py-2.5 text-xs font-bold text-[#14110E]"
                >
                  View Full Profile
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    handleSendIntro(topMatch.id, topMatch.first_name)
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#C59B5F] px-5 py-2.5 text-xs font-semibold text-[#9C743C]"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Introduction Request</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved and liked profiles */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-3xl bg-[#EFE8DC]" />
          <div className="h-80 animate-pulse rounded-3xl bg-[#EFE8DC]" />
          <div className="h-80 animate-pulse rounded-3xl bg-[#EFE8DC]" />
        </div>
      ) : savedMatches.length === 0 ? (
        <div className="rounded-3xl border border-[#E5DEC9] bg-white p-10 text-center">
          <p className="font-serif text-xl font-semibold text-[#1A1612]">
            No saved profiles yet
          </p>
          <p className="mt-1 text-xs text-[#665C4E]">
            Like or bookmark a profile and it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {savedMatches.map((m) => (
            <div
              key={m.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#E8E0D4] bg-white shadow-[0_8px_24px_rgba(64,45,22,0.05)] transition hover:shadow-[0_14px_32px_rgba(64,45,22,0.1)]"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                <WatermarkedPhoto
                  src={
                    m.photos?.[0]?.url ||
                    "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80"
                  }
                  alt={`${m.first_name}'s profile`}
                  watermarkText={m.photos?.[0]?.watermark || "MA'AAK VERIFIED"}
                  className="h-full w-full"
                />
                <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#3D362D] shadow-sm">
                    <Star className="h-3 w-3 fill-[#A97C3F] text-[#A97C3F]" />
                    Recommended
                  </span>
                  <span className="rounded-full bg-[#A97C3F] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                    {m.compatibility?.mutual_score ?? 90}% Match
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-serif text-lg font-bold text-[#201A14]">
                  {m.first_name}
                  {m.age ? `, ${m.age}` : ""}
                </h3>
                <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#6B6155]">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A97C3F]" />
                  <span>
                    {m.city} ({m.postcode_area}) · {m.relationship_status} ·{" "}
                    {m.has_children ? `Parent of ${m.children_count}` : "No children"}
                  </span>
                </p>
                <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-[#5C5346]">
                  {m.short_bio}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(m.compatibility?.match_reasons || []).map((r, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[#FAF6F0] px-2.5 py-1 text-[10px] font-medium text-[#8C6D3F]"
                    >
                      ✓ {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#EFE7DC] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/profiles/${m.id}`}
                    className="rounded-full border border-[#E8E0D4] px-3.5 py-1.5 text-[11px] font-bold text-[#201A14]"
                  >
                    Details
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleSendIntro(m.id, m.first_name)}
                    className="rounded-full bg-[#A97C3F] px-3.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#956B35]"
                  >
                    Send Intro
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAction(m.id, "thumbs_up")}
                    title="Thumbs Up"
                    aria-label="Thumbs Up"
                    aria-pressed={isLiked(m.my_action)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                      isLiked(m.my_action)
                        ? "border-[#2F8B4E] bg-[#DFF2E5]"
                        : "border-[#BFE3C8] bg-[#F0FAF2] hover:bg-[#E2F5E7]"
                    }`}
                  >
                    <ThumbsUp
                      className={`h-3.5 w-3.5 text-[#2F8B4E] ${
                        isLiked(m.my_action) ? "fill-current" : ""
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(m.id, "thumbs_down")}
                    title="Thumbs Down"
                    aria-label="Thumbs Down"
                    aria-pressed={isPassed(m.my_action)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                      isPassed(m.my_action)
                        ? "border-[#C65B5B] bg-[#F9DFDF]"
                        : "border-[#F2CBCB] bg-[#FEF3F3] hover:bg-[#FCE7E7]"
                    }`}
                  >
                    <ThumbsDown
                      className={`h-3.5 w-3.5 text-[#C65B5B] ${
                        isPassed(m.my_action) ? "fill-current" : ""
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBookmark(m.id)}
                    aria-label={
                      m.my_action === "bookmark"
                        ? "Remove bookmark"
                        : "Save profile"
                    }
                    aria-pressed={m.my_action === "bookmark"}
                    title={
                      m.my_action === "bookmark"
                        ? "Remove bookmark"
                        : "Save profile"
                    }
                    disabled={pendingBookmark === m.id}
                    className={`rounded-full border p-2 disabled:opacity-50 ${
                      m.my_action === "bookmark"
                        ? "border-[#A97C3F] bg-[#F3E3CB] text-[#8B632F]"
                        : "border-[#E5DEC9] text-[#9C743C] hover:border-[#C59B5F]"
                    }`}
                  >
                    <Bookmark
                      className={`h-3.5 w-3.5 ${
                        m.my_action === "bookmark" ? "fill-current" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
