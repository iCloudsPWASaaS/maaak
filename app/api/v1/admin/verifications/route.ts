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
  const { data: sessions } = await sb
    .from("identity_verification_sessions")
    .select("*, users(first_name, last_name, email, username, id_verified)")
    .order("created_at", { ascending: false })
    .limit(50);

  return apiSuccess("Identity verification sessions retrieved", {
    sessions: sessions || [],
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return apiError("Forbidden", 403);

  const body = await req.json();
  const sessionId = body.sessionId || body.id;
  const status = body.status;

  if (!sessionId || !status) {
    return apiError("sessionId and status are required.", 422);
  }

  const sb = createAdminSupabaseClient();
  const { data: updated, error } = await sb
    .from("identity_verification_sessions")
    .update({
      status,
      ...(status === "approved" ? { verified_at: new Date().toISOString() } : {}),
    })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error) return apiError(error.message, 400);

  if (updated.user_id) {
    await sb
      .from("users")
      .update({
        id_verified: status === "approved",
        id_verified_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", updated.user_id);
  }

  await recordAuditLog({
    actorId: auth.user?.id || null,
    actorRole: auth.user?.role || "admin",
    targetUserId: updated.user_id,
    category: "verification",
    action: `admin.verification_${status}`,
    resourceType: "identity_verification_session",
    resourceId: sessionId,
  });

  return apiSuccess("Verification session updated", { session: updated });
}
