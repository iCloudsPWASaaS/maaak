import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { generateAgoraRtcToken } from "@/services/communication-service";
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

  if (!call || (call.caller_id !== user.id && call.callee_id !== user.id)) {
    return apiError(
      "Unauthorized: Only authorised call participants may request an Agora token.",
      403,
    );
  }

  const agora = generateAgoraRtcToken({
    channelName: call.channel_name,
    userAccount: user.id,
  });

  return apiSuccess("Agora RTC token generated server-side", {
    callId: call.id,
    agora,
  });
}
