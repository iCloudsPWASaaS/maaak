import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { getEligibleMatchesForUser } from "@/services/discovery-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const data = await getEligibleMatchesForUser(user.id, user.username, {
    page: 1,
    limit: 12,
    sortBy: "compatibility",
  });

  const galeShapleyTopMatch =
    data.items.find((i) => i.compatibility?.is_gale_shapley_optimal) ||
    data.items[0] ||
    null;

  return apiSuccess("Recommended Gale-Shapley matches retrieved", {
    topMatch: galeShapleyTopMatch,
    recommended: data.items,
  });
}
