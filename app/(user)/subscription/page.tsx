"use client";

import React, { useEffect, useState } from "react";
import {
  Crown,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
} from "lucide-react";

export default function SubscriptionManagementPage() {
  const [plans, setPlans] = useState<Record<string, unknown>[]>([]);
  const [currentSub, setCurrentSub] = useState<Record<string, unknown> | null>(
    null,
  );
  const [entitlements, setEntitlements] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  async function loadSubscriptionData() {
    const [plansRes, curRes, invRes] = await Promise.all([
      fetch("/api/v1/subscriptions/plans"),
      fetch("/api/v1/subscriptions/current"),
      fetch("/api/v1/subscriptions/invoices"),
    ]);

    if (plansRes.ok) {
      const pJson = await plansRes.json();
      setPlans(pJson.data?.plans || []);
    }
    if (curRes.ok) {
      const cJson = await curRes.json();
      setCurrentSub(cJson.data?.subscription || null);
      setEntitlements(cJson.data?.entitlements || null);
    }
    if (invRes.ok) {
      const iJson = await invRes.json();
      setInvoices(iJson.data?.invoices || []);
    }
  }

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  async function handleCheckout(planSlug: string) {
    const res = await fetch("/api/v1/subscriptions/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planSlug, platform: "web" }),
    });
    const json = await res.json();
    if (res.ok) {
      setToast(
        `Activated ${json.data?.disclosure?.planName || planSlug} (1st Month Free: £0.00 today)!`,
      );
      loadSubscriptionData();
      if (
        json.data?.checkoutUrl &&
        String(json.data.checkoutUrl).startsWith("https://checkout.stripe.com")
      ) {
        window.location.href = json.data.checkoutUrl;
      }
    } else {
      setToast(json.message || "Checkout failed.");
    }
  }

  async function handleOpenPortal() {
    const res = await fetch("/api/v1/subscriptions/portal", { method: "POST" });
    const json = await res.json();
    if (res.ok && json.data?.portalUrl) {
      setToast("Stripe Customer Portal session ready.");
      if (String(json.data.portalUrl).startsWith("https://billing.stripe.com")) {
        window.location.href = json.data.portalUrl;
      }
    }
  }

  async function handleCancel() {
    const res = await fetch("/api/v1/subscriptions/cancel", { method: "POST" });
    const json = await res.json();
    setToast(json.message);
    loadSubscriptionData();
  }

  async function handleReactivate() {
    const res = await fetch("/api/v1/subscriptions/reactivate", {
      method: "POST",
    });
    const json = await res.json();
    setToast(json.message);
    loadSubscriptionData();
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl">
          {toast}
        </div>
      )}

      {/* Current Entitlements Banner */}
      <div className="rounded-3xl border border-[#C59B5F]/40 bg-[#14110E] p-7 text-[#FAF6F0]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#DFBE8A]">
              Stripe Official Payment Gateway
            </span>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-white">
              Current Plan: {String(entitlements?.planName || "Free Membership")}
            </h1>
            <p className="mt-1 text-xs text-white/75">
              Status: {String(entitlements?.status || "active").toUpperCase()}{" "}
              {Boolean(entitlements?.isTrial) &&
                `• 1st Month Free Trial ends ${new Date(
                  String(entitlements?.trialEndsAt),
                ).toLocaleDateString()}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleOpenPortal}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#C59B5F] px-4 py-2 text-xs font-semibold text-[#DFBE8A]"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Stripe Billing Portal</span>
              <ExternalLink className="h-3 w-3" />
            </button>

            {currentSub && !currentSub.cancel_at_period_end && (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full border border-rose-400/50 px-4 py-2 text-xs font-semibold text-rose-300"
              >
                Cancel at Period End
              </button>
            )}

            {Boolean(currentSub?.cancel_at_period_end) && (
              <button
                type="button"
                onClick={handleReactivate}
                className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white"
              >
                Reactivate Subscription
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Three Subscription Plans (Free, Premium w/ 1st Month Free, Premium Plus Coming Soon) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((p) => {
          const slug = String(p.slug);
          const isCurrent = entitlements?.planSlug === slug;
          const isComingSoon = Boolean(p.is_coming_soon);
          const features = Array.isArray(p.features)
            ? (p.features as string[])
            : [];

          return (
            <div
              key={String(p.id)}
              className={`flex flex-col justify-between rounded-3xl border p-7 ${
                slug === "premium"
                  ? "border-[#C59B5F] bg-white ring-2 ring-[#C59B5F]"
                  : "border-[#E5DEC9] bg-white"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl font-semibold text-[#1A1612]">
                    {String(p.name)}
                  </h2>
                  {Boolean(p.badge_text) && (
                    <span className="rounded-full bg-[#14110E] px-3 py-1 text-[10px] font-bold text-[#DFBE8A]">
                      {String(p.badge_text)}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-serif text-3xl font-bold text-[#1A1612]">
                    £{Number(p.price_monthly).toFixed(2)}
                  </span>
                  <span className="text-xs text-[#665C4E]">
                    / {String(p.billing_interval)}
                  </span>
                </div>

                {Boolean(p.trial_disclosure_text) && (
                  <p className="mt-3 rounded-xl bg-[#FAF6F0] p-3 text-[11px] leading-relaxed text-[#5C5346]">
                    {String(p.trial_disclosure_text)}
                  </p>
                )}

                <ul className="mt-5 space-y-2.5 text-xs text-[#3D362D]">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#9C743C]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                {isComingSoon ? (
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-full border border-[#E5DEC9] bg-gray-100 py-3 text-xs font-semibold text-gray-400"
                  >
                    COMING SOON — Unavailable at Launch
                  </button>
                ) : isCurrent ? (
                  <div className="w-full rounded-full bg-emerald-900/10 py-3 text-center text-xs font-bold text-emerald-800">
                    ✓ Your Current Active Plan
                  </div>
                ) : slug === "premium" ? (
                  <button
                    type="button"
                    onClick={() => handleCheckout("premium")}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#C59B5F] to-[#DFBE8A] py-3 text-xs font-bold text-[#14110E]"
                  >
                    <Crown className="h-4 w-4" />
                    <span>Upgrade with 1st Month Free</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoices History */}
      <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6">
        <div className="flex items-center gap-2 font-serif text-xl font-semibold text-[#1A1612]">
          <FileText className="h-5 w-5 text-[#9C743C]" />
          <span>Payment &amp; Invoice History</span>
        </div>
        {invoices.length === 0 ? (
          <p className="mt-3 text-xs text-[#665C4E]">
            No charges billed yet (£0.00 charged during your 1st-Month Free
            introductory period).
          </p>
        ) : (
          <div className="mt-4 divide-y divide-[#FAF6F0]">
            {invoices.map((inv) => (
              <div
                key={String(inv.id)}
                className="flex items-center justify-between py-3 text-xs"
              >
                <span>{new Date(String(inv.created_at)).toLocaleDateString()}</span>
                <span className="font-bold">
                  £{Number(inv.amount).toFixed(2)} {String(inv.currency)}
                </span>
                <span className="uppercase">{String(inv.status)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
