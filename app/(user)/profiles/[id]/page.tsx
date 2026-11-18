"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  MapPin,
  Heart,
  Users,
  Puzzle,
  Send,
  ThumbsDown,
  ThumbsUp,
  Flag,
  Ban,
  MessageCircle,
  Volume2,
  Bookmark,
} from "lucide-react";
import { WatermarkedPhoto } from "@/components/SecurityProtectionLayer";

export default function ProfileDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const profileId = params?.id;

  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Inappropriate content");
  const [reportDetails, setReportDetails] = useState("");

  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/v1/profiles/${profileId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.profile) {
          setProfile(json.data.profile);
        }
        setLoading(false);
      });
  }, [profileId]);

  async function handleLike(action: "like" | "bookmark" = "like") {
    await fetch(`/api/v1/profiles/${profileId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setToast(action === "bookmark" ? "Profile bookmarked!" : "Profile liked!");
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSendIntro() {
    const res = await fetch("/api/v1/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiverId: profileId,
        message: `Assalamu Alaikum ${String(profile?.first_name || "")}, I would love to introduce myself for marriage.`,
      }),
    });
    const json = await res.json();
    setToast(json.message);
    setTimeout(() => setToast(null), 4000);
  }

  async function handleStartChat() {
    const res = await fetch("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: profileId }),
    });
    const json = await res.json();
    if (res.ok && json.data?.conversation?.id) {
      router.push(`/messages?conversation=${json.data.conversation.id}`);
    } else {
      setToast(json.message || "Could not start chat.");
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function handleBlockUser() {
    if (!confirm("Are you sure you want to block this user?")) return;
    const res = await fetch("/api/v1/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockedId: profileId,
        reason: "Blocked from profile page",
      }),
    });
    if (res.ok) {
      router.push("/explore");
    }
  }

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportedUserId: profileId,
        reportType: "profile",
        reason: reportReason,
        details: reportDetails,
      }),
    });
    const json = await res.json();
    setReportOpen(false);
    setToast(json.message || "Report submitted.");
    setTimeout(() => setToast(null), 4000);
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-[#EFE8DC]" />;
  }

  if (!profile) {
    return (
      <div className="rounded-3xl border border-[#E5DEC9] bg-white p-12 text-center">
        <h2 className="font-serif text-2xl font-semibold">
          Profile Unavailable
        </h2>
      </div>
    );
  }

  const photos =
    (profile.photos as { id: string; url: string; watermark?: string }[]) || [];
  const comp = (profile.compatibility || {}) as {
    mutual_score?: number;
    area_breakdown?: Record<string, number>;
    match_reasons?: string[];
  };
  const score = comp.mutual_score ?? 92;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {toast && (
        <div className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl">
          {toast}
        </div>
      )}

      {/* Main Profile Card matching Mock2.png */}
      <div className="overflow-hidden rounded-[2rem] border border-[#E5DEC9] bg-[#F5EFE6] shadow-lg">
        <div className="relative h-[440px] w-full">
          <WatermarkedPhoto
            src={
              photos[0]?.url ||
              "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=900&q=80"
            }
            alt={String(profile.first_name)}
            watermarkText={photos[0]?.watermark || "MA'AAK PROTECTED"}
            className="h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top Pills matching Mock2.png */}
          <div className="absolute top-5 right-5 left-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C59B5F] px-4 py-1.5 text-xs font-bold text-[#14110E] shadow">
              👑 Verified Member
            </span>
            <button
              type="button"
              onClick={() => handleLike("bookmark")}
              aria-label="Bookmark profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/70"
            >
              <Bookmark className="h-4 w-4" />
            </button>
          </div>

          {/* Name, Age, Verified Tick & Location matching Mock2.png */}
          <div className="absolute right-6 bottom-6 left-6 text-white">
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif text-4xl font-semibold">
                {String(profile.first_name)}, {String(profile.age || "")}
              </h1>
              {Boolean(profile.id_verified) && (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#D4AF37] text-[#14110E]">
                  <ShieldCheck className="h-4 w-4" />
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/90">
              <MapPin className="h-4 w-4 text-[#DFBE8A]" />
              <span>
                {String(profile.city)}, UK ({String(profile.postcode_area)}) •{" "}
                {String(profile.profession || "")}
              </span>
            </p>
          </div>
        </div>

        {/* 3 Summary Columns matching Mock2.png */}
        <div className="grid grid-cols-3 divide-x divide-[#E5DEC9] border-b border-[#E5DEC9] bg-[#FAF6F0] p-5">
          <div className="flex items-start gap-3 pr-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFE6D5] text-[#9C743C]">
              <Heart className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#1A1612]">
                Relationship Intentions
              </div>
              <div className="mt-0.5 text-xs text-[#665C4E]">
                {String(profile.looking_for_intention || "Marriage")}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 px-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFE6D5] text-[#9C743C]">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#1A1612]">
                Parenthood
              </div>
              <div className="mt-0.5 text-xs text-[#665C4E]">
                {profile.has_children
                  ? `Single parent (${String(profile.children_count)} child)`
                  : "No children"}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 pl-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFE6D5] text-[#9C743C]">
              <Puzzle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#1A1612]">
                Compatibility
              </div>
              <div className="mt-0.5 text-xs font-semibold text-[#9C743C]">
                High match ({score}%)
              </div>
            </div>
          </div>
        </div>

        {/* About Me, Values & Details matching Mock2.png */}
        <div className="space-y-6 p-7">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#1A1612]">
              About Me
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#3D362D]">
              {String(profile.short_bio || "")}
            </p>
          </div>

          {Boolean(profile.voice_bio_url) && (
            <div className="flex items-center gap-3 rounded-2xl border border-[#E5DEC9] bg-white p-4">
              <Volume2 className="h-5 w-5 text-[#9C743C]" />
              <div className="text-xs font-semibold text-[#1A1612]">
                Voice Introduction Bio (up to 30s)
              </div>
              <audio
                controls
                src={String(profile.voice_bio_url)}
                className="ml-auto h-8"
              />
            </div>
          )}

          {/* Value & Hobby Pills */}
          <div className="flex flex-wrap gap-2.5">
            {((profile.my_top_values as string[]) || []).map((v) => (
              <span
                key={v}
                className="rounded-full bg-[#E8DEC8] px-4 py-1.5 text-xs font-semibold text-[#3D3222]"
              >
                🌱 {v}
              </span>
            ))}
            {((profile.hobbies_interests as string[]) || []).map((h) => (
              <span
                key={h}
                className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-[#5C5346] border border-[#E5DEC9]"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Structured Workbook Attributes */}
          <div className="grid gap-4 rounded-2xl border border-[#E5DEC9] bg-white p-5 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <div>
              <span className="text-[#665C4E]">Height:</span>{" "}
              <strong className="text-[#1A1612]">
                {String(profile.height_display || "—")}
              </strong>
            </div>
            <div>
              <span className="text-[#665C4E]">Marital Status:</span>{" "}
              <strong className="text-[#1A1612]">
                {String(profile.relationship_status || "—")}
              </strong>
            </div>
            <div>
              <span className="text-[#665C4E]">Education:</span>{" "}
              <strong className="text-[#1A1612]">
                {String(profile.education_level || "—")}
              </strong>
            </div>
            <div>
              <span className="text-[#665C4E]">Religion &amp; Tradition:</span>{" "}
              <strong className="text-[#1A1612]">
                {String(profile.religion || "—")} (
                {String(profile.religious_denomination || "—")})
              </strong>
            </div>
            <div>
              <span className="text-[#665C4E]">Wants More Children:</span>{" "}
              <strong className="text-[#1A1612]">
                {String(profile.wants_more_children || "—")}
              </strong>
            </div>
            <div>
              <span className="text-[#665C4E]">Blended Family:</span>{" "}
              <strong className="text-[#1A1612]">
                {String(profile.blended_family_comfort || "—")}
              </strong>
            </div>
            <div>
              <span className="text-[#665C4E]">Marriage Timeline:</span>{" "}
              <strong className="text-[#1A1612]">
                {String(profile.marriage_timeline || "—")}
              </strong>
            </div>
            <div>
              <span className="text-[#665C4E]">Smoking / Alcohol:</span>{" "}
              <strong className="text-[#1A1612]">
                {String(profile.smoking || "Never")} /{" "}
                {String(profile.alcohol || "Never")}
              </strong>
            </div>
            <div>
              <span className="text-[#665C4E]">Languages:</span>{" "}
              <strong className="text-[#1A1612]">
                {((profile.languages_spoken as string[]) || []).join(", ")}
              </strong>
            </div>
          </div>

          {/* Bottom Action Circles matching Mock2.png */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Dislike"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#1A1612] shadow-md hover:scale-105"
            >
              <ThumbsDown className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={() => handleLike("like")}
              aria-label="Like profile"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#DFBE8A] to-[#B58E53] text-[#14110E] shadow-xl hover:scale-105"
            >
              <ThumbsUp className="h-7 w-7" />
            </button>

            <button
              type="button"
              onClick={handleSendIntro}
              aria-label="Send introduction request"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#1A1612] shadow-md hover:scale-105"
            >
              <Send className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleStartChat}
              className="inline-flex items-center gap-2 rounded-full bg-[#14110E] px-6 py-3.5 text-xs font-semibold text-[#DFBE8A] shadow-md"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Open Chat</span>
            </button>
          </div>

          {/* Safety Moderation Actions */}
          <div className="flex items-center justify-end gap-4 border-t border-[#E5DEC9] pt-4 text-xs text-[#665C4E]">
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1 hover:text-rose-700"
            >
              <Flag className="h-3.5 w-3.5" />
              <span>Report Profile</span>
            </button>
            <button
              type="button"
              onClick={handleBlockUser}
              className="inline-flex items-center gap-1 hover:text-rose-700"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Block User</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleReportSubmit}
            className="w-full max-w-md rounded-3xl bg-white p-6"
          >
            <h3 className="font-serif text-xl font-semibold text-[#1A1612]">
              Report Profile to Ma&apos;aak Moderation
            </h3>
            <div className="mt-4 space-y-3">
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-xs"
              >
                <option value="Inappropriate content">
                  Inappropriate content
                </option>
                <option value="Misleading or fake profile">
                  Misleading or fake profile
                </option>
                <option value="Contact details in photo/bio">
                  Contact details in photo/bio
                </option>
                <option value="Unserious marriage intentions">
                  Unserious marriage intentions
                </option>
              </select>
              <textarea
                rows={3}
                placeholder="Additional details for our moderation team..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-xs"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="rounded-full px-4 py-2 text-xs text-[#665C4E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-rose-700 px-5 py-2 text-xs font-semibold text-white"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
