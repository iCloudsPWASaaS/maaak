import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import {
  createOrOpenConversation,
  getActiveChatCount,
} from "@/services/communication-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const sb = createAdminSupabaseClient();
  const { data: conversations } = await sb
    .from("conversations")
    .select("*")
    .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
    .neq("status", "blocked")
    .order("last_message_at", { ascending: false });

  const otherUserIds = (conversations || []).map((c) =>
    c.user_one_id === user.id ? c.user_two_id : c.user_one_id,
  );

  const [{ data: users }, { data: photos }, { data: parts }] =
    await Promise.all([
      otherUserIds.length
        ? sb
            .from("users")
            .select("id, first_name, username, id_verified, last_seen_at")
            .in("id", otherUserIds)
        : Promise.resolve({ data: [] }),
      otherUserIds.length
        ? sb
            .from("profile_photographs")
            .select("user_id, url, is_primary")
            .in("user_id", otherUserIds)
        : Promise.resolve({ data: [] }),
      sb
        .from("conversation_participants")
        .select("*")
        .eq("user_id", user.id),
    ]);

  const uMap = new Map((users || []).map((u) => [u.id, u]));
  const phMap = new Map<string, string>();
  for (const ph of photos || []) {
    if (ph.is_primary || !phMap.has(ph.user_id)) phMap.set(ph.user_id, ph.url);
  }
  const partMap = new Map((parts || []).map((p) => [p.conversation_id, p]));

  const enriched = (conversations || []).map((c) => {
    const otherId = c.user_one_id === user.id ? c.user_two_id : c.user_one_id;
    const otherUser = uMap.get(otherId);
    const myPart = partMap.get(c.id);
    return {
      ...c,
      unread_count: myPart?.unread_count || 0,
      partner: otherUser
        ? {
            id: otherUser.id,
            first_name: otherUser.first_name,
            username: otherUser.username,
            id_verified: otherUser.id_verified,
            last_seen_at: otherUser.last_seen_at,
            photo_url: phMap.get(otherUser.id) || null,
          }
        : null,
    };
  });

  const activeChatsCount = enriched.filter((c) => c.status === "active").length;

  return apiSuccess("Conversations retrieved successfully", {
    conversations: enriched,
    activeChatsCount,
    maxActiveChats: 3,
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  try {
    const body = await req.json();
    const recipientId = body.recipientId || body.recipient_id || body.userId;
    if (!recipientId) {
      return apiValidationError([
        { field: "recipientId", message: "Recipient user ID is required." },
      ]);
    }

    const result = await createOrOpenConversation({
      initiatorId: user.id,
      recipientId,
    });

    if (!result.ok) {
      return apiError(result.message, result.status);
    }

    const activeChatsCount = await getActiveChatCount(user.id);

    return apiSuccess(
      result.created
        ? "Conversation started successfully"
        : "Existing active conversation retrieved",
      {
        conversation: result.conversation,
        activeChatsCount,
        maxActiveChats: 3,
      },
      null,
      result.created ? 201 : 200,
    );
  } catch (err) {
    return apiError(`Failed to open conversation: ${(err as Error).message}`, 500);
  }
}
