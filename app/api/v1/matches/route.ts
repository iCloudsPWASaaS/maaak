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

  const page = Number(req.nextUrl.searchParams.get("page") || 1);
  const limit = Number(req.nextUrl.searchParams.get("limit") || 20);

  const data = await getEligibleMatchesForUser(user.id, user.username, {
    page,
    limit,
  });

  return apiSuccess(
    "Mutually eligible matches retrieved successfully",
    { matches: data.items },
    {
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.totalPages,
    },
  );
}
