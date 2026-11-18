import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { updateUserProfileData } from "@/services/profile-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
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

    return apiSuccess(
      "Profile saved successfully",
      {
        profile: result.profile,
        completion: result.completion,
      },
      null,
      201,
    );
  } catch (err) {
    return apiError(`Profile save failed: ${(err as Error).message}`, 500);
  }
}
