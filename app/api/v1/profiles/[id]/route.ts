import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { isBlockedBetween } from "@/services/communication-service";
import { sanitizePublicProfile } from "@/services/profile-service";
import { createAdminSupabaseClient } from "@/supabase/admin";
import type { UserProfileRecord } from "@/types";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) {
    return apiError("Authentication required to view profiles.", 401);
  }

  const { id } = await context.params;
  if (await isBlockedBetween(viewer.id, id)) {
    return apiError("Profile is unavailable.", 404);
  }

  const sb = createAdminSupabaseClient();

  const [
    { data: targetUser },
    { data: targetProfile },
    { data: photos },
    { data: compScore },
    { data: existingReq },
    { data: existingLike },
  ] = await Promise.all([
    sb
      .from("users")
      .select("id, first_name, username, id_verified, account_status")
      .eq("id", id)
      .maybeSingle(),
    sb.from("user_profiles").select("*").eq("user_id", id).maybeSingle(),
    sb
      .from("profile_photographs")
      .select("id, url, is_primary, sort_order")
      .eq("user_id", id)
      .eq("moderation_status", "approved")
      .order("sort_order", { ascending: true }),
    sb
      .from("compatibility_scores")
      .select("*")
      .or(
        `and(user_a_id.eq.${viewer.id},user_b_id.eq.${id}),and(user_a_id.eq.${id},user_b_id.eq.${viewer.id})`,
      )
      .maybeSingle(),
    sb
      .from("introduction_requests")
      .select("id, sender_id, receiver_id, status, created_at")
      .or(
        `and(sender_id.eq.${viewer.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${viewer.id})`,
      )
      .maybeSingle(),
    sb
      .from("likes_dislikes")
      .select("action")
      .eq("user_id", viewer.id)
      .eq("target_user_id", id)
      .maybeSingle(),
  ]);

  if (
    !targetUser ||
    !targetProfile ||
    targetUser.account_status !== "active" ||
    (!targetProfile.is_published && viewer.role === "user" && viewer.id !== id)
  ) {
    return apiError("Profile not found or not published.", 404);
  }

  const sanitized = sanitizePublicProfile({
    user: targetUser,
    profile: targetProfile as UserProfileRecord,
    photos: photos || [],
    compatibility: compScore
      ? {
          mutual_score: Number(compScore.mutual_score),
          is_mutually_eligible: compScore.is_mutually_eligible,
          area_breakdown: compScore.area_breakdown,
          match_reasons: compScore.match_reasons,
        }
      : null,
    viewerWatermark: `MA'AAK • ${viewer.username.toUpperCase()}`,
  });

  return apiSuccess("Profile retrieved successfully", {
    profile: sanitized,
    interaction: {
      introductionRequest: existingReq || null,
      myAction: existingLike?.action || null,
    },
  });
}
