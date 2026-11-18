import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { createSubscriptionCheckout } from "@/services/subscription-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const planSlug = (body.planSlug || body.plan || "premium").trim().toLowerCase();
  const platform =
    body.platform === "flutter" ||
    req.headers.get("x-client-platform") === "flutter"
      ? "flutter"
      : "web";

  const result = await createSubscriptionCheckout({
    userId: user.id,
    planSlug,
    platform,
  });

  if (!result.ok) {
    return apiError(result.message, 400);
  }

  return apiSuccess("Subscription checkout session created", result);
}
