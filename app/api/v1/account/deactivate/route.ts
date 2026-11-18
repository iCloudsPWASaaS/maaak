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

  await updateAccountLifecycleStatus({
    userId: user.id,
    action: "deactivate",
  });

  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE_NAME);
  cookieStore.delete(REFRESH_COOKIE_NAME);

  return apiSuccess(
    "Your account has been deactivated. Logging back in will reactivate your account.",
    { account_status: "deactivated" },
  );
}
