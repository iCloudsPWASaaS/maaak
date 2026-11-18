import { apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET() {
  const sb = createAdminSupabaseClient();
  const { data: categories } = await sb
    .from("question_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return apiSuccess("Question categories retrieved successfully", {
    categories: categories || [],
  });
}
