import { NextResponse } from "next/server";
import type { ApiErrorItem, ApiResponse, PaginationMeta } from "@/types";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Platform, X-Idempotency-Key, X-Admin-Api-Key",
};

export function apiSuccess<T>(
  message: string,
  data?: T,
  meta: PaginationMeta | Record<string, unknown> | null = null,
  status = 200,
) {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data: data ?? ({} as T),
    meta,
  };
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function apiError(
  message: string,
  status = 400,
  errors?: ApiErrorItem[],
) {
  const body: ApiResponse<null> = {
    success: false,
    message,
    ...(errors && errors.length > 0 ? { errors } : {}),
  };
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function apiValidationError(
  errors: ApiErrorItem[],
  message = "Validation failed",
) {
  return apiError(message, 422, errors);
}

export function apiOptionsResponse() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// In-memory sliding window rate limiter for API protection & auth throttling
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}
