"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Upload,
  Trash2,
  Mic,
  ArrowLeft,
  ArrowRight,
  Save,
  Sparkles,
} from "lucide-react";
import {
  WORKBOOK_QUESTIONS,
  type CatalogQuestion,
} from "@/lib/workbook-catalog";

const WIZARD_STEPS = [
  {
    step: 1,
    slug: "profile-about",
    title: "About Me, Background & Faith",
    subtitle: "Worksheet: Profile, Profession & Hobbies Interest list",
  },
  {
    step: 2,
    slug: "profile-lifestyle",
    title: "Lifestyle & Religious Practice",
    subtitle: "Worksheet: Profile (Lifestyle & Religious Practices)",
  },
  {
    step: 3,
    slug: "compatibility-values",
    title: "My Core Values (20% Weight)",
    subtitle: "Worksheet: Compatibility-My Values",
  },
  {
    step: 4,
    slug: "compatibility-family",
    title: "Family, Children & Future (25% Weight)",
    subtitle: "Worksheet: Compatibility-Family",
  },
  {
    step: 5,
    slug: "compatibility-parenting",
    title: "Dating as a Parent (15% Weight)",
    subtitle: "Worksheet: Compatibility-Dating as a Paren",
  },
  {
    step: 6,
    slug: "compatibility-personality",
    title: "Personality & Communication (10% Weight)",
    subtitle: "Worksheet: Compatibility-Personality",
  },
  {
    step: 7,
    slug: "compatibility-intention",
    title: "Relationship & Marriage Intention (20% Weight)",
    subtitle: "Worksheet: Compat-Relationship Intention",
  },
  {
    step: 8,
    slug: "photos-review",
    title: "Photographs, Voice Bio & Publish",
    subtitle: "Minimum 2 clear photos required (No hide-photo option)",
  },
];

export default function ProfileWizardPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [photos, setPhotos] = useState<
    { id: string; url: string; is_primary: boolean }[]
  >([]);
  const [completion, setCompletion] = useState<{
    percentage: number;
    hasMinimumPhotos: boolean;
    canPublish: boolean;
    missingFields: string[];
  }>({
    percentage: 0,
    hasMinimumPhotos: false,
    canPublish: false,
    missingFields: [],
  });
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [voiceUrlInput, setVoiceUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadMyProfile() {
    const res = await fetch("/api/v1/profiles/me");
    if (res.ok) {
      const json = await res.json();
      setProfile(json.data?.profile || {});
      setPhotos(json.data?.photos || []);
      if (json.data?.completion) setCompletion(json.data.completion);
      if (json.data?.profile?.voice_bio_url) {
        setVoiceUrlInput(String(json.data.profile.voice_bio_url));
      }
    }
  }

  useEffect(() => {
    loadMyProfile();
  }, []);

  function updateField(col: string, value: unknown) {
    setProfile((prev) => ({ ...prev, [col]: value }));
  }

  function toggleMultiSelect(col: string, optionValue: string, maxSelect = 5) {
    const current = Array.isArray(profile[col])
      ? ([...(profile[col] as string[])] as string[])
      : [];
    if (current.includes(optionValue)) {
      updateField(
        col,
        current.filter((v) => v !== optionValue),
      );
    } else {
      if (current.length >= maxSelect) {
        setError(`You can select at most ${maxSelect} options for this field.`);
        setTimeout(() => setError(null), 3500);
        return;
      }
      updateField(col, [...current, optionValue]);
    }
  }

  async function handleSaveStep(publish = false) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/profiles/me/answers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileUpdates: profile,
          wizard_step: currentStep,
          publish,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(
          json.errors?.[0]?.message || json.message || "Could not save profile.",
        );
      } else {
        setProfile(json.data.profile);
        setCompletion(json.data.completion);
        setMessage(
          publish
            ? "Alhamdulillah! Your profile is published and Gale-Shapley matches have been updated."
            : "Progress saved & compatibility recalculated!",
        );
      }
    } catch {
      setError("Network error while saving profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPhotoByUrl() {
    if (!photoUrlInput.trim()) return;
    setError(null);
    const res = await fetch("/api/v1/profiles/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: photoUrlInput.trim(),
        isPrimary: photos.length === 0,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || "Photo upload failed.");
    } else {
      setPhotoUrlInput("");
      await loadMyProfile();
      setMessage("Photograph added to your profile.");
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mediaType", "photo");
    formData.append("isPrimary", String(photos.length === 0));

    const res = await fetch("/api/v1/profiles/photos", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || "File upload failed.");
    } else {
      await loadMyProfile();
      setMessage("Photograph uploaded to matrimony bucket.");
    }
  }

  async function handleDeletePhoto(id: string) {
    const res = await fetch(`/api/v1/profiles/photos/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadMyProfile();
    }
  }

  async function handleSaveVoiceBio() {
    if (!voiceUrlInput.trim()) return;
    const res = await fetch("/api/v1/profiles/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaType: "voice_bio",
        url: voiceUrlInput.trim(),
        durationSec: 25,
      }),
    });
    if (res.ok) {
      setMessage("30-second Voice Bio saved!");
      await loadMyProfile();
    }
  }

  const activeStepMeta = WIZARD_STEPS[currentStep - 1];
  const stepQuestions = WORKBOOK_QUESTIONS.filter((q) => {
    if (q.categorySlug !== activeStepMeta.slug) return false;
    if (q.conditionalOn) {
      const userGender = String(profile.gender || "Female");
      if (!q.conditionalOn.values.includes(userGender)) return false;
    }
    return true;
  });

  function renderQuestionInput(q: CatalogQuestion) {
    const col = q.profileColumn || q.code;
    const val = profile[col];

    if (q.answerType === "text") {
      return (
        <input
          type="text"
          maxLength={q.maxLength || 120}
          value={String(val || "")}
          onChange={(e) => updateField(col, e.target.value)}
          placeholder={`Enter ${q.questionText}`}
          className="mt-2 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-4 py-2.5 text-sm text-[#1A1612]"
        />
      );
    }

    if (q.answerType === "textarea") {
      const strVal = String(val || "");
      return (
        <div>
          <textarea
            rows={3}
            maxLength={q.maxLength || 300}
            value={strVal}
            onChange={(e) => updateField(col, e.target.value)}
            placeholder="Share a warm, authentic summary (maximum 300 characters)..."
            className="mt-2 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-4 py-2.5 text-sm text-[#1A1612]"
          />
          <div className="mt-1 text-right text-[11px] text-[#665C4E]">
            {strVal.length} / {q.maxLength || 300} characters
          </div>
        </div>
      );
    }

    if (q.answerType === "audio") {
      return (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={voiceUrlInput}
            onChange={(e) => setVoiceUrlInput(e.target.value)}
            placeholder="Paste or record up to 30s audio bio URL (.mp3 / .webm)"
            className="flex-1 rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-4 py-2.5 text-xs"
          />
          <button
            type="button"
            onClick={handleSaveVoiceBio}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#14110E] px-4 py-2.5 text-xs font-semibold text-[#DFBE8A]"
          >
            <Mic className="h-3.5 w-3.5" />
            Save Voice Bio (Max 30s)
          </button>
        </div>
      );
    }

    if (q.answerType === "single_select") {
      const options = q.options || [];
      return (
        <select
          value={String(val || "")}
          onChange={(e) => updateField(col, e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-4 py-2.5 text-sm text-[#1A1612]"
        >
          <option value="">Select an option...</option>
          {options.map((opt, idx) => (
            <option key={`${opt.value}-${idx}`} value={opt.value}>
              {opt.group ? `${opt.group} — ${opt.label}` : opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (q.answerType === "multi_select") {
      const selectedList = Array.isArray(val) ? (val as string[]) : [];
      const maxSel = q.maxSelect || 5;
      return (
        <div className="mt-2">
          <div className="mb-2 text-xs text-[#8C6D3F]">
            Selected: {selectedList.length} / {maxSel}
          </div>
          <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] p-3">
            {(q.options || []).map((opt, idx) => {
              const active = selectedList.includes(opt.value);
              return (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  onClick={() => toggleMultiSelect(col, opt.value, maxSel)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-[#14110E] text-[#DFBE8A] shadow-xs"
                      : "border border-[#E5DEC9] bg-white text-[#3D362D] hover:border-[#C59B5F]"
                  }`}
                >
                  {opt.group ? `${opt.group}: ${opt.label}` : opt.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      {/* Top Completion Header */}
      <div className="rounded-3xl border border-[#C59B5F]/40 bg-[#14110E] p-6 text-[#FAF6F0]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#DFBE8A]">
              ME — My Matrimonial Profile Wizard
            </span>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-white">
              {activeStepMeta.title}
            </h1>
            <p className="text-xs text-white/70">{activeStepMeta.subtitle}</p>
          </div>
          <div className="text-right">
            <div className="font-serif text-3xl font-bold text-[#DFBE8A]">
              {completion.percentage}%
            </div>
            <div className="text-[11px] text-white/65">
              Profile Completion • {photos.length}/2 Min Photos
            </div>
          </div>
        </div>

        {/* Stepper Pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {WIZARD_STEPS.map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                currentStep === s.step
                  ? "bg-[#C59B5F] text-[#14110E]"
                  : "bg-white/10 text-white/75 hover:bg-white/20"
              }`}
            >
              {s.step}. {s.title.split(" (")[0]}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-600/30 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      {/* Step Content */}
      {currentStep < 8 ? (
        <div className="space-y-5 rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-xs sm:p-8">
          {stepQuestions.map((q) => (
            <div
              key={q.code}
              className="border-b border-[#FAF6F0] pb-5 last:border-none last:pb-0"
            >
              <label className="block text-sm font-semibold text-[#1A1612]">
                {q.questionText}{" "}
                {q.isRequired && <span className="text-[#9C743C]">*</span>}
              </label>
              {q.helpText && (
                <p className="mt-0.5 text-xs text-[#665C4E]">{q.helpText}</p>
              )}
              {renderQuestionInput(q)}
            </div>
          ))}
        </div>
      ) : (
        /* Step 8: Profile Photographs & Final Review */
        <div className="space-y-6 rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-xs sm:p-8">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#1A1612]">
              Profile Photographs (Minimum 2 Required)
            </h2>
            <ul className="mt-2 grid gap-2 text-xs text-[#5C5346] sm:grid-cols-2">
              <li>• Minimum 2 photos required to publish</li>
              <li>• At least one clear face photo</li>
              <li>• No children in primary profile photo</li>
              <li>• No contact details displayed in photos</li>
              <li>• No inappropriate images or impersonation</li>
              <li>
                • <strong>Strict Policy:</strong> Profile photos are always
                visible to members (no hide-photo feature)
              </li>
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {photos.map((p, idx) => (
              <div
                key={p.id}
                className="relative overflow-hidden rounded-2xl border border-[#E5DEC9]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={`Profile photo ${idx + 1}`}
                  className="h-52 w-full object-cover"
                />
                <div className="flex items-center justify-between bg-[#14110E] px-3 py-2 text-xs text-white">
                  <span>{p.is_primary ? "Primary Photo" : `Photo #${idx + 1}`}</span>
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(p.id)}
                    aria-label="Delete photo"
                    className="text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 rounded-2xl bg-[#FAF6F0] p-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#1A1612]">
                Upload Photograph File (JPEG, PNG, WebP, AVIF)
              </label>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#C59B5F] bg-white px-4 py-3 text-xs font-semibold text-[#8C6D3F] hover:bg-[#FAF6F0]">
                <Upload className="h-4 w-4" />
                <span>Choose Image File</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1612]">
                Or Add Photograph URL
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="url"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 rounded-xl border border-[#E5DEC9] bg-white px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddPhotoByUrl}
                  className="rounded-xl bg-[#14110E] px-4 py-2 text-xs font-semibold text-[#DFBE8A]"
                >
                  Add Photo
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#C59B5F]/40 bg-[#14110E] p-6 text-white">
            <h3 className="font-serif text-xl font-semibold text-[#DFBE8A]">
              Ready to Publish Your Ma&apos;aak Profile?
            </h3>
            <p className="mt-1 text-xs text-white/75">
              Publishing enters your profile into the Gale-Shapley mutual
              compatibility pool while strictly enforcing your dealbreakers.
            </p>
            <button
              type="button"
              disabled={saving || photos.length < 2}
              onClick={() => handleSaveStep(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#C59B5F] to-[#DFBE8A] px-7 py-3 text-xs font-bold text-[#14110E] disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {photos.length < 2
                  ? "Add at least 2 photos to Publish"
                  : "Publish Profile & Run Gale-Shapley Matching"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          disabled={currentStep <= 1}
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          className="inline-flex items-center gap-2 rounded-full border border-[#E5DEC9] bg-white px-5 py-2.5 text-xs font-semibold text-[#1A1612] disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Previous Step</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveStep(false)}
            className="inline-flex items-center gap-2 rounded-full border border-[#C59B5F] bg-white px-5 py-2.5 text-xs font-semibold text-[#1A1612]"
          >
            <Save className="h-4 w-4 text-[#9C743C]" />
            <span>{saving ? "Saving..." : "Save & Continue Later"}</span>
          </button>

          {currentStep < 8 && (
            <button
              type="button"
              onClick={async () => {
                await handleSaveStep(false);
                setCurrentStep((s) => Math.min(8, s + 1));
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#14110E] px-6 py-2.5 text-xs font-semibold text-[#DFBE8A]"
            >
              <span>Save &amp; Next Step</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
