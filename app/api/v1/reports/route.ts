import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { createModerationReport } from "@/services/safety-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const reportedUserId = body.reportedUserId || body.reported_user_id;
  const reason = (body.reason || "").trim();

  if (!reportedUserId || !reason) {
    return apiValidationError([
      {
        field: "reason",
        message: "Reported user ID and report reason are required.",
      },
    ]);
  }

  const result = await createModerationReport({
    reporterId: user.id,
    reportedUserId,
    reportedMessageId: body.reportedMessageId || null,
    reportType: body.reportType || "profile",
    reason,
    details: body.details,
  });

  if (!result.ok) {
    return apiError(result.message, 400);
  }

  return apiSuccess(
    "Report submitted for moderation review",
    { report: result.report },
    null,
    201,
  );
}
