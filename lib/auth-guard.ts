import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { createAdminSupabaseClient } from "@/supabase/admin";
import type { AuthUser, UserRole } from "@/types";

export const ACCESS_COOKIE_NAME = "maaak_access_token";
export const REFRESH_COOKIE_NAME = "maaak_refresh_token";

export async function extractTokenFromRequest(
  req?: NextRequest | Request,
): Promise<string | null> {
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.slice(7).trim();
    }
  }

  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
    if (cookieToken) return cookieToken;
  } catch {
    // Request outside Next.js cookie context
  }

  return null;
}

export async function getAuthenticatedUser(
  req?: NextRequest | Request,
): Promise<AuthUser | null> {
  const token = await extractTokenFromRequest(req);
  if (!token) return null;

  const payload = verifyJwt(token);
  if (!payload || payload.type !== "access") return null;

  const sb = createAdminSupabaseClient();
  const { data: user, error } = await sb
    .from("users")
    .select(
      "id, email, mobile_number, username, first_name, last_name, role, account_status, email_verified, mobile_verified, id_verified, selected_initial_plan, notification_preferences, privacy_settings, created_at",
    )
    .eq("id", payload.user_id)
    .maybeSingle();

  if (error || !user) return null;
  if (user.account_status === "deleted" || user.account_status === "suspended") {
    return null;
  }

  return user as AuthUser;
}

export function hasRequiredRole(
  userRole: UserRole,
  allowedRoles: UserRole[],
): boolean {
  return allowedRoles.includes(userRole);
}

export async function verifyAdminRequest(
  req: NextRequest | Request,
  allowedRoles: UserRole[] = ["admin", "super_admin", "moderator"],
): Promise<{ authorized: boolean; user: AuthUser | null }> {
  const adminKeyHeader = req.headers.get("x-admin-api-key");
  if (
    adminKeyHeader &&
    process.env.ADMIN_API_KEY &&
    adminKeyHeader === process.env.ADMIN_API_KEY
  ) {
    const sb = createAdminSupabaseClient();
    const { data: superAdmin } = await sb
      .from("users")
      .select(
        "id, email, mobile_number, username, first_name, last_name, role, account_status, email_verified, mobile_verified, id_verified, selected_initial_plan, notification_preferences, privacy_settings, created_at",
      )
      .in("role", ["super_admin", "admin"])
      .limit(1)
      .maybeSingle();

    return {
      authorized: true,
      user: (superAdmin as AuthUser) || null,
    };
  }

  const user = await getAuthenticatedUser(req);
  if (!user) return { authorized: false, user: null };
  if (!hasRequiredRole(user.role, allowedRoles)) {
    return { authorized: false, user };
  }

  return { authorized: true, user };
}
