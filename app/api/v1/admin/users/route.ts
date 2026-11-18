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

  const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase();
  const statusFilter = req.nextUrl.searchParams.get("status");

  const sb = createAdminSupabaseClient();
  const [{ data: users }, { data: profiles }, { data: subs }] = await Promise.all([
    sb
      .from("users")
      .select(
        "id, email, mobile_number, username, first_name, last_name, role, account_status, email_verified, mobile_verified, id_verified, created_at, last_login_at",
      )
      .order("created_at", { ascending: false }),
    sb
      .from("user_profiles")
      .select(
        "user_id, gender, dob, city, postcode_area, religion, profession, completion_percentage, is_published, moderation_status",
      ),
    sb
      .from("user_subscriptions")
      .select("user_id, plan_slug, status, is_trial, trial_ends_at"),
  ]);

  const pMap = new Map((profiles || []).map((p) => [p.user_id, p]));
  const sMap = new Map((subs || []).map((s) => [s.user_id, s]));

  let list = (users || []).map((u) => ({
    ...u,
    profile: pMap.get(u.id) || null,
    subscription: sMap.get(u.id) || null,
  }));

  if (statusFilter && statusFilter !== "all") {
    list = list.filter((u) => u.account_status === statusFilter);
  }

  if (search) {
    list = list.filter((u) =>
      [u.first_name, u.last_name, u.email, u.username, u.mobile_number, u.profile?.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }

  return apiSuccess("Users list retrieved", { users: list });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return apiError("Forbidden", 403);

  const body = await req.json();
  const userId = body.userId || body.id;
  if (!userId) return apiError("Target userId is required.", 422);

  const sb = createAdminSupabaseClient();
  const userUpdates: Record<string, unknown> = {};
  const profileUpdates: Record<string, unknown> = {};

  if (body.account_status) userUpdates.account_status = body.account_status;
  if (body.role && auth.user?.role === "super_admin") {
    userUpdates.role = body.role;
  }
  if (typeof body.id_verified === "boolean") {
    userUpdates.id_verified = body.id_verified;
    userUpdates.id_verified_at = body.id_verified
      ? new Date().toISOString()
      : null;
  }
  if (typeof body.email_verified === "boolean") {
    userUpdates.email_verified = body.email_verified;
  }
  if (typeof body.mobile_verified === "boolean") {
    userUpdates.mobile_verified = body.mobile_verified;
  }

  if (body.moderation_status) {
    profileUpdates.moderation_status = body.moderation_status;
  }
  if (typeof body.is_published === "boolean") {
    profileUpdates.is_published = body.is_published;
  }
  if (body.moderation_notes !== undefined) {
    profileUpdates.moderation_notes = body.moderation_notes;
  }

  if (Object.keys(userUpdates).length > 0) {
    await sb.from("users").update(userUpdates).eq("id", userId);
  }
  if (Object.keys(profileUpdates).length > 0) {
    await sb.from("user_profiles").update(profileUpdates).eq("user_id", userId);
  }

  await recordAuditLog({
    actorId: auth.user?.id || null,
    actorRole: auth.user?.role || "admin",
    targetUserId: userId,
    category: "admin",
    action: "admin.user_updated",
    resourceType: "user",
    resourceId: userId,
    details: { userUpdates, profileUpdates },
  });

  return apiSuccess("User and profile updated by administrator", {
    userId,
    userUpdates,
    profileUpdates,
  });
}
