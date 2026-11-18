import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function PUT(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const sb = createAdminSupabaseClient();

  const updatedPrefs = {
    ...(user.notification_preferences || {}),
    ...(body.preferences || body),
  };

  const { data: updatedUser, error } = await sb
    .from("users")
    .update({
      notification_preferences: updatedPrefs,
      ...(body.pushSubscription
        ? { push_subscriptions: [body.pushSubscription] }
        : {}),
    })
    .eq("id", user.id)
    .select("notification_preferences")
    .single();

  if (error) return apiError(error.message, 400);

  return apiSuccess("Notification preferences updated", {
    preferences: updatedUser.notification_preferences,
  });
}
