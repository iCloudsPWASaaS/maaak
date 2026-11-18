import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { SUPPORTED_DEALBREAKERS } from "@/lib/workbook-catalog";
import { updateUserDealbreakers } from "@/services/profile-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const sb = createAdminSupabaseClient();
  const { data: dealbreakers } = await sb
    .from("user_dealbreakers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return apiSuccess(
    "Mandatory dealbreakers (WHAT I REQUIRE) retrieved successfully",
    {
      dealbreakers: dealbreakers || [],
      maxAllowed: 5,
      supportedCatalog: SUPPORTED_DEALBREAKERS,
    },
  );
}

export async function PUT(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  try {
    const body = await req.json();
    const list = Array.isArray(body) ? body : body.dealbreakers;

    const result = await updateUserDealbreakers(user.id, list);
    if (!result.ok) {
      return apiValidationError(result.errors);
    }

    return apiSuccess(
      "Dealbreakers saved and mutual compatibility recalculated",
      {
        dealbreakers: result.dealbreakers,
        maxAllowed: 5,
      },
    );
  } catch (err) {
    return apiError(`Dealbreakers update failed: ${(err as Error).message}`, 500);
  }
}
