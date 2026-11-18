import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import {
  evaluatePairCompatibility,
  loadEligibleCandidatePool,
} from "@/services/matching-service";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const { id: targetId } = await context.params;
  const { candidates, weights, locationConfig } =
    await loadEligibleCandidatePool();

  const userA = candidates.find((c) => c.userId === user.id);
  const userB = candidates.find((c) => c.userId === targetId);

  if (!userA || !userB) {
    return apiError("Both profiles must be published to evaluate compatibility.", 404);
  }

  const evaluation = evaluatePairCompatibility(
    userA,
    userB,
    weights,
    locationConfig,
  );

  // Never expose private dealbreaker fields of the other person; only return safe public breakdown
  return apiSuccess("Mutual compatibility breakdown retrieved", {
    userAId: evaluation.userAId,
    userBId: evaluation.userBId,
    isMutuallyEligible: evaluation.isMutuallyEligible,
    mutualScore: evaluation.isMutuallyEligible ? evaluation.mutualScore : 0,
    scoreAToB: evaluation.isMutuallyEligible ? evaluation.scoreAToB : 0,
    scoreBToA: evaluation.isMutuallyEligible ? evaluation.scoreBToA : 0,
    areaBreakdown: evaluation.areaBreakdown,
    matchReasons: evaluation.isMutuallyEligible ? evaluation.matchReasons : [],
    weights,
  });
}
