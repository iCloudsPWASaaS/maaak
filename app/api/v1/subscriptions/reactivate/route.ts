import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
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
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) {
    return apiError("No subscription found to reactivate.", 404);
  }

  const { data: updated } = await sb
    .from("user_subscriptions")
    .update({
      cancel_at_period_end: false,
      canceled_at: null,
      status: sub.is_trial ? "trialing" : "active",
    })
    .eq("id", sub.id)
    .select("*")
    .single();

  return apiSuccess("Subscription reactivated successfully", {
    subscription: updated,
  });
}
