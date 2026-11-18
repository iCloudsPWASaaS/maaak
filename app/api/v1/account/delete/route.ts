import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import {
  ACCESS_COOKIE_NAME,
  getAuthenticatedUser,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth-guard";
import { updateAccountLifecycleStatus } from "@/services/safety-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  let reason = "";
  try {
    const body = await req.json();
    reason = body.reason || "";
  } catch {
    // Optional reason
  }

  await updateAccountLifecycleStatus({
    userId: user.id,
    action: "request_deletion",
    reason,
  });

  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE_NAME);
  cookieStore.delete(REFRESH_COOKIE_NAME);

  return apiSuccess(
    "Permanent account deletion requested. Your profile has been unpublished and scheduled for GDPR data purge.",
    { account_status: "pending_deletion" },
  );
}
