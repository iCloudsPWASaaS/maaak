import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { verifyAdminRequest } from "@/lib/auth-guard";
import { recordAuditLog } from "@/services/audit-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return apiError("Forbidden", 403);

  const sb = createAdminSupabaseClient();
  const { data: reports } = await sb
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  return apiSuccess("Moderation reports retrieved", { reports: reports || [] });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return apiError("Forbidden", 403);

  const body = await req.json();
  const reportId = body.reportId || body.id;
  if (!reportId) return apiError("reportId is required.", 422);

  const sb = createAdminSupabaseClient();
  const { data: updated, error } = await sb
    .from("reports")
    .update({
      status: body.status || "resolved",
      resolution_notes: body.resolution_notes || null,
      reviewed_by: auth.user?.id || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .select("*")
    .single();

  if (error) return apiError(error.message, 400);

  if (body.suspendReportedUser && updated.reported_user_id) {
    await sb
      .from("users")
      .update({ account_status: "suspended" })
      .eq("id", updated.reported_user_id);
  }

  await recordAuditLog({
    actorId: auth.user?.id || null,
    actorRole: auth.user?.role || "admin",
    targetUserId: updated.reported_user_id,
    category: "moderation",
    action: "admin.report_reviewed",
    resourceType: "report",
    resourceId: reportId,
    details: {
      status: updated.status,
      resolution_notes: updated.resolution_notes,
      suspendedUser: Boolean(body.suspendReportedUser),
    },
  });

  return apiSuccess("Report moderation updated", { report: updated });
}
