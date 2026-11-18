import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { executeBatchMatchingRun } from "@/services/matching-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const result = await executeBatchMatchingRun("on-demand", user.id);

  return apiSuccess(
    "Compatibility and Gale-Shapley stable matches recalculated successfully",
    result,
  );
}
