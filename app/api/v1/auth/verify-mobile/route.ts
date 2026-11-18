import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { verifyUserCode } from "@/services/auth-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Authentication required.", 401);

  const body = await req.json();
  const code = String(body.code || "").trim();
  if (!code) return apiError("Mobile verification code is required.", 422);

  const res = await verifyUserCode(user.id, "mobile_verification", code);
  if (!res.ok) return apiError(res.message, 400);

  return apiSuccess("Mobile number verified successfully.", {
    mobile_verified: true,
  });
}
