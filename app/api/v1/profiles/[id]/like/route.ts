import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const { id: targetUserId } = await context.params;
  if (targetUserId === user.id) {
    return apiError("You cannot like your own profile.", 400);
  }

  let action: "like" | "thumbs_up" | "bookmark" | "none" = "like";
  try {
    const body = await req.json();
    if (
      body.action === "thumbs_up" ||
      body.action === "bookmark" ||
      body.action === "like" ||
      body.action === "none"
    ) {
      action = body.action;
    }
  } catch {
    // Default "like"
  }

  const sb = createAdminSupabaseClient();

  if (action === "none") {
    const { error: deleteError } = await sb
      .from("likes_dislikes")
      .delete()
      .eq("user_id", user.id)
      .eq("target_user_id", targetUserId);

    if (deleteError) return apiError(deleteError.message, 400);
    return apiSuccess("Interaction removed", { interaction: null, removed: true });
  }

  if (action === "bookmark") {
    const { data: existing } = await sb
      .from("likes_dislikes")
      .select("action")
      .eq("user_id", user.id)
      .eq("target_user_id", targetUserId)
      .maybeSingle();

    if (existing?.action === "bookmark") {
      const { error: deleteError } = await sb
        .from("likes_dislikes")
        .delete()
        .eq("user_id", user.id)
        .eq("target_user_id", targetUserId);

      if (deleteError) return apiError(deleteError.message, 400);
      return apiSuccess("Bookmark removed", { interaction: null, removed: true });
    }
  }

  const { data: row, error } = await sb
    .from("likes_dislikes")
    .upsert(
      {
        user_id: user.id,
        target_user_id: targetUserId,
        action,
      },
      { onConflict: "user_id,target_user_id" },
    )
    .select("*")
    .single();

  if (error) return apiError(error.message, 400);

  return apiSuccess("Profile interaction recorded", {
    interaction: row,
    removed: false,
  });
}
