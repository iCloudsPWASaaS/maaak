import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { blockUserAccount } from "@/services/safety-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const sb = createAdminSupabaseClient();
  const { data: blocks } = await sb
    .from("blocked_users")
    .select("*")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  const blockedIds = (blocks || []).map((b) => b.blocked_id);
  const { data: users } = blockedIds.length
    ? await sb
        .from("users")
        .select("id, first_name, username")
        .in("id", blockedIds)
    : { data: [] };

  const uMap = new Map((users || []).map((u) => [u.id, u]));
  const enriched = (blocks || []).map((b) => ({
    ...b,
    blocked_user: uMap.get(b.blocked_id) || null,
  }));

  return apiSuccess("Blocked users retrieved", { blocks: enriched });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const blockedId = body.blockedId || body.blocked_user_id || body.userId;

  if (!blockedId) {
    return apiValidationError([
      { field: "blockedId", message: "User ID to block is required." },
    ]);
  }

  const result = await blockUserAccount({
    blockerId: user.id,
    blockedId,
    reason: body.reason,
  });

  if (!result.ok) {
    return apiError(result.message, 400);
  }

  return apiSuccess(
    "User blocked. All active conversations and interactions have been terminated.",
    { block: result.block },
    null,
    201,
  );
}
