import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { createCustomerPortalSession } from "@/services/subscription-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const portal = await createCustomerPortalSession(user.id);

  return apiSuccess(
    "Payment methods are managed securely via Stripe Customer Portal (raw card details are never stored on Ma'aak).",
    {
      managedBy: "Stripe",
      customerPortalUrl: portal.ok ? portal.portalUrl : null,
      paymentMethods: [],
    },
  );
}
