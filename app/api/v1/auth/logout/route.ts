import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import {
  ACCESS_COOKIE_NAME,
  getAuthenticatedUser,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth-guard";
import { hashRefreshToken } from "@/lib/jwt";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshCookie = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
    const user = await getAuthenticatedUser(req);

    const sb = createAdminSupabaseClient();
    if (refreshCookie) {
      await sb
        .from("auth_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("refresh_token_hash", hashRefreshToken(refreshCookie));
    } else if (user) {
      await sb
        .from("auth_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("revoked_at", null);
    }

    cookieStore.delete(ACCESS_COOKIE_NAME);
    cookieStore.delete(REFRESH_COOKIE_NAME);

    return apiSuccess("Logged out successfully", {});
  } catch {
    return apiSuccess("Logged out successfully", {});
  }
}
