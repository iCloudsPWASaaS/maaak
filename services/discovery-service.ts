import { calculateAgeFromDob } from "@/services/auth-service";
import {
  evaluatePairCompatibility,
  executeBatchMatchingRun,
  loadEligibleCandidatePool,
} from "@/services/matching-service";
import { sanitizePublicProfile } from "@/services/profile-service";
import { createAdminSupabaseClient } from "@/supabase/admin";
import type { UserProfileRecord } from "@/types";

export interface ExploreFilters {
  search?: string;
  minAge?: number;
  maxAge?: number;
  city?: string;
  postcodeArea?: string;
  religion?: string;
  religiousDenomination?: string;
  educationLevel?: string;
  profession?: string;
  relationshipStatus?: string;
  hasChildren?: string;
  wantsMoreChildren?: string;
  smoking?: string;
  verifiedOnly?: boolean;
  sortBy?: "compatibility" | "newest" | "age_asc" | "age_desc";
  page?: number;
  limit?: number;
}

export async function getEligibleMatchesForUser(
  viewerId: string,
  viewerUsername: string,
  filters: ExploreFilters = {},
) {
  const sb = createAdminSupabaseClient();

  // Ensure recommendations exist; if none exist yet, run Gale-Shapley
  const { count: existingRecsCount } = await sb
    .from("match_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", viewerId)
    .eq("status", "active");

  if (!existingRecsCount || existingRecsCount === 0) {
    await executeBatchMatchingRun("on-demand", viewerId);
  }

  const { candidates, blockedPairs, weights, locationConfig } =
    await loadEligibleCandidatePool();

  const viewerBundle = candidates.find((c) => c.userId === viewerId);

  // Also load viewer even if viewer's profile isn't published yet so they can preview eligible matches
  let effectiveViewer = viewerBundle;
  if (!effectiveViewer) {
    const [{ data: u }, { data: p }, { data: pref }, { data: dbs }] =
      await Promise.all([
        sb
          .from("users")
          .select("id, first_name, username, id_verified, account_status")
          .eq("id", viewerId)
          .maybeSingle(),
        sb.from("user_profiles").select("*").eq("user_id", viewerId).maybeSingle(),
        sb
          .from("user_preferences")
          .select("*")
          .eq("user_id", viewerId)
          .maybeSingle(),
        sb.from("user_dealbreakers").select("*").eq("user_id", viewerId),
      ]);

    if (u && p) {
      effectiveViewer = {
        userId: u.id,
        firstName: u.first_name,
        username: u.username,
        idVerified: Boolean(u.id_verified),
        accountStatus: u.account_status,
        profile: p as UserProfileRecord,
        preferences: pref || {},
        dealbreakers: dbs || [],
        photos: [],
      };
    }
  }

  if (!effectiveViewer) {
    return {
      items: [],
      total: 0,
      page: filters.page || 1,
      limit: filters.limit || 20,
    };
  }

  // Fetch Gale-Shapley recommendation flags, likes/dislikes, and introduction requests for viewer
  const [{ data: recs }, { data: actions }, { data: requests }] =
    await Promise.all([
      sb
        .from("match_recommendations")
        .select("*")
        .eq("user_id", viewerId)
        .eq("status", "active"),
      sb.from("likes_dislikes").select("*").eq("user_id", viewerId),
      sb
        .from("introduction_requests")
        .select("*")
        .or(`sender_id.eq.${viewerId},receiver_id.eq.${viewerId}`),
    ]);

  const recMap = new Map((recs || []).map((r) => [r.matched_user_id, r]));
  const actionMap = new Map(
    (actions || []).map((a) => [a.target_user_id, a.action]),
  );
  const reqMap = new Map<string, Record<string, unknown>>();
  for (const r of requests || []) {
    const otherId = r.sender_id === viewerId ? r.receiver_id : r.sender_id;
    reqMap.set(otherId, r);
  }

  const results = [];

  for (const candidate of candidates) {
    if (candidate.userId === viewerId) continue;
    if (
      blockedPairs.has(`${viewerId}::${candidate.userId}`) ||
      blockedPairs.has(`${candidate.userId}::${viewerId}`)
    ) {
      continue;
    }

    // Evaluate mutual eligibility (Dealbreakers MUST NEVER be bypassed by filters!)
    const evaluation = evaluatePairCompatibility(
      effectiveViewer,
      candidate,
      weights,
      locationConfig,
    );

    if (!evaluation.isMutuallyEligible) {
      continue;
    }

    const cp = candidate.profile;
    const candidateAge = calculateAgeFromDob(cp.dob);

    // Apply user-selected advanced filters (only narrowing down already-eligible candidates)
    if (filters.minAge && candidateAge < filters.minAge) continue;
    if (filters.maxAge && candidateAge > filters.maxAge) continue;

    if (
      filters.city &&
      !cp.city?.toLowerCase().includes(filters.city.trim().toLowerCase())
    ) {
      continue;
    }

    if (
      filters.postcodeArea &&
      !cp.postcode_area
        ?.toUpperCase()
        .startsWith(filters.postcodeArea.trim().toUpperCase())
    ) {
      continue;
    }

    if (
      filters.religion &&
      filters.religion !== "Any" &&
      cp.religion?.toLowerCase() !== filters.religion.toLowerCase()
    ) {
      continue;
    }

    if (
      filters.religiousDenomination &&
      filters.religiousDenomination !== "Any" &&
      cp.religious_denomination?.toLowerCase() !==
        filters.religiousDenomination.toLowerCase()
    ) {
      continue;
    }

    if (
      filters.educationLevel &&
      filters.educationLevel !== "Any" &&
      cp.education_level?.toLowerCase() !== filters.educationLevel.toLowerCase()
    ) {
      continue;
    }

    if (
      filters.profession &&
      filters.profession !== "Any" &&
      !cp.profession?.toLowerCase().includes(filters.profession.toLowerCase()) &&
      !cp.profession_category
        ?.toLowerCase()
        .includes(filters.profession.toLowerCase())
    ) {
      continue;
    }

    if (
      filters.relationshipStatus &&
      filters.relationshipStatus !== "Any" &&
      cp.relationship_status?.toLowerCase() !==
        filters.relationshipStatus.toLowerCase()
    ) {
      continue;
    }

    if (filters.hasChildren === "yes" && !cp.has_children) continue;
    if (filters.hasChildren === "no" && cp.has_children) continue;

    if (
      filters.wantsMoreChildren &&
      filters.wantsMoreChildren !== "Any" &&
      cp.wants_more_children?.toLowerCase() !==
        filters.wantsMoreChildren.toLowerCase()
    ) {
      continue;
    }

    if (
      filters.smoking &&
      filters.smoking !== "Any" &&
      cp.smoking?.toLowerCase() !== filters.smoking.toLowerCase()
    ) {
      continue;
    }

    if (filters.verifiedOnly && !candidate.idVerified) continue;

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const hay = [
        candidate.firstName,
        cp.city,
        cp.profession,
        cp.job_title,
        cp.ethnicity,
        cp.education_level,
        cp.short_bio,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }

    const rec = recMap.get(candidate.userId);
    const publicProfile = sanitizePublicProfile({
      user: {
        id: candidate.userId,
        first_name: candidate.firstName,
        username: candidate.username,
        id_verified: candidate.idVerified,
      },
      profile: candidate.profile,
      photos: candidate.photos,
      compatibility: {
        mutual_score: evaluation.mutualScore,
        score_user_to_match: evaluation.scoreAToB,
        score_match_to_user: evaluation.scoreBToA,
        is_gale_shapley_optimal: Boolean(rec?.is_gale_shapley_optimal),
        rank_position: rec?.rank_position ?? 99,
        area_breakdown: evaluation.areaBreakdown,
        match_reasons: evaluation.matchReasons,
      },
      viewerWatermark: `MA'AAK • ${viewerUsername.toUpperCase()}`,
    });

    results.push({
      ...publicProfile,
      my_action: actionMap.get(candidate.userId) || null,
      introduction_request: reqMap.get(candidate.userId) || null,
    });
  }

  // Sort results
  const sortBy = filters.sortBy || "compatibility";
  results.sort((a, b) => {
    if (sortBy === "age_asc") return (a.age || 0) - (b.age || 0);
    if (sortBy === "age_desc") return (b.age || 0) - (a.age || 0);
    // Default: Gale-Shapley optimal first, then highest mutual compatibility score
    const aOpt = a.compatibility?.is_gale_shapley_optimal ? 1 : 0;
    const bOpt = b.compatibility?.is_gale_shapley_optimal ? 1 : 0;
    if (bOpt !== aOpt) return bOpt - aOpt;
    return (
      Number(b.compatibility?.mutual_score || 0) -
      Number(a.compatibility?.mutual_score || 0)
    );
  });

  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(50, Math.max(1, Number(filters.limit || 20)));
  const start = (page - 1) * limit;
  const paged = results.slice(start, start + limit);

  return {
    items: paged,
    total: results.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(results.length / limit)),
  };
}
