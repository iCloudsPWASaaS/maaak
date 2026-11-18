"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AdminAccessDenied,
  AdminNotice,
  AdminPageHeader,
  formatDate,
  statusStyle,
} from "@/components/admin/AdminUi";

interface MatchingWeights {
  family_future: number;
  relationship_intention: number;
  my_values: number;
  dating_as_parent: number;
  personality: number;
  lifestyle_preferences: number;
}

const DEFAULT_WEIGHTS: MatchingWeights = {
  family_future: 0.25,
  relationship_intention: 0.2,
  my_values: 0.2,
  dating_as_parent: 0.15,
  personality: 0.1,
  lifestyle_preferences: 0.1,
};

const WEIGHT_LABELS: Record<keyof MatchingWeights, string> = {
  family_future: "Family & Future (25%)",
  relationship_intention: "Relationship Intention (20%)",
  my_values: "My Values (20%)",
  dating_as_parent: "Dating as a Parent (15%)",
  personality: "Personality (10%)",
  lifestyle_preferences: "Lifestyle Preferences (10%)",
};

export default function AdminMatchingPage() {
  const [weights, setWeights] = useState<MatchingWeights>(DEFAULT_WEIGHTS);
  const [runs, setRuns] = useState<Record<string, unknown>[]>([]);
  const [scores, setScores] = useState<Record<string, unknown>[]>([]);
  const [recommendations, setRecommendations] = useState<Record<string, unknown>[]>([]);
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(null);
  const [running, setRunning] = useState(false);

  const weightSum = useMemo(
    () =>
      Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0),
    [weights],
  );

  async function loadMatchingData() {
    const res = await fetch("/api/v1/admin/matching");
    if (res.status === 403 || res.status === 401) {
      setDenied(true);
      return;
    }
    if (!res.ok) return;
    const json = await res.json();
    if (json.data?.weights) {
      setWeights({ ...DEFAULT_WEIGHTS, ...json.data.weights });
    }
    setRuns(json.data?.runs || []);
    setScores(json.data?.compatibilityScores || []);
    setRecommendations(json.data?.recommendations || []);
  }

  useEffect(() => {
    loadMatchingData();
  }, []);

  async function runMatching(e: React.FormEvent) {
    e.preventDefault();
    if (Math.abs(weightSum - 1) > 0.01) {
      setNotice({
        text: "Compatibility weights must add up to exactly 1.00.",
        tone: "error",
      });
      return;
    }

    setRunning(true);
    const res = await fetch("/api/v1/admin/matching", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weights }),
    });
    const json = await res.json();
    setRunning(false);
    setNotice({
      text:
        json.message ||
        (res.ok ? "Matching run completed." : "Matching run failed."),
      tone: res.ok ? "success" : "error",
    });
    if (res.ok) loadMatchingData();
  }

  if (denied) return <AdminAccessDenied />;

  return (
    <div>
      {notice && <AdminNotice message={notice.text} tone={notice.tone} />}
      <AdminPageHeader
        eyebrow="Compatibility Engine"
        title="Gale-Shapley Stable Matching Console"
        description="Tune the six compatibility domains and trigger batch matching. Dealbreakers are enforced as absolute pass/fail gates and cannot be overridden by administrators."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={runMatching}
          className="rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-xs lg:col-span-5"
        >
          <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
            Compatibility Domain Weights
          </h2>
          <p className="mt-1 text-xs text-[#665C4E]">
            Weights must total exactly 1.00 (100%).
          </p>

          <div className="mt-5 space-y-3">
            {(Object.keys(WEIGHT_LABELS) as (keyof MatchingWeights)[]).map((key) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-xl bg-[#FAF6F0] px-4 py-2.5 text-xs font-semibold text-[#3D362D]"
              >
                <span>{WEIGHT_LABELS[key]}</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={weights[key]}
                  onChange={(e) =>
                    setWeights({ ...weights, [key]: Number(e.target.value) })
                  }
                  className="w-20 rounded-lg border border-[#E5DEC9] bg-white px-2 py-1.5 text-right text-xs"
                />
              </label>
            ))}
          </div>

          <div
            className={`mt-4 rounded-xl px-4 py-3 text-xs font-semibold ${
              Math.abs(weightSum - 1) > 0.01
                ? "bg-rose-50 text-rose-700"
                : "bg-emerald-50 text-emerald-800"
            }`}
          >
            Total Weight: {weightSum.toFixed(2)} / 1.00
          </div>

          <div className="mt-4 rounded-xl border border-[#C59B5F]/40 bg-[#FAF6F0] p-3 text-[11px] leading-relaxed text-[#6E5229]">
            Dealbreakers remain mandatory. Administrators cannot disable or
            bypass eligibility rules.
          </div>

          <button
            type="submit"
            disabled={running}
            className="mt-5 w-full rounded-full bg-[#14110E] py-3 text-xs font-semibold text-[#DFBE8A] disabled:opacity-60"
          >
            {running ? "Running Stable Matching..." : "Save Weights & Run Matching"}
          </button>
        </form>

        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6">
            <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
              Matching Run History ({runs.length})
            </h2>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {runs.length === 0 ? (
                <p className="text-xs text-[#665C4E]">No matching runs yet.</p>
              ) : (
                runs.map((run) => (
                  <div
                    key={String(run.id)}
                    className="flex flex-wrap items-center justify-between rounded-xl bg-[#FAF6F0] px-4 py-3 text-xs"
                  >
                    <div>
                      <div className="font-mono text-[11px] text-[#6E5229]">
                        {String(run.id).slice(0, 8)} • {String(run.run_type)}
                      </div>
                      <div className="text-[#665C4E]">
                        {formatDate(run.started_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 font-semibold">
                        {String(run.stable_matches_count ?? 0)} matches
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 font-semibold">
                        {String(run.blocking_pairs_count ?? 0)} blocking
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 font-semibold ${statusStyle(
                          run.status,
                        )}`}
                      >
                        {String(run.status)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6">
            <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
              Latest Recommendations ({recommendations.length})
            </h2>
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {recommendations.length === 0 ? (
                <p className="text-xs text-[#665C4E]">
                  No recommendations generated yet.
                </p>
              ) : (
                recommendations.map((rec) => (
                  <div
                    key={String(rec.id)}
                    className="flex items-center justify-between rounded-xl border border-[#FAF6F0] px-4 py-2.5 text-xs"
                  >
                    <span className="font-mono text-[11px]">
                      {String(rec.user_a_id).slice(0, 6)} ↔{" "}
                      {String(rec.user_b_id).slice(0, 6)}
                    </span>
                    <span className="font-bold text-[#8C6D3F]">
                      {Number(rec.mutual_score || 0).toFixed(3)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6">
            <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
              Compatibility Score Audit ({scores.length})
            </h2>
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {scores.length === 0 ? (
                <p className="text-xs text-[#665C4E]">
                  No compatibility scores calculated yet.
                </p>
              ) : (
                scores.map((score) => (
                  <div
                    key={String(score.id)}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FAF6F0] px-4 py-2.5 text-xs"
                  >
                    <span>
                      {String(score.user_a_id).slice(0, 6)} ↔{" "}
                      {String(score.user_b_id).slice(0, 6)}
                    </span>
                    <span className="font-bold text-[#8C6D3F]">
                      {Number(score.mutual_score || 0).toFixed(3)}
                    </span>
                    <span className="text-[11px] text-[#665C4E]">
                      {score.is_mutually_eligible
                        ? "Eligible"
                        : String(score.exclusion_reason_code || "Excluded")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
