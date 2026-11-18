import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { recordAuditLog } from "@/services/audit-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const sb = createAdminSupabaseClient();
  const { data: sub } = await sb
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["trialing", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) {
    return apiError("No active subscription found to cancel.", 404);
  }

  const { data: updated } = await sb
    .from("user_subscriptions")
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .select("*")
    .single();

  await recordAuditLog({
    actorId: user.id,
    category: "subscription",
    action: "subscription.cancel_scheduled",
    resourceType: "user_subscription",
    resourceId: sub.id,
  });

  return apiSuccess(
    "Your subscription cancellation has been scheduled. You retain full access until the end of your current period.",
    { subscription: updated },
  );
}
