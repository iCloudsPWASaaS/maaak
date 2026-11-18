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

  const sp = req.nextUrl.searchParams;
  const data = await getEligibleMatchesForUser(user.id, user.username, {
    search: sp.get("search") || undefined,
    minAge: sp.get("minAge") ? Number(sp.get("minAge")) : undefined,
    maxAge: sp.get("maxAge") ? Number(sp.get("maxAge")) : undefined,
    city: sp.get("city") || undefined,
    postcodeArea: sp.get("postcodeArea") || undefined,
    religion: sp.get("religion") || undefined,
    religiousDenomination: sp.get("religiousDenomination") || undefined,
    educationLevel: sp.get("educationLevel") || undefined,
    profession: sp.get("profession") || undefined,
    relationshipStatus: sp.get("relationshipStatus") || undefined,
    hasChildren: sp.get("hasChildren") || undefined,
    wantsMoreChildren: sp.get("wantsMoreChildren") || undefined,
    smoking: sp.get("smoking") || undefined,
    verifiedOnly: sp.get("verifiedOnly") === "true",
    sortBy:
      (sp.get("sortBy") as
        | "compatibility"
        | "newest"
        | "age_asc"
        | "age_desc") || "compatibility",
    page: Number(sp.get("page") || 1),
    limit: Number(sp.get("limit") || 20),
  });

  return apiSuccess(
    "Explore profiles retrieved successfully",
    { profiles: data.items },
    {
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.totalPages,
    },
  );
}
