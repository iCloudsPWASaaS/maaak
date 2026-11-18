import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sb = createAdminSupabaseClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );

  const query = sb
    .from("profile_questions")
    .select("*, question_options(*)");

  const { data: question } = isUuid
    ? await query.eq("id", id).maybeSingle()
    : await query.eq("code", id).maybeSingle();

  if (!question) {
    return apiError("Profile question not found.", 404);
  }

  return apiSuccess("Profile question retrieved successfully", { question });
}
