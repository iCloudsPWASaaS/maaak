import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import {
  getFullUserProfile,
  updateUserProfileData,
} from "@/services/profile-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const data = await getFullUserProfile(user.id);
  if (!data) return apiError("Profile not found", 404);

  return apiSuccess("Profile retrieved successfully", data);
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  try {
    const body = await req.json();
    const publish = Boolean(body.publish);
    const updates = { ...body };
    delete updates.publish;

    const result = await updateUserProfileData(user.id, updates, publish);
    if (!result.ok) {
      return apiValidationError([
        { field: result.field, message: result.message },
      ]);
    }

    return apiSuccess("Profile updated successfully", {
      profile: result.profile,
      completion: result.completion,
    });
  } catch (err) {
    return apiError(`Failed to update profile: ${(err as Error).message}`, 500);
  }
}
