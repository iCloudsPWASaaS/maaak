import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { getActiveChatCount } from "@/services/communication-service";
import { getFullUserProfile } from "@/services/profile-service";
import { getUserEntitlements } from "@/services/subscription-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  const [fullProfile, entitlements, activeChatsCount] = await Promise.all([
    getFullUserProfile(user.id),
    getUserEntitlements(user.id),
    getActiveChatCount(user.id),
  ]);

  return apiSuccess("Authenticated user retrieved successfully", {
    user,
    profile: fullProfile?.profile || null,
    photos: fullProfile?.photos || [],
    completion: fullProfile?.completion || null,
    entitlements,
    activeChatsCount,
  });
}
