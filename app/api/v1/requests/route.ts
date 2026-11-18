import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { sendIntroductionRequest } from "@/services/communication-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  try {
    const body = await req.json();
    const receiverId = body.receiverId || body.receiver_id;
    if (!receiverId) {
      return apiValidationError([
        { field: "receiverId", message: "Recipient user ID is required." },
      ]);
    }

    const result = await sendIntroductionRequest({
      senderId: user.id,
      receiverId,
      message: body.message,
    });

    if (!result.ok) {
      return apiError(result.message, result.status);
    }

    return apiSuccess(
      "Introduction request sent successfully",
      {
        request: result.request,
        entitlements: result.entitlements,
      },
      null,
      201,
    );
  } catch (err) {
    return apiError(`Failed to send request: ${(err as Error).message}`, 500);
  }
}
