"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import {
  Ban,
  BookOpen,
  Bookmark,
  BriefcaseBusiness,
  Camera,
  ChefHat,
  Dumbbell,
  FileText,
  Flag,
  Globe,
  GraduationCap,
  Heart,
  Languages,
  Leaf,
  List,
  MapPin,
  MessageCircle,
  Moon,
  Plane,
  ShieldCheck,
  Star,
  Target,
  ThumbsDown,
  ThumbsUp,
  TreePine,
  UserRound,
  Users,
} from "lucide-react";
import { WatermarkedPhoto } from "@/components/SecurityProtectionLayer";
import type { ProfilePhoto } from "@/components/profile/PhotosPanel";
import {
  Chip,
  GlanceRow,
  InfoCard,
  RingsIcon,
  TabButton,
  VoiceIntroPlayer,
} from "@/components/profile/ProfileUi";

const PhotosPanel = dynamic(() => import("@/components/profile/PhotosPanel"), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse rounded-[14px] border border-[#E8E0D4] bg-[#F5EEE2]" />
  ),
});

type InteractionAction = "like" | "pass" | "save" | null;
type TabKey = "overview" | "about" | "values" | "family" | "photos";

type ChipData = { label: string; icon: React.ReactNode };
type DetailRow = { icon: React.ReactNode; label: string; value: string };

type ProfileViewModel = {
  id: string;
  name: string;
  age: number | null;
  location: string;
  statusChips: ChipData[];
  bio: string;
  voiceIntro: { url?: string; duration: number };
  glance: {
    profession: string;
    education: string;
    nationality: string;
    languages: string;
    religion: string;
    relationshipGoal: string;
  };
  about: string;
  interests: ChipData[];
  lookingFor: string;
  dealbreakers: string[];
  photos: ProfilePhoto[];
  values: ChipData[];
  personalDetails: DetailRow[];
  lifestyle: DetailRow[];
  familyFuture: DetailRow[];
};

const FALLBACK_PHOTO =
  "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=900&q=80";

const SPEC_COPY = {
  bio: "Family-oriented, cheerful and curious about the world. I value faith, honesty and kindness, and I'm looking for a like-minded partner to build a meaningful future with.",
  about:
    "I'm a warm, grounded and positive person who enjoys good conversations, family time and exploring new places. I believe in mutual respect, shared values and growing together in faith.",
  profession: "Marketing Manager",
  education: "Bachelor's Degree",
  nationality: "British",
  languages: "English, Urdu",
  relationshipGoal: "Marriage",
  interests: [
    "Travel",
    "Fitness",
    "Cooking",
    "Reading",
    "Photography",
    "Volunteering",
    "Nature & Outdoors",
  ],
  values: ["Faith", "Family", "Honesty", "Kindness"],
  lookingFor:
    "A kind, practising Muslim who values family, honesty and long-term commitment.",
  dealbreakers: [
    "Non-smoker",
    "Intends to marry",
    "Within 50 miles",
    "Minimum education: Bachelor's degree",
    "Practising Muslim",
  ],
};

const TABS: { id: TabKey; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <UserRound className="h-4 w-4" /> },
  { id: "about", label: "About Me", icon: <List className="h-4 w-4" /> },
  {
    id: "values",
    label: "My Values & Lifestyle",
    icon: <Leaf className="h-4 w-4" />,
  },
  { id: "family", label: "Family & Future", icon: <Users className="h-4 w-4" /> },
  { id: "photos", label: "Photos", icon: <Camera className="h-4 w-4" /> },
];

function text(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim()) as string[];
  }
  return [];
}

function interestIcon(label: string) {
  const key = label.toLowerCase();
  if (key.includes("travel")) return <Plane className="h-3.5 w-3.5" />;
  if (key.includes("fitness")) return <Dumbbell className="h-3.5 w-3.5" />;
  if (key.includes("cooking")) return <ChefHat className="h-3.5 w-3.5" />;
  if (key.includes("reading")) return <BookOpen className="h-3.5 w-3.5" />;
  if (key.includes("photography")) return <Camera className="h-3.5 w-3.5" />;
  if (key.includes("volunteer")) return <Heart className="h-3.5 w-3.5" />;
  if (key.includes("nature") || key.includes("outdoor")) {
    return <TreePine className="h-3.5 w-3.5" />;
  }
  return <Star className="h-3.5 w-3.5" />;
}

function mapServerAction(action: unknown): InteractionAction {
  if (action === "like" || action === "thumbs_up") return "like";
  if (action === "dislike" || action === "thumbs_down") return "pass";
  if (action === "bookmark") return "save";
  return null;
}

function buildProfileViewModel(
  raw: Record<string, unknown>,
  profileId: string,
): ProfileViewModel {
  const useSpecCopy =
    profileId === "ccfe6080-b516-4196-b92d-48e0eff6d197" ||
    text(raw.short_bio).includes("Test user");
  const name = text(raw.first_name, "Member");
  const age = raw.age === null || raw.age === undefined ? null : Number(raw.age);
  const religion = text(raw.religion, "Islam");
  const practice = text(raw.religious_practice, "Practising");
  const relationshipStatus = text(raw.relationship_status, "Never Married");
  const hasChildren = raw.has_children === true;
  const languages = list(raw.languages_spoken);
  const nationalities = list(raw.nationalities);
  const interests = list(raw.hobbies_interests);
  const values = list(raw.my_top_values);
  const photos = Array.isArray(raw.photos)
    ? (raw.photos as ProfilePhoto[])
    : [];

  const statusChips: ChipData[] = [
    {
      label: religion.toLowerCase().includes("islam") ? "Practising Muslim" : religion,
      icon: <Moon className="h-3.5 w-3.5" />,
    },
    {
      label: relationshipStatus,
      icon: <RingsIcon className="h-3.5 w-3.5" />,
    },
    {
      label: hasChildren ? "Has children" : "No Children",
      icon: <RingsIcon className="h-3.5 w-3.5" />,
    },
  ];

  return {
    id: text(raw.id, profileId),
    name,
    age,
    location: text(raw.city, "London"),
    statusChips,
    bio: useSpecCopy ? SPEC_COPY.bio : text(raw.short_bio, SPEC_COPY.bio),
    voiceIntro: {
      url: typeof raw.voice_bio_url === "string" ? raw.voice_bio_url : undefined,
      duration: Number(raw.voice_bio_duration_sec) || 30,
    },
    glance: {
      profession: text(raw.profession, SPEC_COPY.profession),
      education: text(raw.education_level, SPEC_COPY.education),
      nationality:
        nationalities.join(", ") || text(raw.ethnicity, SPEC_COPY.nationality),
      languages: languages.join(", ") || SPEC_COPY.languages,
      religion:
        religion === "—"
          ? "Islam (Practising)"
          : practice && practice !== "—"
            ? `${religion} (${practice})`
            : religion,
      relationshipGoal: text(raw.looking_for_intention, SPEC_COPY.relationshipGoal),
    },
    about: useSpecCopy ? SPEC_COPY.about : text(raw.short_bio, SPEC_COPY.about),
    interests: (interests.length ? interests : SPEC_COPY.interests).map((label) => ({
      label,
      icon: interestIcon(label),
    })),
    lookingFor: SPEC_COPY.lookingFor,
    dealbreakers: SPEC_COPY.dealbreakers,
    photos,
    values: (values.length ? values : SPEC_COPY.values).map((label) => ({
      label,
      icon: <Star className="h-3.5 w-3.5" />,
    })),
    personalDetails: [
      {
        icon: <Users className="h-4 w-4" />,
        label: "Marital status",
        value: relationshipStatus,
      },
      {
        icon: <RingsIcon className="h-4 w-4" />,
        label: "Children",
        value: hasChildren ? text(raw.children_count, "Has children") : "No children",
      },
      {
        icon: <Star className="h-4 w-4" />,
        label: "Height",
        value: text(raw.height_display),
      },
      {
        icon: <Moon className="h-4 w-4" />,
        label: "Faith tradition",
        value: text(raw.religious_denomination, "Islam"),
      },
      {
        icon: <BookOpen className="h-4 w-4" />,
        label: "Languages",
        value: languages.join(", ") || SPEC_COPY.languages,
      },
    ],
    lifestyle: [
      {
        icon: <Leaf className="h-4 w-4" />,
        label: "Smoking",
        value: text(raw.smoking, "Never"),
      },
      {
        icon: <Leaf className="h-4 w-4" />,
        label: "Alcohol",
        value: text(raw.alcohol, "Never"),
      },
      {
        icon: <Leaf className="h-4 w-4" />,
        label: "Diet",
        value: text(raw.dietary_preferences, "Halal"),
      },
      {
        icon: <Dumbbell className="h-4 w-4" />,
        label: "Activity level",
        value: text(raw.activity_level, "Active"),
      },
      {
        icon: <Star className="h-4 w-4" />,
        label: "Top values",
        value: values.join(", ") || SPEC_COPY.values.join(", "),
      },
    ],
    familyFuture: [
      {
        icon: <Users className="h-4 w-4" />,
        label: "Family importance",
        value: text(raw.family_importance, "Very important"),
      },
      {
        icon: <Heart className="h-4 w-4" />,
        label: "More children",
        value: text(raw.wants_more_children, "Open to discussion"),
      },
      {
        icon: <Target className="h-4 w-4" />,
        label: "Marriage timeline",
        value: text(raw.marriage_timeline, "Within 1–2 years"),
      },
      {
        icon: <Users className="h-4 w-4" />,
        label: "Blended family",
        value: text(raw.blended_family_comfort, "Comfortable"),
      },
      {
        icon: <Globe className="h-4 w-4" />,
        label: "Relocation",
        value: text(raw.relocation_willingness, "Open to discussion"),
      },
    ],
  };
}

function DetailRows({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="mt-2 divide-y divide-[#EEE7DC]">
      {rows.map((row) => (
        <GlanceRow
          key={row.label}
          icon={row.icon}
          label={row.label}
          value={row.value}
        />
      ))}
    </dl>
  );
}

function OverviewPanel({ profile }: { profile: ProfileViewModel }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard icon={<Users className="h-7 w-7" />} title="At a Glance">
          <dl className="mt-2 divide-y divide-[#EEE7DC]">
            <GlanceRow
              icon={<BriefcaseBusiness className="h-4 w-4" />}
              label="Profession"
              value={profile.glance.profession}
            />
            <GlanceRow
              icon={<GraduationCap className="h-4 w-4" />}
              label="Education"
              value={profile.glance.education}
            />
            <GlanceRow
              icon={<Globe className="h-4 w-4" />}
              label="Nationality"
              value={profile.glance.nationality}
            />
            <GlanceRow
              icon={<Languages className="h-4 w-4" />}
              label="Languages"
              value={profile.glance.languages}
            />
            <GlanceRow
              icon={<Moon className="h-4 w-4" />}
              label="Religion"
              value={profile.glance.religion}
            />
            <GlanceRow
              icon={<Heart className="h-4 w-4" />}
              label="Relationship Goal"
              value={profile.glance.relationshipGoal}
            />
          </dl>
        </InfoCard>

        <div className="grid gap-4">
          <InfoCard
            icon={<UserRound className="h-7 w-7" />}
            title="A Little More About Me"
          >
            <p className="mt-3 text-[13px] leading-[1.75] text-[#4A4034]">
              {profile.about}
            </p>
          </InfoCard>

          <InfoCard icon={<Star className="h-7 w-7" />} title="My Interests">
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <Chip key={interest.label} icon={interest.icon} label={interest.label} />
              ))}
            </div>
          </InfoCard>
        </div>
      </div>

      <section className="grid gap-6 rounded-[14px] border border-[#E8E0D4] bg-[#FFFDF9] p-5 shadow-[0_2px_10px_rgba(64,45,20,0.05)] md:grid-cols-[1fr_1px_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Target className="h-6 w-6 text-[#B18345]" strokeWidth={1.7} />
            <h2 className="notification-serif text-[20px] font-bold text-[#14110E]">
              What I&apos;m Looking For
            </h2>
          </div>
          <p className="mt-3 text-[13px] leading-[1.75] text-[#4A4034]">
            {profile.lookingFor}
          </p>
        </div>
        <div className="hidden w-px bg-[#EEE7DC] md:block" />
        <div className="h-px bg-[#EEE7DC] md:hidden" />
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-[#B18345]" strokeWidth={1.7} />
            <h2 className="notification-serif text-[20px] font-bold text-[#14110E]">
              My Dealbreakers
            </h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.dealbreakers.map((item) => (
              <Chip key={item} label={item} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function AboutPanel({ profile }: { profile: ProfileViewModel }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoCard icon={<FileText className="h-7 w-7" />} title="My Story">
        <p className="mt-3 text-[13px] leading-[1.8] text-[#4A4034]">
          {profile.bio}
        </p>
        <p className="mt-3 text-[13px] leading-[1.8] text-[#4A4034]">
          {profile.about}
        </p>
        <VoiceIntroPlayer
          src={profile.voiceIntro.url}
          duration={profile.voiceIntro.duration}
        />
      </InfoCard>
      <InfoCard icon={<UserRound className="h-7 w-7" />} title="Personal Details">
        <DetailRows rows={profile.personalDetails} />
      </InfoCard>
    </div>
  );
}

function ValuesPanel({ profile }: { profile: ProfileViewModel }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoCard icon={<Star className="h-7 w-7" />} title="Values That Matter">
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.values.map((value) => (
            <Chip key={value.label} icon={value.icon} label={value.label} />
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-[1.8] text-[#4A4034]">
          {profile.about}
        </p>
      </InfoCard>
      <InfoCard icon={<Leaf className="h-7 w-7" />} title="Lifestyle">
        <DetailRows rows={profile.lifestyle} />
      </InfoCard>
    </div>
  );
}

function FamilyPanel({ profile }: { profile: ProfileViewModel }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoCard icon={<Users className="h-7 w-7" />} title="Family & Future">
        <DetailRows rows={profile.familyFuture} />
      </InfoCard>
      <InfoCard icon={<Target className="h-7 w-7" />} title="Looking For">
        <p className="mt-3 text-[13px] leading-[1.8] text-[#4A4034]">
          {profile.lookingFor}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.dealbreakers.map((item) => (
            <Chip key={item} label={item} />
          ))}
        </div>
      </InfoCard>
    </div>
  );
}

export default function ProfileDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const profileId = params?.id;

  const [profile, setProfile] = useState<ProfileViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [myAction, setMyAction] = useState<InteractionAction>(null);
  const [pendingAction, setPendingAction] = useState<InteractionAction>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Inappropriate content");
  const [reportDetails, setReportDetails] = useState("");

  useEffect(() => {
    if (!profileId) return;
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(`/api/v1/profiles/${profileId}`, {
          signal: controller.signal,
        });
        const json = await response.json();
        if (!response.ok || !json.data?.profile) throw new Error("Not found");
        setProfile(buildProfileViewModel(json.data.profile, profileId));
        setMyAction(mapServerAction(json.data.interaction?.myAction));
      } catch {
        if (!controller.signal.aborted) setProfile(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [profileId]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  async function toggleInteraction(target: Exclude<InteractionAction, null>) {
    if (!profileId || pendingAction) return;
    const previous = myAction;
    const next: InteractionAction = previous === target ? null : target;
    setMyAction(next);
    setPendingAction(target);

    try {
      if (target === "pass") {
        const response = await fetch(
          `/api/v1/profiles/${profileId}/dislike`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: next ? "dislike" : "none" }),
          },
        );
        if (!response.ok) throw new Error("Request failed");
      } else {
        const response = await fetch(`/api/v1/profiles/${profileId}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: next ? (target === "save" ? "bookmark" : "like") : "none",
          }),
        });
        const json = await response.json();
        if (!response.ok) throw new Error("Request failed");
        const returnedAction = mapServerAction(json.data?.interaction?.action);
        if (returnedAction !== null || next === null) setMyAction(returnedAction);
      }
      showToast(
        next === null
          ? "Interaction removed."
          : `${target === "save" ? "Profile saved" : target === "pass" ? "Profile passed" : "Profile liked"}.`,
      );
    } catch {
      setMyAction(previous);
      showToast("Could not update this action. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleStartChat() {
    if (!profileId) return;
    try {
      const response = await fetch("/api/v1/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: profileId }),
      });
      const json = await response.json();
      if (!response.ok || !json.data?.conversation?.id) {
        throw new Error(json.message || "Could not start chat.");
      }
      router.push(`/messages?conversation=${json.data.conversation.id}`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not start chat.",
      );
    }
  }

  async function handleBlockUser() {
    if (!profileId || !window.confirm("Are you sure you want to block this user?")) {
      return;
    }
    const response = await fetch("/api/v1/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockedId: profileId,
        reason: "Blocked from profile page",
      }),
    });
    if (response.ok) router.push("/explore");
    else showToast("Could not block this user.");
  }

  async function handleReportSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!profileId) return;
    const response = await fetch("/api/v1/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportedUserId: profileId,
        reportType: "profile",
        reason: reportReason,
        details: reportDetails,
      }),
    });
    const json = await response.json();
    setReportOpen(false);
    showToast(json.message || "Report submitted.");
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TABS.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = TABS.length - 1;
    if (nextIndex === currentIndex) return;
    event.preventDefault();
    const nextTab = TABS[nextIndex];
    setActiveTab(nextTab.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`profile-tab-${nextTab.id}`)?.focus();
    });
  }

  if (loading) {
    return (
      <main className="w-full">
        <div className="grid gap-6 md:grid-cols-[230px_1fr_200px]">
          <div className="aspect-[3/4] animate-pulse rounded-[14px] bg-[#F0E8DA]" />
          <div className="space-y-4">
            <div className="h-9 w-52 animate-pulse rounded-lg bg-[#F0E8DA]" />
            <div className="h-4 w-32 animate-pulse rounded bg-[#F0E8DA]" />
            <div className="h-36 animate-pulse rounded-[14px] bg-[#F0E8DA]" />
          </div>
          <div className="h-56 animate-pulse rounded-[14px] bg-[#F0E8DA]" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="w-full">
        <div className="rounded-[14px] border border-[#E8E0D4] bg-[#FFFDF9] p-12 text-center shadow-sm">
          <h1 className="notification-serif text-2xl font-bold text-[#14110E]">
            Profile Unavailable
          </h1>
          <p className="mt-2 text-sm text-[#665C4E]">
            This profile may have been removed or is no longer published.
          </p>
        </div>
      </main>
    );
  }

  const primaryPhoto = profile.photos.find((photo) => photo.isPrimary) ||
    profile.photos[0];

  return (
    <main className="w-full">
      {toast && (
        <div
          role="status"
          className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl"
        >
          {toast}
        </div>
      )}

      <section className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="w-full max-w-[280px] shrink-0 md:w-[230px] md:max-w-none">
          <WatermarkedPhoto
            src={primaryPhoto?.url || FALLBACK_PHOTO}
            alt={`Profile photograph of ${profile.name}${profile.age ? `, age ${profile.age}` : ""}`}
            watermarkText={primaryPhoto?.watermark || "MA'AAK VERIFIED VIEW"}
            className="aspect-[3/4] w-full rounded-[14px] border border-[#E8E0D4] shadow-[0_8px_24px_rgba(64,45,20,0.08)]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="notification-serif text-[34px] leading-tight font-bold text-[#14110E]">
            {profile.name}
            {profile.age ? `, ${profile.age}` : ""}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-[#4A4034]">
            <MapPin className="h-4 w-4 text-[#B18345]" />
            <span>{profile.location}</span>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {profile.statusChips.map((chip) => (
              <Chip key={chip.label} icon={chip.icon} label={chip.label} />
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-[#E8E0D4] bg-[#FFFDF9] p-4 shadow-[0_2px_10px_rgba(64,45,20,0.05)]">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#B18345]" />
              <h2 className="text-[13px] font-bold text-[#1A1612]">About Me</h2>
            </div>
            <p className="mt-2 text-[13px] leading-[1.7] text-[#4A4034]">
              {profile.bio}
            </p>
            <VoiceIntroPlayer
              src={profile.voiceIntro.url}
              duration={profile.voiceIntro.duration}
            />
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-row gap-2 md:w-[200px] md:flex-col md:gap-3">
          <button
            type="button"
            onClick={() => toggleInteraction("like")}
            disabled={pendingAction !== null}
            aria-label="Like profile"
            aria-pressed={myAction === "like"}
            title="Like"
            className="flex h-11 flex-1 shrink-0 items-center justify-center md:flex-none rounded-full border border-[#A9783D] bg-gradient-to-r from-[#DFBE8A] to-[#B18345] text-white shadow-sm transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B5F] disabled:opacity-50 md:w-full"
          >
            <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => toggleInteraction("pass")}
            disabled={pendingAction !== null}
            aria-label="Pass on profile"
            aria-pressed={myAction === "pass"}
            title="Pass"
            className={`flex h-11 flex-1 shrink-0 items-center justify-center md:flex-none rounded-full border border-[#B18345] text-[#B18345] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B5F] disabled:opacity-50 md:w-full ${
              myAction === "pass" ? "bg-[#F5EEE2]" : "bg-transparent hover:bg-[#F5EEE2]"
            }`}
          >
            <ThumbsDown className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => toggleInteraction("save")}
            disabled={pendingAction !== null}
            aria-label="Save profile"
            aria-pressed={myAction === "save"}
            title="Save"
            className={`flex h-11 flex-1 shrink-0 items-center justify-center md:flex-none rounded-full border border-[#B18345] text-[#B18345] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B5F] disabled:opacity-50 md:w-full ${
              myAction === "save" ? "bg-[#F5EEE2]" : "bg-transparent hover:bg-[#F5EEE2]"
            }`}
          >
            <Bookmark
              className="h-4 w-4"
              fill={myAction === "save" ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={handleStartChat}
            aria-label="Send message"
            className="flex h-11 flex-1 shrink-0 items-center justify-center md:flex-none gap-2 rounded-full bg-[#14110E] px-4 text-[12px] font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-[#1F1A16] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B5F] md:w-full"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Send Message</span>
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-[14px] border border-[#E8E0D4] bg-[#FFFDF9] p-1.5 shadow-sm">
        <div
          role="tablist"
          aria-label="Profile sections"
          onKeyDown={handleTabKeyDown}
          className="flex gap-1 overflow-x-auto pb-1 md:pb-0"
        >
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              id={`profile-tab-${tab.id}`}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              controls={`profile-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </section>

      <div
        id={`profile-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`profile-tab-${activeTab}`}
        className="mt-5"
      >
        {activeTab === "overview" ? <OverviewPanel profile={profile} /> : null}
        {activeTab === "about" ? <AboutPanel profile={profile} /> : null}
        {activeTab === "values" ? <ValuesPanel profile={profile} /> : null}
        {activeTab === "family" ? <FamilyPanel profile={profile} /> : null}
        {activeTab === "photos" ? (
          <PhotosPanel photos={profile.photos} name={profile.name} />
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-end gap-4 text-[11px] text-[#665C4E]">
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="inline-flex items-center gap-1.5 hover:text-[#9C743C]"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          Report profile
        </button>
        <button
          type="button"
          onClick={handleBlockUser}
          className="inline-flex items-center gap-1.5 hover:text-[#9C743C]"
        >
          <Ban className="h-3.5 w-3.5" aria-hidden="true" />
          Block user
        </button>
      </div>

      {reportOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleReportSubmit}
            className="w-full max-w-md rounded-[14px] border border-[#E8E0D4] bg-[#FFFDF9] p-6"
          >
            <h2 className="notification-serif text-xl font-bold text-[#14110E]">
              Report Profile
            </h2>
            <div className="mt-4 space-y-3">
              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-xs"
              >
                <option value="Inappropriate content">Inappropriate content</option>
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
                onChange={(event) => setReportDetails(event.target.value)}
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
                  className="rounded-full bg-[#14110E] px-5 py-2 text-xs font-semibold text-white"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
