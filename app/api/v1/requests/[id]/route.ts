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

  const { data: reqRow } = await sb
    .from("introduction_requests")
    .select("*")
    .eq("id", id)
    .eq("sender_id", user.id)
    .maybeSingle();

  if (!reqRow) {
    return apiError("Request not found.", 404);
  }

  await sb
    .from("introduction_requests")
    .update({ status: "cancelled" })
    .eq("id", id);

  return apiSuccess("Introduction request cancelled", {});
}
