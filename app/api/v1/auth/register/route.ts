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
import { registerUser } from "@/services/auth-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`register:${ip}`, 15, 60_000);
  if (!rl.allowed) {
    return apiError("Too many registration attempts. Please try again shortly.", 429);
  }

  try {
    const body = await req.json();
    const errors: { field: string; message: string }[] = [];

    if (!body.firstName?.trim()) {
      errors.push({ field: "firstName", message: "First name is required." });
    }
    if (!body.lastName?.trim()) {
      errors.push({ field: "lastName", message: "Second name (surname) is required." });
    }
    if (!body.username?.trim()) {
      errors.push({
        field: "username",
        message: "Username is required (5–10 alphanumeric characters).",
      });
    }
    if (body.gender !== "Male" && body.gender !== "Female") {
      errors.push({ field: "gender", message: "Gender must be Male or Female." });
    }
    if (!body.dob) {
      errors.push({ field: "dob", message: "Date of birth is required." });
    }
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.push({ field: "email", message: "A valid email address is required." });
    }
    if (!body.mobileNumber || String(body.mobileNumber).trim().length < 8) {
      errors.push({
        field: "mobileNumber",
        message: "A valid mobile number is required.",
      });
    }
    if (!body.password || String(body.password).length < 8) {
      errors.push({
        field: "password",
        message: "Password must be at least 8 characters long.",
      });
    }
    if (!body.city?.trim()) {
      errors.push({ field: "city", message: "City / Area is required." });
    }
    if (!body.postcode?.trim()) {
      errors.push({ field: "postcode", message: "UK Postcode is required." });
    }

    if (errors.length > 0) {
      return apiValidationError(errors);
    }

    const result = await registerUser({
      firstName: body.firstName,
      lastName: body.lastName,
      username: body.username,
      gender: body.gender,
      dob: body.dob,
      email: body.email,
      mobileNumber: body.mobileNumber,
      password: body.password,
      city: body.city,
      postcode: body.postcode,
      selectedPlan: body.selectedPlan === "free" ? "free" : "premium",
      acceptTerms: Boolean(body.acceptTerms),
      acceptSubscriptionDisclosure: Boolean(body.acceptSubscriptionDisclosure),
      deviceType: req.headers.get("x-client-platform") || "web",
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    if (!result.ok) {
      return apiValidationError([
        { field: result.field, message: result.message },
      ]);
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

    return apiSuccess(
      "Account registered successfully. Your first month of Premium is free.",
      {
        user: result.user,
        tokens: result.tokens,
        verificationPreview: result.verificationPreview,
      },
      null,
      201,
    );
  } catch (err) {
    return apiError(
      `Registration failed: ${(err as Error).message || "Unexpected error"}`,
      500,
    );
  }
}
