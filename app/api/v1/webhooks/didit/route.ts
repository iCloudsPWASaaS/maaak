import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { processDiditWebhookEvent } from "@/services/verification-service";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-signature") ||
    req.headers.get("x-didit-signature") ||
    req.headers.get("x-webhook-signature");
  const timestamp =
    req.headers.get("x-timestamp") || req.headers.get("x-didit-timestamp");

  const result = await processDiditWebhookEvent({
    rawBody,
    signature,
    timestamp,
  });

  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess("Didit verification webhook processed", {
    status: result.status,
    idempotentReplay: result.idempotentReplay,
  });
}
