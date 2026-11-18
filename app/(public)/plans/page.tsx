import React from "react";
import Link from "next/link";
import { createAdminSupabaseClient } from "@/supabase/admin";
import { getPublicContent } from "@/lib/public-content";

export const dynamic = "force-dynamic";

const DEFAULT_PLANS_CONTENT = {
  title: "Membership Plans",
  intro:
    "Begin with our Free Membership (up to 10 introduction requests) or unlock full communication with our 1st-Month Free Premium introductory arrangement.",
  comingSoon: "COMING SOON — Unavailable at Launch",
  selectPremium: "Select Premium (1st Month Free)",
  selectFree: "Select Free Plan",
};

export default async function MembershipPlansPage() {
  const text = await getPublicContent("plans", DEFAULT_PLANS_CONTENT);
  const sb = createAdminSupabaseClient();
  const { data: plans } = await sb
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <section className="public-content-section">
      <div className="public-container-md">
        <div className="public-page-heading">
          <h1 className="public-text-primary">{text.title}</h1>
          <p>{text.intro}</p>
        </div>
        <div className="public-guideline-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {(plans || []).map((plan) => {
            const isComingSoon = Boolean(plan.is_coming_soon);
            const features = Array.isArray(plan.features)
              ? (plan.features as string[])
              : [];

            return (
              <div className="public-guideline-box" key={plan.id}>
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                <p className="public-fs-5">
                  £{Number(plan.price_monthly).toFixed(2)}{" "}
                  <span className="public-small public-text-muted">
                    / {plan.billing_interval}
                  </span>
                </p>
                {plan.trial_disclosure_text && (
                  <p className="public-small">{plan.trial_disclosure_text}</p>
                )}
                <ul>
                  {features.map((feature, index) => (
                    <li key={`${plan.id}-${index}`}>{feature}</li>
                  ))}
                </ul>
                {isComingSoon ? (
                  <button type="button" className="public-btn public-btn-secondary public-btn-block" disabled>
                    {text.comingSoon}
                  </button>
                ) : (
                  <Link
                    href={`/register?plan=${plan.slug}`}
                    className="public-btn public-btn-theme public-btn-block"
                  >
                    {plan.slug === "premium" ? text.selectPremium : text.selectFree}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
