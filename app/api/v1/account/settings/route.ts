import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { hashPassword, verifyPassword } from "@/lib/jwt";
import { recordAuditLog } from "@/services/audit-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const sb = createAdminSupabaseClient();

  // Also allow recording suspicious screenshot/copy security events from the browser deterrent layer
  if (body.securityEvent) {
    await recordAuditLog({
      actorId: user.id,
      category: "security",
      action: `deterrent.${body.securityEvent}`,
      details: body.details || {},
      ipAddress: req.headers.get("x-forwarded-for") || "local",
      userAgent: req.headers.get("user-agent") || undefined,
    });
    return apiSuccess("Security event recorded", {});
  }

  const updates: Record<string, unknown> = {};

  if (body.privacy_settings) {
    updates.privacy_settings = {
      ...(user.privacy_settings || {}),
      ...body.privacy_settings,
    };
  }

  if (body.notification_preferences) {
    updates.notification_preferences = {
      ...(user.notification_preferences || {}),
      ...body.notification_preferences,
    };
  }

  if (body.newPassword) {
    if (String(body.newPassword).length < 8) {
      return apiValidationError([
        {
          field: "newPassword",
          message: "New password must be at least 8 characters long.",
        },
      ]);
    }
    const { data: dbUser } = await sb
      .from("users")
      .select("password_hash")
      .eq("id", user.id)
      .single();

    if (
      body.currentPassword &&
      dbUser &&
      !verifyPassword(body.currentPassword, dbUser.password_hash)
    ) {
      return apiValidationError([
        { field: "currentPassword", message: "Current password is incorrect." },
      ]);
    }
    updates.password_hash = hashPassword(body.newPassword);
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await sb.from("users").update(updates).eq("id", user.id);
    if (error) return apiError(error.message, 400);
  }

  return apiSuccess("Account settings updated successfully", {
    updatedFields: Object.keys(updates),
  });
}
