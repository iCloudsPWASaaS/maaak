import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { processStripeWebhookEvent } from "@/services/subscription-service";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  const result = await processStripeWebhookEvent(rawBody, signature);
  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess("Stripe webhook processed", {
    idempotentReplay: result.idempotentReplay,
  });
}
