import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { submitUserFeedback } from "@/services/safety-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);

  try {
    const body = await req.json();
    const email = (body.email || user?.email || "").trim();
    const message = (body.message || "").trim();
    const category = body.category || "general_feedback";

    if (!email || !message) {
      return apiValidationError([
        {
          field: "message",
          message: "Email address and feedback message are required.",
        },
      ]);
    }

    const result = await submitUserFeedback({
      userId: user?.id || null,
      name: body.name || user?.first_name || undefined,
      email,
      category,
      subject: body.subject,
      message,
      pageUrl: body.pageUrl,
    });

    if (!result.ok) {
      return apiError(result.message, 400);
    }

    return apiSuccess(
      "Thank you! Your feedback has been logged and forwarded to info@maaak.co.uk.",
      {
        feedback: result.feedback,
        recipient: result.forwardedTo,
      },
      null,
      201,
    );
  } catch (err) {
    return apiError(`Feedback submission failed: ${(err as Error).message}`, 500);
  }
}
