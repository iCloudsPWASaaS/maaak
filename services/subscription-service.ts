import Stripe from "stripe";
import { recordAuditLog } from "@/services/audit-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

export interface UserEntitlements {
  planSlug: "free" | "premium" | "premium-plus";
  planName: string;
  status: string;
  isTrial: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  maxIntroductionRequests: number | null;
  introductionRequestsUsed: number;
  introductionRequestsRemaining: number | null;
  maxActiveChats: number;
  canMessage: boolean;
  canAudioCall: boolean;
  canVideoCall: boolean;
  canSeeWhoLiked: boolean;
  canUseAdvancedFilters: boolean;
}

export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const sb = createAdminSupabaseClient();

  const [{ data: sub }, { data: plans }, { count: sentRequestsCount }] =
    await Promise.all([
      sb
        .from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("user_id", userId)
        .in("status", ["trialing", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      sb
        .from("introduction_requests")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", userId),
    ]);

  const freePlan = (plans || []).find((p) => p.slug === "free");
  const used = sentRequestsCount ?? 0;

  if (!sub || !sub.subscription_plans) {
    const maxReqs = freePlan?.max_introduction_requests ?? 10;
    return {
      planSlug: "free",
      planName: freePlan?.name || "Free Membership",
      status: "active",
      isTrial: false,
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      maxIntroductionRequests: maxReqs,
      introductionRequestsUsed: used,
      introductionRequestsRemaining: Math.max(0, maxReqs - used),
      maxActiveChats: 3,
      canMessage: false,
      canAudioCall: false,
      canVideoCall: false,
      canSeeWhoLiked: false,
      canUseAdvancedFilters: true,
    };
  }

  const plan = sub.subscription_plans as Record<string, unknown>;
  const maxReqs =
    plan.max_introduction_requests !== null &&
    plan.max_introduction_requests !== undefined
      ? Number(plan.max_introduction_requests)
      : null;

  return {
    planSlug: (sub.plan_slug || "free") as "free" | "premium" | "premium-plus",
    planName: String(plan.name || "Premium Membership"),
    status: sub.status,
    isTrial: Boolean(sub.is_trial),
    trialEndsAt: sub.trial_ends_at || null,
    currentPeriodEnd: sub.current_period_end || null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    maxIntroductionRequests: maxReqs,
    introductionRequestsUsed: used,
    introductionRequestsRemaining:
      maxReqs !== null ? Math.max(0, maxReqs - used) : null,
    maxActiveChats: Number(plan.max_active_chats ?? 3),
    canMessage: Boolean(plan.can_message),
    canAudioCall: Boolean(plan.can_audio_call),
    canVideoCall: Boolean(plan.can_video_call),
    canSeeWhoLiked: Boolean(plan.can_see_who_liked),
    canUseAdvancedFilters: Boolean(plan.can_use_advanced_filters ?? true),
  };
}

export async function createSubscriptionCheckout(input: {
  userId: string;
  planSlug: string;
  platform?: "web" | "flutter";
}) {
  const sb = createAdminSupabaseClient();

  const { data: plan } = await sb
    .from("subscription_plans")
    .select("*")
    .eq("slug", input.planSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!plan) {
    return { ok: false as const, message: "Selected subscription plan does not exist." };
  }

  if (plan.is_coming_soon || !plan.is_purchasable) {
    return {
      ok: false as const,
      message: `${plan.name} is Coming Soon and is not available for purchase at launch.`,
    };
  }

  if (plan.slug === "free") {
    return {
      ok: false as const,
      message: "Free membership does not require payment checkout.",
    };
  }

  const { data: user } = await sb
    .from("users")
    .select("id, email, first_name, last_name")
    .eq("id", input.userId)
    .single();

  if (!user) {
    return { ok: false as const, message: "User not found." };
  }

  // Check if user already had a trial previously
  const { data: priorTrial } = await sb
    .from("user_subscriptions")
    .select("id, stripe_customer_id")
    .eq("user_id", input.userId)
    .eq("is_trial", true)
    .limit(1)
    .maybeSingle();

  const trialDays = priorTrial ? 0 : Number(plan.trial_days ?? 30);
  const firstChargeDate = new Date(
    Date.now() + trialDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const stripe = getStripeClient();
  const configuredPriceId =
    plan.stripe_price_id ||
    (plan.slug === "premium"
      ? process.env.STRIPE_PREMIUM_PRICE_ID
      : process.env.STRIPE_PREMIUM_PLUS_PRICE_ID);

  // If Stripe secret key and price ID are configured, create live/test Stripe Checkout Session
  if (stripe && configuredPriceId) {
    let customerId = priorTrial?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim(),
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const successUrl =
      process.env.STRIPE_SUCCESS_URL ||
      `${siteUrl}/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      process.env.STRIPE_CANCEL_URL ||
      `${siteUrl}/subscription?checkout=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_collection: "always",
      line_items: [{ price: configuredPriceId, quantity: 1 }],
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        metadata: {
          user_id: user.id,
          plan_slug: plan.slug,
        },
      },
      metadata: {
        user_id: user.id,
        plan_slug: plan.slug,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await recordAuditLog({
      actorId: user.id,
      category: "subscription",
      action: "stripe.checkout_session_created",
      resourceType: "subscription_plan",
      resourceId: plan.id,
      details: {
        checkoutSessionId: session.id,
        planSlug: plan.slug,
        trialDays,
        firstChargeDate,
        platform: input.platform || "web",
      },
    });

    return {
      ok: true as const,
      checkoutUrl: session.url,
      sessionId: session.id,
      stripeCustomerId: customerId,
      disclosure: {
        planName: plan.name,
        trialDays,
        todayCharge: 0,
        recurringAmount: Number(plan.price_monthly),
        currency: plan.currency,
        billingInterval: plan.billing_interval,
        firstPaymentDate: firstChargeDate,
        terms: plan.trial_disclosure_text,
      },
    };
  }

  // Sandbox / pre-configured Stripe mode: activate the 30-day free trial in DB and return transparent disclosure
  const now = new Date();
  const periodEnd = new Date(
    now.getTime() + Math.max(1, trialDays || 30) * 24 * 60 * 60 * 1000,
  );

  await sb
    .from("user_subscriptions")
    .update({ status: "canceled", canceled_at: now.toISOString() })
    .eq("user_id", user.id)
    .in("status", ["trialing", "active"]);

  const { data: newSub } = await sb
    .from("user_subscriptions")
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      plan_slug: plan.slug,
      status: trialDays > 0 ? "trialing" : "active",
      is_trial: trialDays > 0,
      trial_starts_at: trialDays > 0 ? now.toISOString() : null,
      trial_ends_at: trialDays > 0 ? periodEnd.toISOString() : null,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
    .select("*")
    .single();

  await recordAuditLog({
    actorId: user.id,
    category: "subscription",
    action: "subscription.trial_activated",
    resourceType: "user_subscription",
    resourceId: newSub?.id,
    details: {
      planSlug: plan.slug,
      trialDays,
      firstChargeDate: periodEnd.toISOString(),
    },
  });

  return {
    ok: true as const,
    checkoutUrl: `/subscription?checkout=success&plan=${plan.slug}`,
    sessionId: `sub_trial_${newSub?.id || Date.now()}`,
    disclosure: {
      planName: plan.name,
      trialDays,
      todayCharge: 0,
      recurringAmount: Number(plan.price_monthly),
      currency: plan.currency,
      billingInterval: plan.billing_interval,
      firstPaymentDate: periodEnd.toISOString(),
      terms: plan.trial_disclosure_text,
    },
  };
}

export async function createCustomerPortalSession(userId: string) {
  const sb = createAdminSupabaseClient();
  const { data: sub } = await sb
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stripe = getStripeClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (stripe && sub?.stripe_customer_id) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${siteUrl}/subscription`,
    });
    return { ok: true as const, portalUrl: portal.url };
  }

  return {
    ok: true as const,
    portalUrl: `${siteUrl}/subscription?portal=self-managed`,
  };
}

export async function processStripeWebhookEvent(
  rawBody: string,
  signature: string | null,
) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripeClient();

  let event: Stripe.Event;
  if (stripe && webhookSecret && signature) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      return {
        ok: false as const,
        status: 400,
        message: `Webhook signature verification failed: ${(err as Error).message}`,
      };
    }
  } else {
    return {
      ok: false as const,
      status: 400,
      message: "Missing Stripe webhook signature or STRIPE_WEBHOOK_SECRET.",
    };
  }

  const sb = createAdminSupabaseClient();

  // Idempotency check
  const { data: existingEvent } = await sb
    .from("payment_events")
    .select("id")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existingEvent) {
    return {
      ok: true as const,
      idempotentReplay: true,
      message: "Event already processed.",
    };
  }

  await sb.from("payment_events").insert({
    provider: "stripe",
    event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
    processing_status: "processed",
  });

  // Process lifecycle events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const planSlug = session.metadata?.plan_slug || "premium";
      if (userId) {
        const { data: plan } = await sb
          .from("subscription_plans")
          .select("*")
          .eq("slug", planSlug)
          .maybeSingle();
        if (plan) {
          await sb.from("user_subscriptions").insert({
            user_id: userId,
            plan_id: plan.id,
            plan_slug: plan.slug,
            status: "trialing",
            stripe_customer_id: String(session.customer || ""),
            stripe_subscription_id: String(session.subscription || ""),
            stripe_checkout_session_id: session.id,
            is_trial: true,
            trial_starts_at: new Date().toISOString(),
          });
        }
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const statusMap: Record<string, string> = {
        trialing: "trialing",
        active: "active",
        past_due: "past_due",
        canceled: "canceled",
        unpaid: "expired",
        incomplete: "incomplete",
        incomplete_expired: "expired",
      };
      const mappedStatus = statusMap[subscription.status] || "active";

      await sb
        .from("user_subscriptions")
        .update({
          status: mappedStatus,
          is_trial: subscription.status === "trialing",
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = String(invoice.customer || "");
      const { data: userSub } = await sb
        .from("user_subscriptions")
        .select("id, user_id")
        .eq("stripe_customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userSub) {
        const payStatus =
          event.type === "invoice.paid"
            ? "paid"
            : event.type === "invoice.payment_failed"
              ? "failed"
              : "action_required";

        await sb.from("payments").upsert(
          {
            user_id: userSub.user_id,
            subscription_id: userSub.id,
            stripe_invoice_id: invoice.id,
            amount: (invoice.amount_paid || invoice.amount_due || 0) / 100,
            currency: (invoice.currency || "gbp").toUpperCase(),
            status: payStatus,
            invoice_pdf_url: invoice.invoice_pdf || null,
            hosted_invoice_url: invoice.hosted_invoice_url || null,
            paid_at:
              event.type === "invoice.paid" ? new Date().toISOString() : null,
          },
          { onConflict: "stripe_invoice_id" },
        );
      }
      break;
    }
  }

  return { ok: true as const, idempotentReplay: false };
}
