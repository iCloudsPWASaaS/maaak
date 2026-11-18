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

  const result = await startDiditVerificationSession(user.id);
  if (!result.ok) {
    return apiError(result.message, 400);
  }

  return apiSuccess(
    "Didit identity verification session created",
    {
      session: result.session,
      redirectUrl: result.redirectUrl,
    },
    null,
    201,
  );
}
