import crypto from "node:crypto";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import Pusher from "pusher";
import { getUserEntitlements } from "@/services/subscription-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

function getPusherServer(): Pusher | null {
  if (
    process.env.ALLOW_PUSHER === "1" &&
    process.env.PUSHER_APP_ID &&
    process.env.PUSHER_APP_KEY &&
    process.env.PUSHER_APP_SECRET
  ) {
    return new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_APP_KEY,
      secret: process.env.PUSHER_APP_SECRET,
      cluster: process.env.PUSHER_APP_CLUSTER || "eu",
      useTLS: true,
    });
  }
  return null;
}

export async function triggerRealtimeEvent(
  channel: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const pusher = getPusherServer();
  if (!pusher) return false;
  try {
    await pusher.trigger(channel, event, payload);
    return true;
  } catch (err) {
    console.error("[communication-service] Pusher trigger error:", err);
    return false;
  }
}

// ============================================================================
// 1. Active Chat Count Helper (Enforces Max 3 Active Chats)
// ============================================================================

export async function getActiveChatCount(userId: string): Promise<number> {
  const sb = createAdminSupabaseClient();
  const { count } = await sb
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`);
  return count ?? 0;
}

export async function isBlockedBetween(
  userAId: string,
  userBId: string,
): Promise<boolean> {
  const sb = createAdminSupabaseClient();
  const { data } = await sb
    .from("blocked_users")
    .select("id")
    .or(
      `and(blocker_id.eq.${userAId},blocked_id.eq.${userBId}),and(blocker_id.eq.${userBId},blocked_id.eq.${userAId})`,
    )
    .limit(1);
  return Boolean(data && data.length > 0);
}

// ============================================================================
// 2. Introduction Requests (Enforces Free 10-Request Limit + Block Check)
// ============================================================================

export async function sendIntroductionRequest(input: {
  senderId: string;
  receiverId: string;
  message?: string;
}) {
  if (input.senderId === input.receiverId) {
    return {
      ok: false as const,
      status: 400,
      message: "You cannot send an introduction request to yourself.",
    };
  }

  if (await isBlockedBetween(input.senderId, input.receiverId)) {
    return {
      ok: false as const,
      status: 403,
      message: "Interaction with this profile is unavailable.",
    };
  }

  const entitlements = await getUserEntitlements(input.senderId);
  if (
    entitlements.maxIntroductionRequests !== null &&
    entitlements.introductionRequestsUsed >= entitlements.maxIntroductionRequests
  ) {
    return {
      ok: false as const,
      status: 403,
      message: `You have used all ${entitlements.maxIntroductionRequests} introduction requests available on the Free Membership. Upgrade to Premium (1st Month Free) for unlimited requests.`,
      entitlements,
    };
  }

  const sb = createAdminSupabaseClient();

  const { data: existing } = await sb
    .from("introduction_requests")
    .select("*")
    .or(
      `and(sender_id.eq.${input.senderId},receiver_id.eq.${input.receiverId}),and(sender_id.eq.${input.receiverId},receiver_id.eq.${input.senderId})`,
    )
    .maybeSingle();

  if (existing) {
    return {
      ok: false as const,
      status: 409,
      message: `An introduction request already exists between you (${existing.status}).`,
    };
  }

  // Look up compatibility score
  const { data: comp } = await sb
    .from("compatibility_scores")
    .select("mutual_score, is_mutually_eligible")
    .or(
      `and(user_a_id.eq.${input.senderId},user_b_id.eq.${input.receiverId}),and(user_a_id.eq.${input.receiverId},user_b_id.eq.${input.senderId})`,
    )
    .maybeSingle();

  const { data: created, error } = await sb
    .from("introduction_requests")
    .insert({
      sender_id: input.senderId,
      receiver_id: input.receiverId,
      message: input.message?.trim() || "Assalamu Alaikum, I would love to introduce myself.",
      compatibility_score: comp?.mutual_score ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return {
      ok: false as const,
      status: 400,
      message: error.message,
    };
  }

  // Increment subscription counter
  await sb
    .from("user_subscriptions")
    .update({
      introduction_requests_used: entitlements.introductionRequestsUsed + 1,
    })
    .eq("user_id", input.senderId)
    .in("status", ["trialing", "active"]);

  // Notify receiver
  await sb.from("notifications").insert({
    user_id: input.receiverId,
    type: "introduction_request",
    title: "New Introduction Request",
    body: "You have received a new marriage introduction request on Ma'aak.",
    action_url: "/requests",
    metadata: { request_id: created.id, sender_id: input.senderId },
  });

  await triggerRealtimeEvent(`private-user-${input.receiverId}`, "new-request", {
    requestId: created.id,
    senderId: input.senderId,
  });

  const updatedEntitlements = await getUserEntitlements(input.senderId);

  return {
    ok: true as const,
    request: created,
    entitlements: updatedEntitlements,
  };
}

export async function respondToIntroductionRequest(input: {
  requestId: string;
  actorId: string;
  decision: "accepted" | "rejected";
}) {
  const sb = createAdminSupabaseClient();

  const { data: reqRow } = await sb
    .from("introduction_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();

  if (!reqRow) {
    return { ok: false as const, status: 404, message: "Introduction request not found." };
  }

  if (reqRow.receiver_id !== input.actorId) {
    return {
      ok: false as const,
      status: 403,
      message: "Only the recipient can accept or reject this introduction request.",
    };
  }

  if (reqRow.status !== "pending") {
    return {
      ok: false as const,
      status: 409,
      message: `This request has already been ${reqRow.status}.`,
    };
  }

  let conversation = null;

  if (input.decision === "accepted") {
    // Enforce Max 3 Active Chats for both participants before accepting
    const [senderChats, receiverChats] = await Promise.all([
      getActiveChatCount(reqRow.sender_id),
      getActiveChatCount(reqRow.receiver_id),
    ]);

    if (receiverChats >= 3) {
      return {
        ok: false as const,
        status: 403,
        message:
          "You already have the maximum of 3 active chats. Please close an existing conversation before starting a new chat.",
      };
    }

    if (senderChats >= 3) {
      return {
        ok: false as const,
        status: 403,
        message:
          "The sender currently has the maximum of 3 active chats. Please try accepting once they have an open chat slot.",
      };
    }
  }

  const { data: updatedReq, error: updErr } = await sb
    .from("introduction_requests")
    .update({
      status: input.decision,
      responded_at: new Date().toISOString(),
    })
    .eq("id", input.requestId)
    .select("*")
    .single();

  if (updErr) {
    return { ok: false as const, status: 400, message: updErr.message };
  }

  if (input.decision === "accepted") {
    const { data: conv, error: convErr } = await sb
      .from("conversations")
      .insert({
        user_one_id: reqRow.sender_id,
        user_two_id: reqRow.receiver_id,
        introduction_request_id: reqRow.id,
        status: "active",
        last_message_at: new Date().toISOString(),
        last_message_preview: reqRow.message || "Introduction accepted",
      })
      .select("*")
      .single();

    if (!convErr && conv) {
      conversation = conv;
      await sb.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: reqRow.sender_id, unread_count: 1 },
        { conversation_id: conv.id, user_id: reqRow.receiver_id, unread_count: 0 },
      ]);

      await sb.from("messages").insert({
        conversation_id: conv.id,
        sender_id: reqRow.sender_id,
        message_type: "text",
        content: reqRow.message || "Assalamu Alaikum! Thank you for accepting my introduction.",
      });
    }

    await sb.from("notifications").insert({
      user_id: reqRow.sender_id,
      type: "request_accepted",
      title: "Introduction Request Accepted",
      body: "Your introduction request has been accepted! You can now message each other.",
      action_url: "/messages",
      metadata: { request_id: reqRow.id, conversation_id: conversation?.id },
    });
  }

  return {
    ok: true as const,
    request: updatedReq,
    conversation,
  };
}

// ============================================================================
// 3. Conversations & Messaging (Server-Side Max 3 Active Chats Enforcement)
// ============================================================================

export async function createOrOpenConversation(input: {
  initiatorId: string;
  recipientId: string;
}) {
  if (input.initiatorId === input.recipientId) {
    return {
      ok: false as const,
      status: 400,
      message: "Cannot start a conversation with yourself.",
    };
  }

  if (await isBlockedBetween(input.initiatorId, input.recipientId)) {
    return {
      ok: false as const,
      status: 403,
      message: "Messaging is unavailable because a block exists between these accounts.",
    };
  }

  const entitlements = await getUserEntitlements(input.initiatorId);
  if (!entitlements.canMessage) {
    return {
      ok: false as const,
      status: 403,
      message:
        "Real-time messaging is a Premium feature. Activate your 1st Month Free Premium trial to message matches.",
    };
  }

  const sb = createAdminSupabaseClient();

  // Check if an active conversation already exists between the two users
  const { data: existingActive } = await sb
    .from("conversations")
    .select("*")
    .eq("status", "active")
    .or(
      `and(user_one_id.eq.${input.initiatorId},user_two_id.eq.${input.recipientId}),and(user_one_id.eq.${input.recipientId},user_two_id.eq.${input.initiatorId})`,
    )
    .maybeSingle();

  if (existingActive) {
    return { ok: true as const, conversation: existingActive, created: false };
  }

  // Enforce Max 3 Active Chats server-side!
  const [initiatorCount, recipientCount] = await Promise.all([
    getActiveChatCount(input.initiatorId),
    getActiveChatCount(input.recipientId),
  ]);

  if (initiatorCount >= 3) {
    return {
      ok: false as const,
      status: 403,
      message:
        "Active chat limit reached: You may have a maximum of 3 active chats at any one time. Close an ended conversation to start a new one.",
    };
  }

  if (recipientCount >= 3) {
    return {
      ok: false as const,
      status: 403,
      message:
        "This member currently has the maximum of 3 active chats. Please try again later.",
    };
  }

  const { data: created, error } = await sb
    .from("conversations")
    .insert({
      user_one_id: input.initiatorId,
      user_two_id: input.recipientId,
      status: "active",
      last_message_at: new Date().toISOString(),
      last_message_preview: "Conversation started",
    })
    .select("*")
    .single();

  if (error || !created) {
    return {
      ok: false as const,
      status: 400,
      message: error?.message || "Unable to create conversation.",
    };
  }

  await sb.from("conversation_participants").insert([
    { conversation_id: created.id, user_id: input.initiatorId, unread_count: 0 },
    { conversation_id: created.id, user_id: input.recipientId, unread_count: 0 },
  ]);

  return { ok: true as const, conversation: created, created: true };
}

export async function sendConversationMessage(input: {
  conversationId: string;
  senderId: string;
  content: string;
  messageType?: "text" | "voice_note" | "call_event" | "system";
  attachmentUrl?: string | null;
}) {
  const sb = createAdminSupabaseClient();

  const { data: conv } = await sb
    .from("conversations")
    .select("*")
    .eq("id", input.conversationId)
    .maybeSingle();

  if (!conv) {
    return { ok: false as const, status: 404, message: "Conversation not found." };
  }

  if (conv.user_one_id !== input.senderId && conv.user_two_id !== input.senderId) {
    return {
      ok: false as const,
      status: 403,
      message: "You are not a participant in this conversation.",
    };
  }

  if (conv.status !== "active") {
    return {
      ok: false as const,
      status: 403,
      message: `Cannot send messages to a ${conv.status} conversation.`,
    };
  }

  const recipientId =
    conv.user_one_id === input.senderId ? conv.user_two_id : conv.user_one_id;

  if (await isBlockedBetween(input.senderId, recipientId)) {
    return {
      ok: false as const,
      status: 403,
      message: "Messaging between these accounts is blocked.",
    };
  }

  const entitlements = await getUserEntitlements(input.senderId);
  if (!entitlements.canMessage) {
    return {
      ok: false as const,
      status: 403,
      message:
        "Sending messages requires an active Premium Membership (1st Month Free available).",
    };
  }

  const trimmed = input.content.trim();
  if (!trimmed) {
    return { ok: false as const, status: 422, message: "Message content cannot be empty." };
  }

  const { data: msg, error } = await sb
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      message_type: input.messageType || "text",
      content: trimmed,
      attachment_url: input.attachmentUrl || null,
      is_read: false,
    })
    .select("*")
    .single();

  if (error || !msg) {
    return {
      ok: false as const,
      status: 400,
      message: error?.message || "Failed to send message.",
    };
  }

  await sb
    .from("conversations")
    .update({
      last_message_at: msg.created_at,
      last_message_preview: trimmed.slice(0, 120),
    })
    .eq("id", input.conversationId);

  // Increment recipient unread count
  const { data: part } = await sb
    .from("conversation_participants")
    .select("id, unread_count")
    .eq("conversation_id", input.conversationId)
    .eq("user_id", recipientId)
    .maybeSingle();

  if (part) {
    await sb
      .from("conversation_participants")
      .update({ unread_count: (part.unread_count || 0) + 1 })
      .eq("id", part.id);
  }

  await sb.from("notifications").insert({
    user_id: recipientId,
    type: "new_message",
    title: "New Message",
    body: trimmed.slice(0, 80),
    action_url: `/messages?conversation=${input.conversationId}`,
    metadata: { conversation_id: input.conversationId, message_id: msg.id },
  });

  await triggerRealtimeEvent(
    `private-conversation-${input.conversationId}`,
    "new-message",
    { message: msg },
  );
  await triggerRealtimeEvent(`private-user-${recipientId}`, "message-notification", {
    conversationId: input.conversationId,
    message: msg,
  });

  return { ok: true as const, message: msg };
}

export async function closeConversation(input: {
  conversationId: string;
  actorId: string;
}) {
  const sb = createAdminSupabaseClient();

  const { data: conv } = await sb
    .from("conversations")
    .select("*")
    .eq("id", input.conversationId)
    .maybeSingle();

  if (!conv) {
    return { ok: false as const, status: 404, message: "Conversation not found." };
  }

  if (conv.user_one_id !== input.actorId && conv.user_two_id !== input.actorId) {
    return {
      ok: false as const,
      status: 403,
      message: "You are not a participant in this conversation.",
    };
  }

  const { data: closed, error } = await sb
    .from("conversations")
    .update({
      status: "closed",
      closed_by: input.actorId,
      closed_at: new Date().toISOString(),
    })
    .eq("id", input.conversationId)
    .select("*")
    .single();

  if (error) {
    return { ok: false as const, status: 400, message: error.message };
  }

  const activeRemaining = await getActiveChatCount(input.actorId);

  return {
    ok: true as const,
    conversation: closed,
    activeChatsCount: activeRemaining,
  };
}

// ============================================================================
// 4. Agora Voice & Video Calling (Server-Side Token Generation & Call Records)
// ============================================================================

export function generateAgoraRtcToken(input: {
  channelName: string;
  userAccount: string;
  expireSeconds?: number;
}): {
  token: string;
  appId: string;
  channelName: string;
  uid: string;
  expiresAt: string;
} {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE_KEY;
  if (!appId || !appCertificate) {
    throw new Error("Agora credentials are not configured.");
  }

  const expireSeconds = input.expireSeconds || 3600;
  const token = RtcTokenBuilder.buildTokenWithUserAccount(
    appId,
    appCertificate,
    input.channelName,
    input.userAccount,
    RtcRole.PUBLISHER,
    expireSeconds,
    expireSeconds,
  );

  return {
    token,
    appId,
    channelName: input.channelName,
    uid: input.userAccount,
    expiresAt: new Date(Date.now() + expireSeconds * 1000).toISOString(),
  };
}

export async function initiateAgoraCall(input: {
  callerId: string;
  calleeId: string;
  callType: "audio" | "video";
  conversationId?: string | null;
}) {
  if (await isBlockedBetween(input.callerId, input.calleeId)) {
    return {
      ok: false as const,
      status: 403,
      message: "Calling is unavailable between these accounts.",
    };
  }

  const entitlements = await getUserEntitlements(input.callerId);
  if (input.callType === "video" && !entitlements.canVideoCall) {
    return {
      ok: false as const,
      status: 403,
      message: "Video calling requires a Premium Membership.",
    };
  }
  if (input.callType === "audio" && !entitlements.canAudioCall) {
    return {
      ok: false as const,
      status: 403,
      message: "Voice calling requires a Premium Membership.",
    };
  }

  const sb = createAdminSupabaseClient();
  const channelName = `maaak_${input.callType}_${crypto.randomBytes(6).toString("hex")}`;

  const { data: callRecord, error } = await sb
    .from("call_records")
    .insert({
      conversation_id: input.conversationId || null,
      caller_id: input.callerId,
      callee_id: input.calleeId,
      call_type: input.callType,
      channel_name: channelName,
      status: "ringing",
    })
    .select("*")
    .single();

  if (error || !callRecord) {
    return {
      ok: false as const,
      status: 400,
      message: error?.message || "Unable to initiate call.",
    };
  }

  const tokenBundle = generateAgoraRtcToken({
    channelName,
    userAccount: input.callerId,
  });

  await sb.from("notifications").insert({
    user_id: input.calleeId,
    type: "incoming_call",
    title: `Incoming ${input.callType === "video" ? "Video" : "Voice"} Call`,
    body: "A connection is calling you on Ma'aak.",
    action_url: `/calls?callId=${callRecord.id}`,
    metadata: {
      call_id: callRecord.id,
      caller_id: input.callerId,
      call_type: input.callType,
      channel_name: channelName,
    },
  });

  await triggerRealtimeEvent(`private-user-${input.calleeId}`, "incoming-call", {
    call: callRecord,
  });

  return {
    ok: true as const,
    call: callRecord,
    agora: tokenBundle,
  };
}
