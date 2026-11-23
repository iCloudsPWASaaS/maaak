"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Check,
  Crown,
  HeartHandshake,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Users,
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
  relationship_status?: string | null;
  has_children: boolean;
  children_count: string;
  short_bio: string;
  photos: { id: string; url: string; watermark?: string }[];
  my_action?: string | null;
  compatibility?: {
    mutual_score: number;
    is_gale_shapley_optimal?: boolean;
    area_breakdown?: Record<string, number>;
    match_reasons?: string[];
  };
}

type InteractionAction = "thumbs_up" | "thumbs_down" | "bookmark";
type InteractionResult = "saved" | "removed" | null;

const DEFAULT_REASONS = [
  "Similar relationship goals",
  "Aligned values and faith",
  "Compatible family plans",
];

const NEXT_STEPS = [
  { label: "Complete your profile", href: "/profile/wizard" },
  { label: "Explore your matches", href: "/explore" },
  { label: "Send an introduction", href: "/requests" },
];

export default function UserDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [meData, setMeData] = useState<Record<string, unknown> | null>(null);
  const [recommended, setRecommended] = useState<MatchItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

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
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleInteraction(
    targetId: string,
    action: InteractionAction,
  ): Promise<InteractionResult> {
    const key = `${targetId}-${action}`;
    setPendingAction(key);

    try {
      const isPass = action === "thumbs_down";
      const res = await fetch(
        `/api/v1/profiles/${targetId}/${isPass ? "dislike" : "like"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      if (!res.ok) return null;

      const json = await res.json();
      const removed = action === "bookmark" && Boolean(json.data?.removed);

      if (removed) {
        showToast("Removed from bookmarks.");
        return "removed";
      }

      const messages: Record<InteractionAction, string> = {
        thumbs_up: "Added to your liked profiles.",
        thumbs_down: "Thanks, we’ll show you different matches.",
        bookmark: "Saved to your bookmarks.",
      };
      showToast(messages[action]);
      return "saved";
    } catch {
      return null;
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-7">
        <div className="h-24 animate-pulse rounded-2xl bg-[#F0E8DC]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-2xl bg-[#F0E8DC]"
            />
          ))}
        </div>
        <div className="h-28 animate-pulse rounded-2xl bg-[#F0E8DC]" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-[30rem] animate-pulse rounded-2xl bg-[#F0E8DC]"
            />
          ))}
        </div>
      </div>
    );
  }

  const user = (meData?.user || {}) as Record<string, unknown>;
  const completion = (meData?.completion || { percentage: 35 }) as {
    percentage: number;
  };
  const entitlements = (meData?.entitlements || {}) as {
    planName?: string;
    isTrial?: boolean;
  };
  const rawPercentage = Number(completion.percentage);
  const completionPercentage = Math.min(
    100,
    Math.max(0, Number.isFinite(rawPercentage) ? rawPercentage : 35),
  );
  const firstName = user.first_name ? String(user.first_name) : "Amina";
  const planName = String(entitlements.planName || "Premium Membership");

  return (
    <div className="space-y-7 bg-[#FBF7F2]">
      {toast && (
        <div className="fixed right-6 bottom-20 z-50 rounded-full border border-[#A97C3F] bg-[#17130F] px-5 py-3 text-xs font-semibold text-[#E8CDA3] shadow-xl">
          {toast}
        </div>
      )}

      <header>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#201A14] sm:text-4xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#6B6155]">
          A meaningful space for people who share your values, relationship
          goals and vision for the future.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col rounded-2xl border border-[#E8E0D4] bg-white p-5 shadow-[0_8px_24px_rgba(64,45,22,0.05)]">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#A97C3F ${completionPercentage}%, #EFE7DC 0)`,
              }}
            >
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white">
                <span className="font-serif text-lg font-bold text-[#A97C3F]">
                  {completionPercentage}%
                </span>
              </div>
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-[#201A14]">
                Complete Your Profile
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#6B6155]">
                Add a few more details so the right people can find you.
              </p>
            </div>
          </div>
          <Link
            href="/profile/wizard"
            className="mt-auto inline-flex items-center justify-center gap-1.5 self-start rounded-full bg-[#A97C3F] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#956B35]"
          >
            Complete My Profile
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <InfoCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Verified members"
          description="Every member completes identity and age verification before connecting."
        />
        <InfoCard
          icon={<Users className="h-5 w-5" />}
          title="Meet genuine members"
          description="Connect with people who share your values, faith and relationship goals."
        />
        <InfoCard
          icon={<Lock className="h-5 w-5" />}
          title="A safe & private space"
          description="Your information is protected and never shared outside our platform."
        />
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-[#17130F] px-6 py-5 shadow-[0_12px_30px_rgba(33,23,13,0.14)]">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/3 opacity-[0.16]"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id="membership-pattern"
              width="42"
              height="42"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <path
                d="M21 1 41 21 21 41 1 21Z M21 9 33 21 21 33 9 21Z M21 16 26 21 21 26 16 21Z"
                fill="none"
                stroke="#E8CDA3"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#membership-pattern)" />
        </svg>

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E8CDA3]/30 bg-[#E8CDA3]/10">
              <Crown className="h-5 w-5 text-[#E8CDA3]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#E8CDA3]">
                  Current Plan: {planName}
                  {entitlements.isTrial ? " · Free Trial" : ""}
                </p>
                <span className="rounded-full border border-[#A97C3F]/50 bg-[#A97C3F]/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#E8CDA3]">
                  Active
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/65">
                Unlock more matches, priority visibility and extra features
                designed to help you connect with confidence.
              </p>
            </div>
          </div>
          <Link
            href="/subscription"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-full bg-[#E8CDA3] px-5 py-2.5 text-xs font-bold text-[#201A14] transition hover:bg-[#F2DDBB] lg:self-auto"
          >
            Manage Membership
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#201A14]">
                Recommended for you
              </h2>
              <p className="mt-1 text-xs text-[#6B6155]">
                Handpicked matches based on your preferences and compatibility.
              </p>
            </div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A97C3F] transition hover:underline"
            >
              View all matches
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {recommended.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E8E0D4] bg-white p-10 text-center shadow-[0_8px_24px_rgba(64,45,22,0.05)] sm:col-span-2 xl:col-span-3">
                <Sparkles className="mx-auto h-8 w-8 text-[#A97C3F]" />
                <h3 className="mt-3 font-serif text-xl font-bold text-[#201A14]">
                  Your matches are on their way
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#6B6155]">
                  Complete your profile and preferences to receive thoughtful
                  recommendations based on your values and relationship goals.
                </p>
                <Link
                  href="/profile/wizard"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#A97C3F] px-5 py-2.5 text-xs font-semibold text-white"
                >
                  Complete My Profile
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              recommended.slice(0, 3).map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  pendingAction={pendingAction}
                  onInteract={handleInteraction}
                />
              ))
            )}
          </div>
        </div>

        <aside className="flex flex-col rounded-2xl border border-[#E8E0D4] bg-[#F5EEE4] p-5 shadow-[0_8px_24px_rgba(64,45,22,0.04)] lg:sticky lg:top-6 lg:self-start">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#A97C3F] shadow-sm">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-serif text-lg font-bold leading-snug text-[#201A14]">
            Built for meaningful connections
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-[#6B6155]">
            Meet people who are here with intention, honesty and the hope of
            building a future that honours shared values.
          </p>

          <div className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#A97C3F]">
              Your next steps
            </p>
            <div className="mt-3 space-y-2.5">
              {NEXT_STEPS.map((step, index) => (
                <Link
                  key={step.href}
                  href={step.href}
                  className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2.5 transition hover:bg-white"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#A97C3F] text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-xs font-semibold text-[#3D362D]">
                    {step.label}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#A97C3F]" />
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-[#E8E0D4] bg-[#F5EEE4] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#A97C3F] shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-[#201A14]">
              A Community Built on Trust
            </h2>
            <p className="mt-1 text-xs text-[#6B6155]">
              Every member completes identity and age checks, so you can
              connect with confidence.
            </p>
          </div>
        </div>
        <Link
          href="/verification"
          className="inline-flex shrink-0 items-center gap-1.5 self-start text-xs font-semibold text-[#A97C3F] underline underline-offset-4 hover:text-[#8D6735] sm:self-auto"
        >
          Learn more about our safety measures
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-[#E8E0D4] bg-white p-5 shadow-[0_8px_24px_rgba(64,45,22,0.05)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FBF4EA] text-[#A97C3F]">
        {icon}
      </div>
      <h2 className="mt-4 font-serif text-base font-bold text-[#201A14]">
        {title}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-[#6B6155]">
        {description}
      </p>
    </div>
  );
}

function MatchCard({
  match,
  pendingAction,
  onInteract,
}: {
  match: MatchItem;
  pendingAction: string | null;
  onInteract: (
    targetId: string,
    action: InteractionAction,
  ) => Promise<InteractionResult>;
}) {
  const [currentAction, setCurrentAction] = useState<string | null>(
    match.my_action ?? null,
  );
  const isBookmarked = currentAction === "bookmark";
  const photoUrl =
    match.photos?.[0]?.url ||
    "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80";
  const rawScore = Number(match.compatibility?.mutual_score);
  const score = Number.isFinite(rawScore) ? Math.round(rawScore) : 90;
  const reasons =
    match.compatibility?.match_reasons?.length &&
    match.compatibility.match_reasons.length > 0
      ? match.compatibility.match_reasons.slice(0, 3)
      : DEFAULT_REASONS;
  const location = match.city || match.postcode_area || "Location private";
  const relationshipStatus = match.relationship_status || "Never married";
  const hasChildren = Boolean(match.has_children);
  const childrenLabel = hasChildren
    && match.children_count
    && match.children_count !== "0"
    && match.children_count !== "None"
    ? `${match.children_count} children`
      : hasChildren
        ? "Has children"
        : "No children";

  async function runAction(action: InteractionAction) {
    const result = await onInteract(match.id, action);
    if (result === "removed") setCurrentAction(null);
    if (result === "saved") setCurrentAction(action);
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#E8E0D4] bg-white shadow-[0_8px_24px_rgba(64,45,22,0.05)] transition hover:shadow-[0_14px_32px_rgba(64,45,22,0.1)]">
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <WatermarkedPhoto
          src={photoUrl}
          alt={`${match.first_name}'s profile`}
          watermarkText={match.photos?.[0]?.watermark || "MA'AAK VERIFIED"}
          className="h-full w-full"
        />
        <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#3D362D] shadow-sm">
            <Star className="h-3 w-3 fill-[#A97C3F] text-[#A97C3F]" />
            Recommended
          </span>
          <span className="rounded-full bg-[#A97C3F] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
            {score}% Match
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-lg font-bold text-[#201A14]">
          {match.first_name}
          {match.age ? `, ${match.age}` : ""}
        </h3>
        <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#6B6155]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A97C3F]" />
          <span>
            {location} · {relationshipStatus} · {childrenLabel}
          </span>
        </p>

        <div className="mt-4">
          <p className="text-[11px] font-bold text-[#201A14]">
            Why you may connect
          </p>
          <ul className="mt-2 space-y-1.5">
            {reasons.map((reason, index) => (
              <li
                key={`${reason}-${index}`}
                className="flex items-start gap-2 text-[11px] leading-snug text-[#5C5346]"
              >
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A97C3F]" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-5">
          <Link
            href={`/profiles/${match.id}`}
            className="flex flex-1 items-center justify-center rounded-full bg-[#A97C3F] px-3 py-2.5 text-[11px] font-bold text-white transition hover:bg-[#956B35]"
          >
            View Profile
          </Link>
          <ActionButton
            label="Like"
            pending={pendingAction === `${match.id}-thumbs_up`}
            pressed={currentAction === "thumbs_up"}
            onClick={() => {
              void runAction("thumbs_up");
            }}
            className="border-[#BFE3C8] bg-[#F0FAF2] text-[#2F8B4E] hover:bg-[#E2F5E7]"
          >
            <ThumbsUp
              className={`h-3.5 w-3.5 ${
                currentAction === "thumbs_up" ? "fill-current" : ""
              }`}
            />
          </ActionButton>
          <ActionButton
            label="Pass"
            pending={pendingAction === `${match.id}-thumbs_down`}
            pressed={currentAction === "thumbs_down"}
            onClick={() => {
              void runAction("thumbs_down");
            }}
            className="border-[#F2CBCB] bg-[#FEF3F3] text-[#C65B5B] hover:bg-[#FCE7E7]"
          >
            <ThumbsDown
              className={`h-3.5 w-3.5 ${
                currentAction === "thumbs_down" ? "fill-current" : ""
              }`}
            />
          </ActionButton>
          <ActionButton
            label={isBookmarked ? "Saved to bookmarks" : "Bookmark"}
            pending={pendingAction === `${match.id}-bookmark`}
            pressed={isBookmarked}
            onClick={() => {
              void runAction("bookmark");
            }}
            className={
              isBookmarked
                ? "border-[#A97C3F] bg-[#F3E3CB] text-[#8B632F]"
                : "border-[#E8E0D4] bg-[#FBF7F2] text-[#A97C3F] hover:bg-[#F3EBDF]"
            }
          >
            <Bookmark
              className={`h-3.5 w-3.5 ${isBookmarked ? "fill-current" : ""}`}
            />
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

function ActionButton({
  label,
  pending,
  pressed,
  onClick,
  className,
  children,
}: {
  label: string;
  pending: boolean;
  pressed?: boolean;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      disabled={pending}
      onClick={onClick}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
