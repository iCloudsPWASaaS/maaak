import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { startDiditVerificationSession } from "@/services/verification-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  if (user.id_verified) {
    return apiError("Your identity is already verified.", 409);
  }

  const result = await startDiditVerificationSession(user.id);
  if (!result.ok) {
    return apiError(result.message, 400);
  }

  return apiSuccess(
    "New Didit verification session initiated",
    {
      session: result.session,
      redirectUrl: result.redirectUrl,
    },
    null,
    201,
  );
}
