import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { createCustomerPortalSession } from "@/services/subscription-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const result = await createCustomerPortalSession(user.id);
  if (!result.ok) {
    return apiError("Unable to open customer billing portal.", 400);
  }

  return apiSuccess("Stripe Customer Portal session created", {
    portalUrl: result.portalUrl,
  });
}
