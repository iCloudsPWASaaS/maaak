import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiError, apiOptionsResponse } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { createAdminSupabaseClient } from "@/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const text = await req.text();
  const params = new URLSearchParams(text);
  const socketId = params.get("socket_id") || "";
  const channelName = params.get("channel_name") || "";

  if (!socketId || !channelName) {
    return apiError("socket_id and channel_name are required.", 422);
  }

  const isOwnUserChannel = channelName === `private-user-${user.id}`;
  let isConversationParticipant = false;

  if (channelName.startsWith("private-conversation-")) {
    const conversationId = channelName.slice("private-conversation-".length);
    if (UUID_PATTERN.test(conversationId)) {
      const sb = createAdminSupabaseClient();
      const { data: participant } = await sb
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();
      const { data: conversation } = await sb
        .from("conversations")
        .select("status")
        .eq("id", conversationId)
        .maybeSingle();
      isConversationParticipant = Boolean(
        participant && conversation && conversation.status !== "blocked",
      );
    }
  }

  if (!isOwnUserChannel && !isConversationParticipant) {
    return apiError("Forbidden channel subscription.", 403);
  }

  const appKey = process.env.PUSHER_APP_KEY;
  const appSecret = process.env.PUSHER_APP_SECRET;
  if (process.env.ALLOW_PUSHER !== "1" || !appKey || !appSecret) {
    return apiError("Real-time messaging is not configured.", 503);
  }

  const stringToSign = `${socketId}:${channelName}`;
  const signature = crypto
    .createHmac("sha256", appSecret)
    .update(stringToSign)
    .digest("hex");

  return NextResponse.json({
    auth: `${appKey}:${signature}`,
  });
}
