import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { verifyAdminRequest } from "@/lib/auth-guard";
import { recordAuditLog } from "@/services/audit-service";
import { executeBatchMatchingRun } from "@/services/matching-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return apiError("Forbidden", 403);

  const sb = createAdminSupabaseClient();
  const [
    { data: weightsSetting },
    { data: runs },
    { data: scores },
    { data: recommendations },
  ] = await Promise.all([
    sb
      .from("cms_settings")
      .select("*")
      .eq("setting_key", "matching_weights")
      .maybeSingle(),
    sb
      .from("matching_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20),
    sb
      .from("compatibility_scores")
      .select(
        "id, user_a_id, user_b_id, is_mutually_eligible, exclusion_reason_code, mutual_score, calculated_at",
      )
      .order("calculated_at", { ascending: false })
      .limit(50),
    sb
      .from("match_recommendations")
      .select("*")
      .order("mutual_score", { ascending: false })
      .limit(50),
  ]);

  return apiSuccess("Matching administration data retrieved", {
    weights: weightsSetting?.setting_value || null,
    runs: runs || [],
    compatibilityScores: scores || [],
    recommendations: recommendations || [],
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req, ["admin", "super_admin"]);
  if (!auth.authorized) return apiError("Forbidden", 403);

  const body = await req.json();
  const sb = createAdminSupabaseClient();

  // Rule 20: "Administrators must not be able to silently override dealbreaker eligibility."
  if (body.enforce_dealbreakers === false || body.overrideDealbreakers === true) {
    return apiError(
      "Policy Violation: Administrators are strictly prohibited from disabling or overriding dealbreaker eligibility.",
      403,
    );
  }

  if (body.weights) {
    const w = body.weights;
    const sum =
      Number(w.family_future || 0) +
      Number(w.relationship_intention || 0) +
      Number(w.my_values || 0) +
      Number(w.dating_as_parent || 0) +
      Number(w.personality || 0) +
      Number(w.lifestyle_preferences || 0);

    if (Math.abs(sum - 1.0) > 0.01) {
      return apiValidationError([
        {
          field: "weights",
          message: `Compatibility weights must sum to 1.00 (100%). Current sum: ${sum.toFixed(2)}.`,
        },
      ]);
    }

    await sb
      .from("cms_settings")
      .upsert(
        {
          setting_key: "matching_weights",
          setting_group: "matching",
          setting_value: {
            ...w,
            enforce_dealbreakers: true,
            max_dealbreakers: 5,
          },
          updated_by: auth.user?.id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" },
      );

    await recordAuditLog({
      actorId: auth.user?.id || null,
      actorRole: auth.user?.role || "admin",
      category: "matching",
      action: "admin.matching_weights_updated",
      details: { weights: w },
    });
  }

  const runResult = await executeBatchMatchingRun(
    "admin_triggered",
    auth.user?.id || null,
  );

  return apiSuccess(
    "Gale-Shapley matching run completed with dealbreakers enforced",
    runResult,
  );
}
