import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { getEligibleMatchesForUser } from "@/services/discovery-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await context.params;
  const data = await getEligibleMatchesForUser(user.id, user.username, {
    limit: 50,
  });

  const match = data.items.find((m) => m.id === id);
  if (!match) {
    return apiError(
      "Match not found or does not satisfy mutual dealbreaker requirements.",
      404,
    );
  }

  return apiSuccess("Match details retrieved successfully", { match });
}
