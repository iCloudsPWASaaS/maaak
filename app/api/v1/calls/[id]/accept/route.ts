import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import {
  generateAgoraRtcToken,
  triggerRealtimeEvent,
} from "@/services/communication-service";
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

  const { data: call } = await sb
    .from("call_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!call || (call.callee_id !== user.id && call.caller_id !== user.id)) {
    return apiError("Call record not found.", 404);
  }

  const { data: updated } = await sb
    .from("call_records")
    .update({
      status: "accepted",
      started_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  const agora = generateAgoraRtcToken({
    channelName: call.channel_name,
    userAccount: user.id,
  });

  const otherUserId =
    call.caller_id === user.id ? call.callee_id : call.caller_id;
  await triggerRealtimeEvent(`private-user-${otherUserId}`, "call-accepted", {
    call: updated,
  });

  return apiSuccess("Call accepted", { call: updated, agora });
}
