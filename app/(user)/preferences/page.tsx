"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  SlidersHorizontal,
  Save,
} from "lucide-react";
import {
  EDUCATION_OPTIONS,
  SUPPORTED_DEALBREAKERS,
} from "@/lib/workbook-catalog";

export default function PreferencesAndDealbreakersPage() {
  const [preferences, setPreferences] = useState<Record<string, unknown>>({
    preferred_age_min: 24,
    preferred_age_max: 42,
    preferred_distance_miles: "No preference",
    preferred_locations: [],
    preferred_religions: ["Muslim/Islam"],
    religion_matching_importance: "Essential",
    preferred_religious_practice: "No preference",
    preferred_denominations: [],
    open_to_different_ethnicities: "No preference",
    open_to_different_nationalities: "No preference",
    preferred_languages_choice: "No preference",
    partner_has_children_pref: "No preference",
    preferred_children_count: "No preference",
    preferred_wants_more_children: "No preference",
    preferred_relationship_intention: "Marriage",
    preferred_smoking: "Never",
    preferred_alcohol: "Never",
    preferred_diet: "Halal",
    preferred_activity_level: "No preference",
    preferred_education: "No preference",
  });

  const [selectedDealbreakers, setSelectedDealbreakers] = useState<
    { dealbreaker_code: string; required_value: unknown }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/preferences").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/v1/dealbreakers").then((r) => (r.ok ? r.json() : null)),
    ]).then(([prefJson, dbJson]) => {
      if (prefJson?.data?.preferences) {
        setPreferences((prev) => ({ ...prev, ...prefJson.data.preferences }));
      }
      if (dbJson?.data?.dealbreakers) {
        setSelectedDealbreakers(
          dbJson.data.dealbreakers.map(
            (d: { dealbreaker_code: string; required_value: unknown }) => ({
              dealbreaker_code: d.dealbreaker_code,
              required_value: d.required_value,
            }),
          ),
        );
      }
    });
  }, []);

  function deriveRequirementValueForCode(code: string): unknown {
    switch (code) {
      case "age_range":
        return {
          min: Number(preferences.preferred_age_min || 22),
          max: Number(preferences.preferred_age_max || 45),
        };
      case "distance":
        return String(preferences.preferred_distance_miles || "50");
      case "religion":
        return Array.isArray(preferences.preferred_religions) &&
          preferences.preferred_religions.length > 0
          ? preferences.preferred_religions
          : ["Muslim/Islam"];
      case "smoking":
        return String(preferences.preferred_smoking || "Never");
      case "alcohol":
        return String(preferences.preferred_alcohol || "Never");
      case "wants_more_children":
        return [
          String(
            preferences.preferred_wants_more_children &&
              preferences.preferred_wants_more_children !== "No preference"
              ? preferences.preferred_wants_more_children
              : "Definitely",
          ),
        ];
      case "relationship_intention":
        return [
          String(preferences.preferred_relationship_intention || "Marriage"),
        ];
      default:
        return "Required";
    }
  }

  function toggleDealbreaker(code: string) {
    setError(null);
    const exists = selectedDealbreakers.some((d) => d.dealbreaker_code === code);
    if (exists) {
      setSelectedDealbreakers((prev) =>
        prev.filter((d) => d.dealbreaker_code !== code),
      );
    } else {
      if (selectedDealbreakers.length >= 5) {
        setError(
          "Maximum of FIVE dealbreakers allowed. Uncheck one before adding another.",
        );
        return;
      }
      setSelectedDealbreakers((prev) => [
        ...prev,
        {
          dealbreaker_code: code,
          required_value: deriveRequirementValueForCode(code),
        },
      ]);
    }
  }

  async function handleSaveAll() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      // Sync dealbreaker required_values with current preferences
      const syncedDealbreakers = selectedDealbreakers.map((d) => ({
        dealbreaker_code: d.dealbreaker_code,
        required_value: deriveRequirementValueForCode(d.dealbreaker_code),
      }));

      const [prefRes, dbRes] = await Promise.all([
        fetch("/api/v1/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        }),
        fetch("/api/v1/dealbreakers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dealbreakers: syncedDealbreakers }),
        }),
      ]);

      const prefJson = await prefRes.json();
      const dbJson = await dbRes.json();

      if (!prefRes.ok || !dbRes.ok) {
        setError(
          dbJson.errors?.[0]?.message ||
            prefJson.errors?.[0]?.message ||
            "Failed to save preferences or dealbreakers.",
        );
      } else {
        setMessage(
          "Saved! Mutual eligibility and Gale-Shapley recommendations have been recalculated.",
        );
      }
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-600/30 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          <ShieldAlert className="h-4 w-4 text-rose-700" />
          <span>{error}</span>
        </div>
      )}

      {/* WHAT I WANT (Preferences from Compatibility-Preference worksheet) */}
      <div className="rounded-3xl border border-[#E5DEC9] bg-white p-7 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-[#E5DEC9] pb-4">
          <SlidersHorizontal className="h-5 w-5 text-[#9C743C]" />
          <h2 className="font-serif text-2xl font-semibold text-[#1A1612]">
            WHAT I WANT — Ideal Partner Preferences
          </h2>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-[#1A1612]">
              Preferred Minimum Age
            </label>
            <input
              type="number"
              min={18}
              max={85}
              value={Number(preferences.preferred_age_min || 22)}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  preferred_age_min: Number(e.target.value),
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1612]">
              Preferred Maximum Age
            </label>
            <input
              type="number"
              min={18}
              max={85}
              value={Number(preferences.preferred_age_max || 45)}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  preferred_age_max: Number(e.target.value),
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1612]">
              Maximum Meeting Distance
            </label>
            <select
              value={String(
                preferences.preferred_distance_miles || "No preference",
              )}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  preferred_distance_miles: e.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-sm"
            >
              <option value="No preference">No preference</option>
              <option value="10">10 miles</option>
              <option value="25">25 miles</option>
              <option value="50">50 miles</option>
              <option value="100">100 miles</option>
              <option value="200+ miles">200+ miles</option>
              <option value="Anywhere in UK">Anywhere in UK</option>
              <option value="International">International</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1612]">
              How important is matching religion?
            </label>
            <select
              value={String(
                preferences.religion_matching_importance || "No preference",
              )}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  religion_matching_importance: e.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-sm"
            >
              <option value="No preference">No preference</option>
              <option value="Preference">Preference</option>
              <option value="Strong preference">Strong preference</option>
              <option value="Essential">Essential</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1612]">
              Preferred Level of Religious Practice
            </label>
            <select
              value={String(
                preferences.preferred_religious_practice || "No preference",
              )}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  preferred_religious_practice: e.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-sm"
            >
              <option value="No preference">No preference</option>
              <option value="Similar to me">Similar to me</option>
              <option value="More practising">More practising</option>
              <option value="Less practising">Less practising</option>
              <option value="Very practising">Very practising</option>
              <option value="Practising">Practising</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1612]">
              Partner Has Children Preference
            </label>
            <select
              value={String(
                preferences.partner_has_children_pref || "No preference",
              )}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  partner_has_children_pref: e.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-sm"
            >
              <option value="No preference">No preference</option>
              <option value="Prefer a partner with children">
                Prefer a partner with children
              </option>
              <option value="Open to a partner with or without children">
                Open to a partner with or without children
              </option>
              <option value="Prefer a partner without children">
                Prefer a partner without children
              </option>
              <option value="Depends">Depends</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1612]">
              Partner Wants More Children
            </label>
            <select
              value={String(
                preferences.preferred_wants_more_children || "No preference",
              )}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  preferred_wants_more_children: e.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-sm"
            >
              <option value="No preference">No preference</option>
              <option value="Definitely">Definitely</option>
              <option value="Open to it">Open to it</option>
              <option value="Unsure">Unsure</option>
              <option value="Probably not">Probably not</option>
              <option value="Definitely not">Definitely not</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1612]">
              Partner Smoking Preference
            </label>
            <select
              value={String(preferences.preferred_smoking || "No preference")}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  preferred_smoking: e.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-sm"
            >
              <option value="No preference">No preference</option>
              <option value="Never">Never</option>
              <option value="Occasionally">Occasionally</option>
              <option value="Social">Social</option>
              <option value="Trying to quit">Trying to quit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1612]">
              Partner Alcohol Preference
            </label>
            <select
              value={String(preferences.preferred_alcohol || "No preference")}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  preferred_alcohol: e.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-sm"
            >
              <option value="No preference">No preference</option>
              <option value="Never">Never</option>
              <option value="Occasionally">Occasionally</option>
              <option value="Socially">Socially</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1612]">
              Partner Education Preference
            </label>
            <select
              value={String(preferences.preferred_education || "No preference")}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  preferred_education: e.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-sm"
            >
              <option value="No preference">No preference</option>
              {EDUCATION_OPTIONS.map((edu) => (
                <option key={edu} value={edu}>
                  {edu}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1612]">
              Open to Different Ethnicities?
            </label>
            <select
              value={String(
                preferences.open_to_different_ethnicities || "No preference",
              )}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  open_to_different_ethnicities: e.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-sm"
            >
              <option value="No preference">No preference (Default)</option>
              <option value="Yes">Yes</option>
              <option value="Maybe">Maybe</option>
              <option value="No">No (Same ethnicity)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1612]">
              Relationship Intention Preference
            </label>
            <select
              value={String(
                preferences.preferred_relationship_intention || "Marriage",
              )}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  preferred_relationship_intention: e.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3.5 py-2.5 text-sm"
            >
              <option value="No preference">No preference</option>
              <option value="Marriage">Marriage</option>
              <option value="Long-term leading to marriage">
                Long-term leading to marriage
              </option>
              <option value="Serious relationship">Serious relationship</option>
            </select>
          </div>
        </div>
      </div>

      {/* WHAT I REQUIRE (Dealbreakers Up Front — Max 5) */}
      <div className="rounded-3xl border border-[#C59B5F] bg-white p-7 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DEC9] pb-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#1A1612]">
              WHAT I REQUIRE — Dealbreakers Up Front (Choose up to 5)
            </h2>
            <p className="text-xs text-[#665C4E]">
              Anyone who fails your selected dealbreakers (or leaves the field
              unanswered) will be excluded from your recommendations.
            </p>
          </div>
          <span className="rounded-full bg-[#14110E] px-4 py-1.5 text-xs font-bold text-[#DFBE8A]">
            {selectedDealbreakers.length} / 5 Non-Negotiables Selected
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPORTED_DEALBREAKERS.map((d) => {
            const active = selectedDealbreakers.some(
              (item) => item.dealbreaker_code === d.code,
            );
            return (
              <button
                key={d.code}
                type="button"
                onClick={() => toggleDealbreaker(d.code)}
                className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-[#C59B5F] bg-[#14110E] text-[#FAF6F0] shadow-md"
                    : "border-[#E5DEC9] bg-[#FAF6F0] text-[#1A1612] hover:border-[#C59B5F]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{d.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active
                        ? "bg-[#C59B5F] text-[#14110E]"
                        : "bg-white text-[#665C4E]"
                    }`}
                  >
                    {active ? "✓ Dealbreaker" : "Optional"}
                  </span>
                </div>
                <p
                  className={`mt-1.5 text-[11px] ${
                    active ? "text-white/75" : "text-[#665C4E]"
                  }`}
                >
                  {d.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAll}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#C59B5F] to-[#DFBE8A] px-8 py-3.5 text-xs font-bold text-[#14110E] shadow-lg"
          >
            <Save className="h-4 w-4" />
            <span>Confirm Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
}
