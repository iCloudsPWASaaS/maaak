import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { respondToIntroductionRequest } from "@/services/communication-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await context.params;
  const result = await respondToIntroductionRequest({
    requestId: id,
    actorId: user.id,
    decision: "accepted",
  });

  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess("Introduction request accepted and conversation started", {
    request: result.request,
    conversation: result.conversation,
  });
}
