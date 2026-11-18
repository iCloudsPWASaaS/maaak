import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await context.params;
  const sb = createAdminSupabaseClient();

  const { data: photo } = await sb
    .from("profile_photographs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!photo) {
    return apiError("Photograph not found.", 404);
  }

  await sb.from("profile_photographs").delete().eq("id", id);

  const { data: remaining } = await sb
    .from("profile_photographs")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  // If published profile drops below 2 photos, unpublish until 2 photos exist
  if ((remaining || []).length < 2) {
    await sb
      .from("user_profiles")
      .update({ is_published: false })
      .eq("user_id", user.id);
  }

  return apiSuccess("Photograph deleted successfully", {
    remainingPhotos: remaining || [],
  });
}
