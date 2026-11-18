import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { createAdminSupabaseClient } from "@/supabase/admin";

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
  const sb = createAdminSupabaseClient();

  const { data: conv } = await sb
    .from("conversations")
    .select("id, user_one_id, user_two_id")
    .eq("id", id)
    .maybeSingle();

  if (!conv || (conv.user_one_id !== user.id && conv.user_two_id !== user.id)) {
    return apiError("Conversation not found.", 404);
  }

  const now = new Date().toISOString();

  await Promise.all([
    sb
      .from("messages")
      .update({ is_read: true, read_at: now })
      .eq("conversation_id", id)
      .neq("sender_id", user.id)
      .eq("is_read", false),
    sb
      .from("conversation_participants")
      .update({ unread_count: 0, last_read_at: now })
      .eq("conversation_id", id)
      .eq("user_id", user.id),
  ]);

  return apiSuccess("Messages marked as read", { readAt: now });
}
