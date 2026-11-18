import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { initiateAgoraCall } from "@/services/communication-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const sb = createAdminSupabaseClient();
  const { data: calls } = await sb
    .from("call_records")
    .select("*")
    .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(30);

  return apiSuccess("Call history retrieved", { calls: calls || [] });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const calleeId = body.calleeId || body.callee_id;
  const callType = body.callType === "video" ? "video" : "audio";

  if (!calleeId) {
    return apiValidationError([
      { field: "calleeId", message: "Callee user ID is required." },
    ]);
  }

  const result = await initiateAgoraCall({
    callerId: user.id,
    calleeId,
    callType,
    conversationId: body.conversationId || null,
  });

  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess(
    "Call initiated successfully",
    {
      call: result.call,
      agora: result.agora,
    },
    null,
    201,
  );
}
