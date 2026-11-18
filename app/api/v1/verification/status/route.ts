import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const sb = createAdminSupabaseClient();
  const { data: sessions } = await sb
    .from("identity_verification_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return apiSuccess("Identity verification status retrieved", {
    id_verified: user.id_verified,
    latestSession: sessions?.[0] || null,
    history: sessions || [],
    note: "Verification status is determined exclusively by server-side Didit webhook validation.",
  });
}
