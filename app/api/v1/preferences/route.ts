import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { updateUserPreferences } from "@/services/profile-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const sb = createAdminSupabaseClient();
  const { data: preferences } = await sb
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return apiSuccess("Partner preferences (WHAT I WANT) retrieved successfully", {
    preferences: preferences || { user_id: user.id },
  });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  try {
    const body = await req.json();
    const result = await updateUserPreferences(user.id, body);
    if (!result.ok) {
      return apiValidationError([
        { field: result.field, message: result.message },
      ]);
    }

    return apiSuccess(
      "Partner preferences updated and matches recalculated",
      { preferences: result.preferences },
    );
  } catch (err) {
    return apiError(`Preferences update failed: ${(err as Error).message}`, 500);
  }
}
