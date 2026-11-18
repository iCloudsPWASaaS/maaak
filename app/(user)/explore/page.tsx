"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  ShieldCheck,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Send,
} from "lucide-react";
import { WatermarkedPhoto } from "@/components/SecurityProtectionLayer";
import {
  EDUCATION_OPTIONS,
  RELIGION_OPTIONS,
  RELIGIOUS_DENOMINATIONS,
} from "@/lib/workbook-catalog";

interface ExploreProfile {
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
    match_reasons?: string[];
  };
}

export default function ExploreAndFilterPage() {
  const [profiles, setProfiles] = useState<ExploreProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Advanced Filter State based on profile.xlsx
  const [search, setSearch] = useState("");
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [city, setCity] = useState("");
  const [postcodeArea, setPostcodeArea] = useState("");
  const [religion, setReligion] = useState("Any");
  const [religiousDenomination, setReligiousDenomination] = useState("Any");
  const [educationLevel, setEducationLevel] = useState("Any");
  const [relationshipStatus, setRelationshipStatus] = useState("Any");
  const [hasChildren, setHasChildren] = useState("Any");
  const [smoking, setSmoking] = useState("Any");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<
    "compatibility" | "age_asc" | "age_desc"
  >("compatibility");

  async function applyFilters() {
    setLoading(true);
    const res = await fetch("/api/v1/explore/filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        search: search || undefined,
        minAge,
        maxAge,
        city: city || undefined,
        postcodeArea: postcodeArea || undefined,
        religion: religion !== "Any" ? religion : undefined,
        religiousDenomination:
          religiousDenomination !== "Any" ? religiousDenomination : undefined,
        educationLevel: educationLevel !== "Any" ? educationLevel : undefined,
        relationshipStatus:
          relationshipStatus !== "Any" ? relationshipStatus : undefined,
        hasChildren: hasChildren !== "Any" ? hasChildren : undefined,
        smoking: smoking !== "Any" ? smoking : undefined,
        verifiedOnly,
        sortBy,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setProfiles(json.data?.profiles || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInteraction(
    id: string,
    action: "like" | "dislike" | "thumbs_up" | "thumbs_down",
  ) {
    const url =
      action === "like" || action === "thumbs_up"
        ? `/api/v1/profiles/${id}/like`
        : `/api/v1/profiles/${id}/dislike`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setToast(`Saved ${action.replace("_", " ")}!`);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSendRequest(id: string, firstName: string) {
    const res = await fetch("/api/v1/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiverId: id,
        message: `Assalamu Alaikum ${firstName}, I came across your profile on Ma'aak and would love to introduce myself.`,
      }),
    });
    const json = await res.json();
    setToast(json.message);
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl">
          {toast}
        </div>
      )}

      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#9C743C]">
          Explore &amp; Advanced Discovery
        </span>
        <h1 className="font-serif text-3xl font-semibold text-[#1A1612]">
          Explore Mutually Eligible Profiles
        </h1>
        <p className="text-xs text-[#665C4E]">
          Advanced filters narrow down profiles that already satisfy both
          parties&apos; mandatory dealbreakers and postcode rules.
        </p>
      </div>

      {/* Advanced Filters Panel */}
      <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#FAF6F0] pb-3 text-sm font-semibold text-[#1A1612]">
          <SlidersHorizontal className="h-4 w-4 text-[#9C743C]" />
          <span>Advanced Workbook Filters</span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#665C4E]">
              Keyword Search
            </label>
            <div className="relative mt-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, profession, city..."
                className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] py-2 pr-3 pl-8 text-xs"
              />
              <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[#8C6D3F]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-[#665C4E]">
                Min Age
              </label>
              <input
                type="number"
                min={18}
                max={85}
                value={minAge}
                onChange={(e) => setMinAge(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#665C4E]">
                Max Age
              </label>
              <input
                type="number"
                min={18}
                max={85}
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#665C4E]">
              City / Locality
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. London, Manchester"
              className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#665C4E]">
              Postcode Area Prefix
            </label>
            <input
              type="text"
              value={postcodeArea}
              onChange={(e) => setPostcodeArea(e.target.value)}
              placeholder="e.g. SW1, E1, B1, M1"
              className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#665C4E]">
              Religion
            </label>
            <select
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            >
              <option value="Any">Any Religion</option>
              {RELIGION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#665C4E]">
              School of Thought / Denomination
            </label>
            <select
              value={religiousDenomination}
              onChange={(e) => setReligiousDenomination(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            >
              <option value="Any">Any School of Thought</option>
              {RELIGIOUS_DENOMINATIONS.Default.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#665C4E]">
              Education Level
            </label>
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            >
              <option value="Any">Any Education</option>
              {EDUCATION_OPTIONS.map((ed) => (
                <option key={ed} value={ed}>
                  {ed}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#665C4E]">
              Marital / Relationship Status
            </label>
            <select
              value={relationshipStatus}
              onChange={(e) => setRelationshipStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            >
              <option value="Any">Any Status</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
              <option value="Separated">Separated</option>
              <option value="Never Married">Never Married</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#665C4E]">
              Family / Children
            </label>
            <select
              value={hasChildren}
              onChange={(e) => setHasChildren(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            >
              <option value="Any">With or Without Children</option>
              <option value="yes">Single Parents (Has Children)</option>
              <option value="no">No Children</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#665C4E]">
              Smoking
            </label>
            <select
              value={smoking}
              onChange={(e) => setSmoking(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            >
              <option value="Any">Any</option>
              <option value="Never">Never Smokes</option>
              <option value="Occasionally">Occasionally</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#665C4E]">
              Sort Order
            </label>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "compatibility" | "age_asc" | "age_desc",
                )
              }
              className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            >
              <option value="compatibility">Highest Mutual Compatibility</option>
              <option value="age_asc">Age: Youngest First</option>
              <option value="age_desc">Age: Oldest First</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-[#1A1612]">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-4 w-4 accent-[#14110E]"
              />
              <span>Didit Verified Only</span>
            </label>
            <button
              type="button"
              onClick={applyFilters}
              className="ml-auto rounded-full bg-[#14110E] px-5 py-2 text-xs font-semibold text-[#DFBE8A]"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-3xl bg-[#EFE8DC]" />
          <div className="h-80 animate-pulse rounded-3xl bg-[#EFE8DC]" />
          <div className="h-80 animate-pulse rounded-3xl bg-[#EFE8DC]" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-3xl border border-[#E5DEC9] bg-white p-12 text-center">
          <h3 className="font-serif text-2xl font-semibold text-[#1A1612]">
            No Mutually Eligible Profiles Match These Filters
          </h3>
          <p className="mt-2 text-xs text-[#665C4E]">
            Remember: Ma&apos;aak never bypasses your 5 mandatory dealbreakers or
            a candidate&apos;s dealbreakers. Try broadening your filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#E5DEC9] bg-white shadow-xs"
            >
              <div>
                <div className="relative h-72">
                  <WatermarkedPhoto
                    src={
                      p.photos?.[0]?.url ||
                      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80"
                    }
                    alt={p.first_name}
                    watermarkText={p.photos?.[0]?.watermark || "MA'AAK"}
                    className="h-full w-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    {p.id_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1A1612]">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#9C743C]" />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between text-white">
                    <div>
                      <h3 className="font-serif text-2xl font-semibold">
                        {p.first_name}
                        {p.age ? `, ${p.age}` : ""}
                      </h3>
                      <p className="text-xs text-white/85">
                        {p.city} ({p.postcode_area}) • {p.profession}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#B58E53] px-3 py-1 text-xs font-bold text-white">
                      {p.compatibility?.mutual_score ?? 88}% Match
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-[#665C4E]">
                    <span className="rounded-md bg-[#FAF6F0] px-2 py-0.5">
                      {p.relationship_status}
                    </span>
                    <span className="rounded-md bg-[#FAF6F0] px-2 py-0.5">
                      {p.has_children
                        ? `Parent (${p.children_count})`
                        : "No children"}
                    </span>
                    {p.religious_denomination && (
                      <span className="rounded-md bg-[#FAF6F0] px-2 py-0.5">
                        {p.religious_denomination}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs text-[#3D362D]">
                    {p.short_bio}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#FAF6F0] px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleInteraction(p.id, "thumbs_up")}
                    aria-label="Thumbs up"
                    className="rounded-full border border-[#E5DEC9] p-2 hover:border-[#C59B5F]"
                  >
                    <ThumbsUp className="h-3.5 w-3.5 text-[#9C743C]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInteraction(p.id, "thumbs_down")}
                    aria-label="Thumbs down"
                    className="rounded-full border border-[#E5DEC9] p-2 hover:border-rose-400"
                  >
                    <ThumbsDown className="h-3.5 w-3.5 text-[#665C4E]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInteraction(p.id, "like")}
                    aria-label="Like"
                    className="rounded-full border border-[#E5DEC9] p-2 hover:border-[#C59B5F]"
                  >
                    <Heart className="h-3.5 w-3.5 text-rose-600" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/profiles/${p.id}`}
                    className="rounded-full border border-[#14110E] px-3.5 py-1.5 text-xs font-semibold text-[#1A1612]"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleSendRequest(p.id, p.first_name)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#14110E] px-3.5 py-1.5 text-xs font-semibold text-[#DFBE8A]"
                  >
                    <Send className="h-3 w-3" />
                    <span>Intro</span>
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
