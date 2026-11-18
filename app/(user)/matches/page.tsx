"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Send,
  RefreshCw,
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

export default function RecommendedMatchesPage() {
  const [matches, setMatches] = useState<MatchCardItem[]>([]);
  const [topMatch, setTopMatch] = useState<MatchCardItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  async function loadMatches() {
    setLoading(true);
    const res = await fetch("/api/v1/matches/recommended");
    if (res.ok) {
      const json = await res.json();
      setMatches(json.data?.recommended || []);
      setTopMatch(json.data?.topMatch || null);
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
    if (res.ok) {
      setToast(`Recorded ${type.replace("_", " ")}!`);
      setTimeout(() => setToast(null), 3000);
      loadMatches();
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

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#9C743C]">
            Gale-Shapley Stable Matching
          </span>
          <h1 className="font-serif text-3xl font-semibold text-[#1A1612] sm:text-4xl">
            Your Mutually Compatible Matches
          </h1>
          <p className="text-xs text-[#665C4E]">
            Every profile shown has passed both your dealbreakers and theirs.
          </p>
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

      {/* Gale-Shapley Optimal Match Spotlight */}
      {topMatch && (
        <div className="overflow-hidden rounded-3xl border-2 border-[#C59B5F] bg-[#14110E] text-[#FAF6F0] shadow-xl">
          <div className="grid items-center gap-6 lg:grid-cols-12">
            <div className="relative h-80 lg:col-span-5 lg:h-full">
              <WatermarkedPhoto
                src={
                  topMatch.photos?.[0]?.url ||
                  "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80"
                }
                alt={topMatch.first_name}
                watermarkText={
                  topMatch.photos?.[0]?.watermark || "MA'AAK STABLE MATCH"
                }
                className="h-full min-h-80 w-full"
              />
            </div>

            <div className="p-7 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C59B5F] px-3 py-1 text-xs font-bold text-[#14110E]">
                  <Sparkles className="h-3.5 w-3.5" /> Gale-Shapley #1 Stable
                  Match
                </span>
                <span className="rounded-full border border-[#C59B5F]/50 px-3 py-1 text-xs font-semibold text-[#DFBE8A]">
                  {topMatch.compatibility?.mutual_score ?? 95}% Mutual
                  Compatibility
                </span>
              </div>

              <h2 className="mt-4 font-serif text-3xl font-semibold text-white">
                {topMatch.first_name}
                {topMatch.age ? `, ${topMatch.age}` : ""}
              </h2>
              <p className="mt-1 text-xs text-white/75">
                {topMatch.city} ({topMatch.postcode_area}) •{" "}
                {topMatch.profession} • {topMatch.relationship_status} •{" "}
                {topMatch.has_children
                  ? `Parent of ${topMatch.children_count}`
                  : "No children"}
              </p>

              <p className="mt-4 text-sm leading-relaxed text-white/85">
                {topMatch.short_bio}
              </p>

              {topMatch.compatibility?.area_breakdown && (
                <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {Object.entries(topMatch.compatibility.area_breakdown).map(
                    ([area, val]) => (
                      <div
                        key={area}
                        className="rounded-xl border border-white/10 bg-[#1F1A16] px-3 py-2"
                      >
                        <div className="text-[10px] uppercase text-white/60">
                          {area.replace("_", " ")}
                        </div>
                        <div className="font-serif text-lg font-bold text-[#DFBE8A]">
                          {val}%
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#C59B5F] px-5 py-2.5 text-xs font-semibold text-[#DFBE8A]"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Introduction Request</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Mutually Eligible Recommendations */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-3xl bg-[#EFE8DC]" />
          <div className="h-80 animate-pulse rounded-3xl bg-[#EFE8DC]" />
          <div className="h-80 animate-pulse rounded-3xl bg-[#EFE8DC]" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <div
              key={m.id}
              className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#E5DEC9] bg-white shadow-xs"
            >
              <div>
                <div className="relative h-72">
                  <WatermarkedPhoto
                    src={
                      m.photos?.[0]?.url ||
                      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80"
                    }
                    alt={m.first_name}
                    watermarkText={m.photos?.[0]?.watermark || "MA'AAK"}
                    className="h-full w-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    {m.id_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1A1612]">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#9C743C]" />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between text-white">
                    <div>
                      <h3 className="font-serif text-2xl font-semibold">
                        {m.first_name}
                        {m.age ? `, ${m.age}` : ""}
                      </h3>
                      <p className="text-xs text-white/85">
                        {m.city} ({m.postcode_area}) •{" "}
                        {m.has_children
                          ? `Parent of ${m.children_count}`
                          : m.relationship_status}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#B58E53] px-3 py-1 text-xs font-bold text-white">
                      {m.compatibility?.mutual_score ?? 90}% Match
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <p className="line-clamp-2 text-xs leading-relaxed text-[#5C5346]">
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
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[#FAF6F0] px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAction(m.id, "thumbs_up")}
                    title="Thumbs Up"
                    className="rounded-full border border-[#E5DEC9] p-2 text-[#1A1612] hover:border-[#C59B5F]"
                  >
                    <ThumbsUp className="h-3.5 w-3.5 text-[#9C743C]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(m.id, "thumbs_down")}
                    title="Thumbs Down"
                    className="rounded-full border border-[#E5DEC9] p-2 text-[#1A1612] hover:border-rose-400"
                  >
                    <ThumbsDown className="h-3.5 w-3.5 text-[#665C4E]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(m.id, "like")}
                    title="Like Profile"
                    className="rounded-full border border-[#E5DEC9] p-2 text-[#1A1612] hover:border-[#C59B5F]"
                  >
                    <Heart className="h-3.5 w-3.5 text-rose-600" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/profiles/${m.id}`}
                    className="rounded-full border border-[#14110E] px-3.5 py-1.5 text-xs font-semibold text-[#1A1612]"
                  >
                    Details
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleSendIntro(m.id, m.first_name)}
                    className="rounded-full bg-[#14110E] px-3.5 py-1.5 text-xs font-semibold text-[#DFBE8A]"
                  >
                    Send Intro
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
