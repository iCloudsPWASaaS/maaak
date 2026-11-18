import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { verifyAdminRequest } from "@/lib/auth-guard";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return apiError("Forbidden", 403);

  const sb = createAdminSupabaseClient();
  const { data: feedback } = await sb
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return apiSuccess("Feedback submissions retrieved", {
    feedback: feedback || [],
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return apiError("Forbidden", 403);

  const body = await req.json();
  const id = body.id;
  if (!id) return apiError("Feedback ID is required.", 422);

  const sb = createAdminSupabaseClient();
  const { data: updated, error } = await sb
    .from("feedback")
    .update({
      status: body.status || "resolved",
      admin_notes: body.admin_notes || null,
      responded_by: auth.user?.id || null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return apiError(error.message, 400);

  return apiSuccess("Feedback entry updated", { feedback: updated });
}
