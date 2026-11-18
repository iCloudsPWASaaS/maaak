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

  const category = req.nextUrl.searchParams.get("category");
  const sb = createAdminSupabaseClient();

  let query = sb
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (category && category !== "all") {
    query = query.eq("event_category", category);
  }

  const { data: logs } = await query;

  return apiSuccess("Audit logs retrieved", { logs: logs || [] });
}
