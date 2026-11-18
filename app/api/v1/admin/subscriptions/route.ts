import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { verifyAdminRequest } from "@/lib/auth-guard";
import { recordAuditLog } from "@/services/audit-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return apiError("Forbidden", 403);

  const sb = createAdminSupabaseClient();
  const [{ data: plans }, { data: userSubscriptions }, { data: payments }] =
    await Promise.all([
      sb
        .from("subscription_plans")
        .select("*")
        .order("sort_order", { ascending: true }),
      sb
        .from("user_subscriptions")
        .select("*, users(first_name, last_name, email, username)")
        .order("created_at", { ascending: false })
        .limit(50),
      sb
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  return apiSuccess("Subscription plans and billing records retrieved", {
    plans: plans || [],
    userSubscriptions: userSubscriptions || [],
    payments: payments || [],
  });
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminRequest(req, ["admin", "super_admin"]);
  if (!auth.authorized) return apiError("Forbidden", 403);

  const body = await req.json();
  if (!body.slug) {
    return apiError("Plan slug is required.", 422);
  }

  const sb = createAdminSupabaseClient();
  const { data: updatedPlan, error } = await sb
    .from("subscription_plans")
    .update({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.tagline !== undefined ? { tagline: body.tagline } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.price_monthly !== undefined
        ? { price_monthly: Number(body.price_monthly) }
        : {}),
      ...(body.trial_days !== undefined
        ? { trial_days: Number(body.trial_days) }
        : {}),
      ...(body.trial_disclosure_text !== undefined
        ? { trial_disclosure_text: body.trial_disclosure_text }
        : {}),
      ...(body.stripe_price_id !== undefined
        ? { stripe_price_id: body.stripe_price_id }
        : {}),
      ...(body.stripe_product_id !== undefined
        ? { stripe_product_id: body.stripe_product_id }
        : {}),
      ...(body.max_introduction_requests !== undefined
        ? { max_introduction_requests: body.max_introduction_requests }
        : {}),
      ...(body.can_message !== undefined ? { can_message: body.can_message } : {}),
      ...(body.can_audio_call !== undefined
        ? { can_audio_call: body.can_audio_call }
        : {}),
      ...(body.can_video_call !== undefined
        ? { can_video_call: body.can_video_call }
        : {}),
      ...(body.features !== undefined ? { features: body.features } : {}),
      ...(body.badge_text !== undefined ? { badge_text: body.badge_text } : {}),
      ...(body.is_coming_soon !== undefined
        ? { is_coming_soon: Boolean(body.is_coming_soon) }
        : {}),
      ...(body.is_purchasable !== undefined
        ? { is_purchasable: Boolean(body.is_purchasable) }
        : {}),
      ...(body.is_active !== undefined
        ? { is_active: Boolean(body.is_active) }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("slug", body.slug)
    .select("*")
    .single();

  if (error) return apiError(error.message, 400);

  await recordAuditLog({
    actorId: auth.user?.id || null,
    actorRole: auth.user?.role || "admin",
    category: "subscription",
    action: "admin.subscription_plan_updated",
    resourceType: "subscription_plan",
    resourceId: updatedPlan.id,
    details: {
      slug: updatedPlan.slug,
      price_monthly: updatedPlan.price_monthly,
      is_coming_soon: updatedPlan.is_coming_soon,
      is_purchasable: updatedPlan.is_purchasable,
    },
  });

  return apiSuccess("Subscription plan updated in CMS", { plan: updatedPlan });
}
