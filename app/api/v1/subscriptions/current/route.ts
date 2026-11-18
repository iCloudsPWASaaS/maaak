import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { getUserEntitlements } from "@/services/subscription-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const sb = createAdminSupabaseClient();
  const [{ data: currentSub }, entitlements] = await Promise.all([
    sb
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getUserEntitlements(user.id),
  ]);

  return apiSuccess("Current subscription and entitlements retrieved", {
    subscription: currentSub || null,
    entitlements,
  });
}
