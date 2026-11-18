import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { updateAccountLifecycleStatus } from "@/services/safety-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  let action: "pause" | "resume" = "pause";
  try {
    const body = await req.json();
    if (body.resume === true || body.action === "resume") action = "resume";
  } catch {
    // Default pause
  }

  await updateAccountLifecycleStatus({
    userId: user.id,
    action,
  });

  return apiSuccess(
    action === "pause"
      ? "Profile paused and hidden from discovery."
      : "Profile resumed and visible in discovery.",
    { account_status: action === "pause" ? "paused" : "active" },
  );
}
