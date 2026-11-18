import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { unblockUserAccount } from "@/services/safety-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await context.params;
  await unblockUserAccount({
    blockerId: user.id,
    blockIdOrTargetUserId: id,
  });

  return apiSuccess("User unblocked successfully", {});
}
