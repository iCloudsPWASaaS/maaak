import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth-guard";
import { refreshUserSession } from "@/services/auth-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  try {
    let bodyToken = "";
    try {
      const body = await req.json();
      bodyToken = body.refreshToken || body.refresh_token || "";
    } catch {
      // Allow cookie-only refresh
    }

    const cookieStore = await cookies();
    const refreshToken =
      bodyToken || cookieStore.get(REFRESH_COOKIE_NAME)?.value || "";

    if (!refreshToken) {
      return apiError("Refresh token is required.", 401);
    }

    const result = await refreshUserSession(refreshToken);
    if (!result.ok) {
      return apiError(result.message, 401);
    }

    cookieStore.set(ACCESS_COOKIE_NAME, result.tokens.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    cookieStore.set(REFRESH_COOKIE_NAME, result.tokens.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return apiSuccess("Session refreshed successfully", {
      user: result.user,
      tokens: result.tokens,
    });
  } catch (err) {
    return apiError(`Session refresh failed: ${(err as Error).message}`, 500);
  }
}
