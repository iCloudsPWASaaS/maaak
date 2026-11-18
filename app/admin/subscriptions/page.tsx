"use client";

import React, { useEffect, useState } from "react";
import {
  AdminAccessDenied,
  AdminNotice,
  AdminPageHeader,
  formatDate,
  statusStyle,
} from "@/components/admin/AdminUi";

interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  price_monthly: number;
  trial_days: number;
  trial_disclosure_text?: string;
  badge_text?: string;
  is_coming_soon: boolean;
  is_purchasable: boolean;
  is_active: boolean;
  max_introduction_requests: number;
  can_message: boolean;
  can_audio_call: boolean;
  can_video_call: boolean;
  features: string[];
}

interface PlanForm {
  slug: string;
  name: string;
  tagline: string;
  priceMonthly: string;
  trialDays: string;
  trialDisclosureText: string;
  badgeText: string;
  featuresText: string;
  maxIntroductionRequests: string;
  isComingSoon: boolean;
  isPurchasable: boolean;
  isActive: boolean;
  canMessage: boolean;
  canAudioCall: boolean;
  canVideoCall: boolean;
}

const EMPTY_FORM: PlanForm = {
  slug: "",
  name: "",
  tagline: "",
  priceMonthly: "0",
  trialDays: "0",
  trialDisclosureText: "",
  badgeText: "",
  featuresText: "[]",
  maxIntroductionRequests: "10",
  isComingSoon: false,
  isPurchasable: false,
  isActive: true,
  canMessage: false,
  canAudioCall: false,
  canVideoCall: false,
};

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<Record<string, unknown>[]>([]);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(null);

  async function loadSubscriptionData() {
    const res = await fetch("/api/v1/admin/subscriptions");
    if (res.status === 403 || res.status === 401) {
      setDenied(true);
      return;
    }
    if (!res.ok) return;
    const json = await res.json();
    setPlans(json.data?.plans || []);
    setUserSubscriptions(json.data?.userSubscriptions || []);
    setPayments(json.data?.payments || []);
  }

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  function selectPlan(plan: SubscriptionPlan) {
    setForm({
      slug: plan.slug,
      name: plan.name,
      tagline: plan.tagline || "",
      priceMonthly: String(plan.price_monthly),
      trialDays: String(plan.trial_days),
      trialDisclosureText: plan.trial_disclosure_text || "",
      badgeText: plan.badge_text || "",
      featuresText: JSON.stringify(plan.features || [], null, 2),
      maxIntroductionRequests: String(plan.max_introduction_requests),
      isComingSoon: plan.is_coming_soon,
      isPurchasable: plan.is_purchasable,
      isActive: plan.is_active,
      canMessage: plan.can_message,
      canAudioCall: plan.can_audio_call,
      canVideoCall: plan.can_video_call,
    });
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    let features: string[];
    try {
      const parsed = JSON.parse(form.featuresText);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      features = parsed.map(String);
    } catch {
      setNotice({ text: "Features must be a JSON array of strings.", tone: "error" });
      return;
    }

    const res = await fetch("/api/v1/admin/subscriptions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: form.slug,
        name: form.name,
        tagline: form.tagline,
        price_monthly: Number(form.priceMonthly),
        trial_days: Number(form.trialDays),
        trial_disclosure_text: form.trialDisclosureText,
        badge_text: form.badgeText,
        features,
        max_introduction_requests: Number(form.maxIntroductionRequests),
        is_coming_soon: form.isComingSoon,
        is_purchasable: form.isPurchasable,
        is_active: form.isActive,
        can_message: form.canMessage,
        can_audio_call: form.canAudioCall,
        can_video_call: form.canVideoCall,
      }),
    });
    const json = await res.json();
    setNotice({
      text: json.message || (res.ok ? "Plan updated." : "Update failed."),
      tone: res.ok ? "success" : "error",
    });
    if (res.ok) loadSubscriptionData();
  }

  if (denied) return <AdminAccessDenied />;

  return (
    <div>
      {notice && <AdminNotice message={notice.text} tone={notice.tone} />}
      <AdminPageHeader
        eyebrow="Billing CMS"
        title="Subscription Plans &amp; Stripe Records"
        description="All membership copy, pricing, free-trial disclosure, entitlements, and Premium Plus launch state are managed here and exposed through the API to web and mobile clients."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6 lg:col-span-5">
          <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
            Plan Editor
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {plans.map((plan) => (
              <button
                type="button"
                key={plan.id}
                onClick={() => selectPlan(plan)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  form.slug === plan.slug
                    ? "bg-[#14110E] text-[#DFBE8A]"
                    : "bg-[#FAF6F0] text-[#6E5229]"
                }`}
              >
                {plan.name}
              </button>
            ))}
          </div>

          <form onSubmit={savePlan} className="mt-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="Slug"
                className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
              />
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Plan name"
                className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
              />
            </div>
            <input
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="Tagline"
              className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="number"
                step="0.01"
                value={form.priceMonthly}
                onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })}
                placeholder="Monthly price"
                className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
              />
              <input
                type="number"
                value={form.trialDays}
                onChange={(e) => setForm({ ...form, trialDays: e.target.value })}
                placeholder="Trial days"
                className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
              />
              <input
                type="number"
                value={form.maxIntroductionRequests}
                onChange={(e) =>
                  setForm({ ...form, maxIntroductionRequests: e.target.value })
                }
                placeholder="Intro limits"
                className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
              />
            </div>
            <textarea
              rows={3}
              value={form.trialDisclosureText}
              onChange={(e) =>
                setForm({ ...form, trialDisclosureText: e.target.value })
              }
              placeholder="First month free disclosure"
              className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
            <input
              value={form.badgeText}
              onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
              placeholder="Badge text"
              className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
            <textarea
              rows={5}
              value={form.featuresText}
              onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
              className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 font-mono text-[11px]"
            />

            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["isPurchasable", "Purchasable"],
                  ["isComingSoon", "Coming Soon"],
                  ["isActive", "Active"],
                  ["canMessage", "Can message"],
                  ["canAudioCall", "Can audio call"],
                  ["canVideoCall", "Can video call"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-xl bg-[#FAF6F0] px-3 py-2 text-xs font-semibold text-[#665C4E]"
                >
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>

            <button
              type="submit"
              className="rounded-full bg-[#14110E] px-5 py-2.5 text-xs font-semibold text-[#DFBE8A]"
            >
              Save Subscription Plan
            </button>
          </form>
        </div>

        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6">
            <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
              Member Subscriptions ({userSubscriptions.length})
            </h2>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto text-xs">
              {userSubscriptions.map((sub) => {
                const user = (sub.users || {}) as Record<string, unknown>;
                return (
                  <div
                    key={String(sub.id)}
                    className="flex flex-wrap items-center justify-between rounded-xl bg-[#FAF6F0] px-4 py-2.5"
                  >
                    <div>
                      <div className="font-semibold">
                        {String(user.first_name || "")} {String(user.last_name || "")} (
                        {String(user.email || "")})
                      </div>
                      <div className="text-[11px] text-[#665C4E]">
                        {String(sub.plan_slug)} •{" "}
                        {sub.is_trial ? "Free trial" : "Paid plan"}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 font-semibold ${statusStyle(
                        sub.status,
                      )}`}
                    >
                      {String(sub.status)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6">
            <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
              Stripe Payment Records ({payments.length})
            </h2>
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto text-xs">
              {payments.length === 0 ? (
                <p className="text-[#665C4E]">
                  No live payments recorded during the introductory free period.
                </p>
              ) : (
                payments.map((payment) => (
                  <div
                    key={String(payment.id)}
                    className="flex items-center justify-between rounded-xl bg-[#FAF6F0] px-4 py-2.5"
                  >
                    <span>{formatDate(payment.created_at)}</span>
                    <span className="font-bold">
                      £{Number(payment.amount || 0).toFixed(2)}
                    </span>
                    <span className={statusStyle(payment.status)}>
                      {String(payment.status)}
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
