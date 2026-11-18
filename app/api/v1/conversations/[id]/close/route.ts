import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { closeConversation } from "@/services/communication-service";

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
  const result = await closeConversation({
    conversationId: id,
    actorId: user.id,
  });

  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess(
    "Conversation closed. Your active chat slot has been freed.",
    {
      conversation: result.conversation,
      activeChatsCount: result.activeChatsCount,
      maxActiveChats: 3,
    },
  );
}
