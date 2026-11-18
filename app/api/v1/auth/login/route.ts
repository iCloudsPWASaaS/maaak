import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
  checkRateLimit,
} from "@/lib/api-response";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth-guard";
import { loginUser } from "@/services/auth-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`login:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return apiError("Too many login attempts. Please wait a minute.", 429);
  }

  try {
    const body = await req.json();
    const identifier = (body.email || body.identifier || body.username || "").trim();
    const password = body.password || "";

    if (!identifier || !password) {
      return apiValidationError([
        {
          field: "identifier",
          message: "Email/username and password are required.",
        },
      ]);
    }

    const result = await loginUser({
      identifier,
      password,
      deviceType: req.headers.get("x-client-platform") || "web",
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    if (!result.ok) {
      return apiError(result.message, result.status);
    }

    const cookieStore = await cookies();
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

    return apiSuccess("Logged in successfully", {
      user: result.user,
      tokens: result.tokens,
    });
  } catch (err) {
    return apiError(`Login error: ${(err as Error).message}`, 500);
  }
}
