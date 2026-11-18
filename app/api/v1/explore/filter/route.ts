import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { getEligibleMatchesForUser } from "@/services/discovery-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const filters = await req.json();
  const data = await getEligibleMatchesForUser(user.id, user.username, filters);

  return apiSuccess(
    "Filtered eligible profiles retrieved (dealbreakers strictly enforced)",
    { profiles: data.items },
    {
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.totalPages,
    },
  );
}
