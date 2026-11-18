import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { triggerRealtimeEvent } from "@/services/communication-service";
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

  const endedAt = new Date();
  const startedAt = call.started_at ? new Date(call.started_at) : null;
  const durationSeconds = startedAt
    ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
    : 0;

  const finalStatus = call.status === "ringing" ? "missed" : "ended";

  const { data: updated } = await sb
    .from("call_records")
    .update({
      status: finalStatus,
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (finalStatus === "missed") {
    await sb.from("notifications").insert({
      user_id: call.callee_id,
      type: "missed_call",
      title: `Missed ${call.call_type === "video" ? "Video" : "Voice"} Call`,
      body: "You missed a call on Ma'aak.",
      action_url: "/calls",
    });
  }

  const otherUserId = call.caller_id === user.id ? call.callee_id : call.caller_id;
  await triggerRealtimeEvent(`private-user-${otherUserId}`, "call-ended", {
    call: updated,
  });

  return apiSuccess("Call ended", { call: updated });
}
