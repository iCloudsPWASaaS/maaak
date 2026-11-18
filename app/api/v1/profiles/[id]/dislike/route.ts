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
  let action: "dislike" | "thumbs_down" = "dislike";
  try {
    const body = await req.json();
    if (body.action === "thumbs_down") action = "thumbs_down";
  } catch {
    // Default "dislike"
  }

  const sb = createAdminSupabaseClient();
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

  return apiSuccess("Profile pass recorded", { interaction: row });
}
