import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { getFullUserProfile } from "@/services/profile-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const full = await getFullUserProfile(user.id);
  if (!full) return apiError("Profile not found", 404);

  return apiSuccess("Profile completion status retrieved", full.completion);
}
