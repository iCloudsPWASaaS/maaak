import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { resendContactVerificationCode } from "@/services/auth-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Authentication required.", 401);

  const body = await req.json();
  const type = body.type === "email" ? "email" : body.type === "mobile" ? "mobile" : null;
  if (!type) {
    return apiError("Verification type must be email or mobile.", 422);
  }

  const result = await resendContactVerificationCode(user.id, type);
  if (!result.ok) return apiError(result.message, 400);

  return apiSuccess(`New ${type} verification code generated.`, {
    type,
    target: result.target,
    code: result.code,
  });
}
