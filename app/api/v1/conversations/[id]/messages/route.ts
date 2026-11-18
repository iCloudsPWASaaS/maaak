import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { sendConversationMessage } from "@/services/communication-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await context.params;
  const sb = createAdminSupabaseClient();

  const { data: conv } = await sb
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!conv || (conv.user_one_id !== user.id && conv.user_two_id !== user.id)) {
    return apiError("Conversation not found.", 404);
  }

  const { data: messages } = await sb
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  return apiSuccess("Messages retrieved successfully", {
    conversation: conv,
    messages: messages || [],
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await context.params;
  const body = await req.json();

  const result = await sendConversationMessage({
    conversationId: id,
    senderId: user.id,
    content: body.content || body.message || "",
    messageType: body.messageType || "text",
    attachmentUrl: body.attachmentUrl || null,
  });

  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess("Message sent", { message: result.message }, null, 201);
}
