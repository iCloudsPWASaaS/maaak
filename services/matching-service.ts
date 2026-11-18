import {
  DEFAULT_COMPATIBILITY_WEIGHTS,
  SUPPORTED_DEALBREAKERS,
} from "@/lib/workbook-catalog";
import { calculateAgeFromDob } from "@/services/auth-service";
import { recordAuditLog } from "@/services/audit-service";
import { createAdminSupabaseClient } from "@/supabase/admin";
import type {
  CompatibilityAreaBreakdown,
  UserDealbreakerRecord,
  UserPreferencesRecord,
  UserProfileRecord,
} from "@/types";

export interface CompatibilityWeights {
  family_future: number;
  relationship_intention: number;
  my_values: number;
  dating_as_parent: number;
  personality: number;
  lifestyle_preferences: number;
}

export interface CandidateBundle {
  userId: string;
  firstName: string;
  username: string;
  idVerified: boolean;
  accountStatus: string;
  profile: UserProfileRecord;
  preferences: Partial<UserPreferencesRecord>;
  dealbreakers: UserDealbreakerRecord[];
  photos: { id: string; url: string; is_primary: boolean }[];
}

export interface PairEvaluationResult {
  userAId: string;
  userBId: string;
  isMutuallyEligible: boolean;
  aMeetsBDealbreakers: boolean;
  bMeetsADealbreakers: boolean;
  failedDealbreakersForA: string[]; // Dealbreakers set by A that B failed
  failedDealbreakersForB: string[]; // Dealbreakers set by B that A failed
  locationEligible: boolean;
  exclusionReasonCode: string | null;
  scoreAToB: number;
  scoreBToA: number;
  mutualScore: number;
  areaBreakdown: CompatibilityAreaBreakdown;
  matchReasons: string[];
}

export interface GaleShapleyAllocation {
  proposerId: string;
  receiverId: string;
  scoreProposerToReceiver: number;
  scoreReceiverToProposer: number;
  mutualScore: number;
}

export interface GaleShapleyResult {
  allocations: GaleShapleyAllocation[];
  proposerPreferences: Record<string, string[]>;
  receiverPreferences: Record<string, string[]>;
  blockingPairsCount: number;
  proposalsCount: number;
}

// ============================================================================
// 1. Dealbreaker Validation (Max 5, No Duplicates, Supported Codes Only)
// ============================================================================

export function validateDealbreakersInput(
  dealbreakers: { dealbreaker_code: string; required_value: unknown }[],
): { valid: boolean; errors: { field: string; message: string }[] } {
  const errors: { field: string; message: string }[] = [];

  if (!Array.isArray(dealbreakers)) {
    return {
      valid: false,
      errors: [{ field: "dealbreakers", message: "Dealbreakers must be an array." }],
    };
  }

  if (dealbreakers.length > 5) {
    errors.push({
      field: "dealbreakers",
      message: "You may select a maximum of 5 dealbreakers.",
    });
  }

  const seenCodes = new Set<string>();
  const validCodes = new Set(SUPPORTED_DEALBREAKERS.map((d) => d.code));

  for (const item of dealbreakers) {
    const code = item?.dealbreaker_code?.trim();
    if (!code || !validCodes.has(code)) {
      errors.push({
        field: "dealbreaker_code",
        message: `Unsupported dealbreaker code: "${code || ""}".`,
      });
      continue;
    }
    if (seenCodes.has(code)) {
      errors.push({
        field: "dealbreaker_code",
        message: `Duplicate dealbreaker "${code}" is not allowed.`,
      });
    }
    seenCodes.add(code);

    if (
      item.required_value === undefined ||
      item.required_value === null ||
      item.required_value === "" ||
      (Array.isArray(item.required_value) && item.required_value.length === 0)
    ) {
      errors.push({
        field: code,
        message: `Dealbreaker "${code}" requires a non-empty requirement value.`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// 2. Helper Functions for Unanswered / Unknown Values & Distance
// ============================================================================

export function isUnanswered(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") {
    const trimmed = val.trim().toLowerCase();
    return (
      trimmed === "" ||
      trimmed === "prefer not to say" ||
      trimmed === "unknown"
    );
  }
  if (Array.isArray(val)) {
    const meaningful = val.filter(
      (v) =>
        v !== null &&
        v !== undefined &&
        String(v).trim() !== "" &&
        String(v).trim().toLowerCase() !== "prefer not to say",
    );
    return meaningful.length === 0;
  }
  return false;
}

export function isNoPreference(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") {
    const t = val.trim().toLowerCase();
    return (
      t === "" ||
      t === "no preference" ||
      t === "any" ||
      t === "anywhere in uk" ||
      t === "international" ||
      t === "open to a partner with or without children"
    );
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return true;
    return val.some(
      (item) =>
        String(item).trim().toLowerCase() === "no preference" ||
        String(item).trim().toLowerCase() === "any",
    );
  }
  return false;
}

export function calculateDistanceMiles(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null,
): number | null {
  if (
    lat1 === null ||
    lat1 === undefined ||
    lon1 === null ||
    lon1 === undefined ||
    lat2 === null ||
    lat2 === undefined ||
    lon2 === null ||
    lon2 === undefined
  ) {
    return null;
  }
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeStringList(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof val === "string" && val.trim() !== "") {
    return [val.trim().toLowerCase()];
  }
  return [];
}

// ============================================================================
// 3. Dealbreaker Satisfaction Check (Mandatory Eligibility Filter)
// Rule: Unanswered dealbreaker-related field on candidate = NOT satisfied (false)
// ============================================================================

export function checkSingleDealbreaker(
  dealbreaker: UserDealbreakerRecord,
  owner: CandidateBundle,
  candidate: CandidateBundle,
): boolean {
  const code = dealbreaker.dealbreaker_code;
  const reqVal = dealbreaker.required_value;
  const cp = candidate.profile;

  switch (code) {
    case "age_range": {
      if (isUnanswered(cp.dob)) return false;
      const candidateAge = calculateAgeFromDob(cp.dob);
      const minAge =
        typeof reqVal === "object" && reqVal !== null && "min" in reqVal
          ? Number((reqVal as { min: number }).min)
          : owner.preferences.preferred_age_min ?? 18;
      const maxAge =
        typeof reqVal === "object" && reqVal !== null && "max" in reqVal
          ? Number((reqVal as { max: number }).max)
          : owner.preferences.preferred_age_max ?? 99;
      return candidateAge >= minAge && candidateAge <= maxAge;
    }

    case "distance": {
      const maxMilesStr =
        typeof reqVal === "string"
          ? reqVal
          : owner.preferences.preferred_distance_miles || "No preference";
      if (isNoPreference(maxMilesStr)) return true;
      const maxMiles = parseFloat(String(maxMilesStr).replace(/[^0-9.]/g, ""));
      if (Number.isNaN(maxMiles) || maxMiles >= 200) return true;

      // Check coordinates if available, or postcode_area/city match
      const dist = calculateDistanceMiles(
        owner.profile.latitude,
        owner.profile.longitude,
        cp.latitude,
        cp.longitude,
      );
      if (dist !== null) {
        return dist <= maxMiles;
      }
      // If coordinates aren't set, require postcode_area or city to be answered
      if (isUnanswered(cp.postcode_area) && isUnanswered(cp.city)) return false;
      if (maxMiles <= 25) {
        return (
          cp.city?.trim().toLowerCase() ===
            owner.profile.city?.trim().toLowerCase() ||
          cp.postcode_area?.trim().toUpperCase() ===
            owner.profile.postcode_area?.trim().toUpperCase()
        );
      }
      return true;
    }

    case "religion": {
      if (isUnanswered(cp.religion)) return false;
      const allowed = normalizeStringList(reqVal);
      if (allowed.length === 0) return false;
      const candRel = cp.religion!.trim().toLowerCase();
      return allowed.some(
        (a) => candRel === a || candRel.includes(a) || a.includes(candRel),
      );
    }

    case "religious_practice": {
      if (isUnanswered(cp.religious_practice)) return false;
      const candPrac = cp.religious_practice!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      if (allowed.includes("similar to me")) {
        if (isUnanswered(owner.profile.religious_practice)) return false;
        return candPrac === owner.profile.religious_practice!.trim().toLowerCase();
      }
      return allowed.includes(candPrac);
    }

    case "religious_denomination": {
      if (isUnanswered(cp.religious_denomination)) return false;
      const candDenom = cp.religious_denomination!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.some(
        (a) => candDenom === a || candDenom.includes(a) || a.includes(candDenom),
      );
    }

    case "ethnicity": {
      if (isUnanswered(cp.ethnicity)) return false;
      const candEth = cp.ethnicity!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      if (allowed.includes("no") || allowed.includes("same ethnicity")) {
        if (isUnanswered(owner.profile.ethnicity)) return false;
        return candEth === owner.profile.ethnicity!.trim().toLowerCase();
      }
      return allowed.includes(candEth);
    }

    case "smoking": {
      if (isUnanswered(cp.smoking)) return false;
      const candSmoke = cp.smoking!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      if (allowed.includes("non-smoker") || allowed.includes("never")) {
        return candSmoke === "never";
      }
      return allowed.includes(candSmoke);
    }

    case "alcohol": {
      if (isUnanswered(cp.alcohol)) return false;
      const candAlc = cp.alcohol!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.includes(candAlc);
    }

    case "has_children": {
      if (cp.has_children === null || cp.has_children === undefined && isUnanswered(cp.children_count)) {
        return false;
      }
      const candHasChildren =
        Boolean(cp.has_children) ||
        (Boolean(cp.children_count) &&
          cp.children_count !== "None" &&
          cp.children_count !== "0");
      const reqStr = String(reqVal).trim().toLowerCase();
      if (reqStr.includes("without children") || reqStr === "false" || reqStr === "no") {
        return !candHasChildren;
      }
      if (reqStr.includes("with children") || reqStr === "true" || reqStr === "yes") {
        return candHasChildren;
      }
      return true;
    }

    case "number_of_children": {
      if (isUnanswered(cp.children_count)) return false;
      const countNum =
        cp.children_count === "None"
          ? 0
          : parseInt(String(cp.children_count).replace(/[^0-9]/g, ""), 10) || 0;
      const reqStr = String(reqVal).trim().toLowerCase();
      if (reqStr === "1") return countNum <= 1;
      if (reqStr === "up to 2" || reqStr === "2") return countNum <= 2;
      if (reqStr === "up to 3" || reqStr === "3") return countNum <= 3;
      return true;
    }

    case "wants_more_children": {
      if (isUnanswered(cp.wants_more_children)) return false;
      const candWants = cp.wants_more_children!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      if (
        allowed.some(
          (a) =>
            a === "definitely" ||
            a === "wants children" ||
            a === "must want more children",
        )
      ) {
        return candWants === "definitely" || candWants === "open to it";
      }
      if (allowed.includes("definitely not")) {
        return candWants === "definitely not" || candWants === "probably not";
      }
      return allowed.includes(candWants);
    }

    case "open_to_blended_family": {
      if (isUnanswered(cp.blended_family_comfort)) return false;
      const candBlend = cp.blended_family_comfort!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.includes(candBlend);
    }

    case "relationship_intention": {
      if (isUnanswered(cp.looking_for_intention)) return false;
      const candInt = cp.looking_for_intention!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.some((a) => candInt === a || candInt.includes(a) || a.includes(candInt));
    }

    case "marriage_timeline": {
      if (isUnanswered(cp.marriage_timeline)) return false;
      const candTime = cp.marriage_timeline!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.includes(candTime);
    }

    case "relocation": {
      if (isUnanswered(cp.relocation_willingness)) return false;
      const candReloc = cp.relocation_willingness!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.includes(candReloc);
    }

    case "long_distance": {
      if (isUnanswered(cp.long_distance_consideration)) return false;
      const candLd = cp.long_distance_consideration!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.includes(candLd);
    }

    case "living_with_extended_family": {
      if (isUnanswered(cp.extended_family_living)) return false;
      const candExt = cp.extended_family_living!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.some((a) => candExt.includes(a) || a.includes(candExt));
    }

    case "family_involvement": {
      if (isUnanswered(cp.extended_family_involvement)) return false;
      const candInv = cp.extended_family_involvement!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.includes(candInv);
    }

    case "education": {
      if (isUnanswered(cp.education_level)) return false;
      const candEdu = cp.education_level!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.includes(candEdu);
    }

    case "language": {
      if (isUnanswered(cp.languages_spoken)) return false;
      const candLangs = normalizeStringList(cp.languages_spoken);
      const requiredLangs = normalizeStringList(reqVal);
      return requiredLangs.some((reqL) => candLangs.includes(reqL));
    }

    case "relationship_status": {
      if (isUnanswered(cp.relationship_status)) return false;
      const candStat = cp.relationship_status!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.includes(candStat);
    }

    case "future_partner_employment_plans": {
      if (isUnanswered(cp.future_employment_plans)) return false;
      const candEmp = cp.future_employment_plans!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.includes(candEmp);
    }

    case "hijab_preference": {
      if (cp.gender !== "Female") return true;
      if (isUnanswered(cp.hijab_preference)) return false;
      const candHijab = cp.hijab_preference!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.some((a) => {
        if (a === "essential" || a === "regularly" || a === "wear hijab") {
          return (
            candHijab.includes("always") ||
            candHijab.includes("most of the time") ||
            candHijab.includes("niqab")
          );
        }
        return candHijab === a || candHijab.includes(a);
      });
    }

    case "facial_hair_preference": {
      if (cp.gender !== "Male") return true;
      if (isUnanswered(cp.facial_hair)) return false;
      const candBeard = cp.facial_hair!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      return allowed.includes(candBeard);
    }

    case "previous_relationship_concluded": {
      if (cp.relationship_status === "Never Married") return true;
      if (isUnanswered(cp.previous_relationship_concluded)) return false;
      const candConc = cp.previous_relationship_concluded!.trim().toLowerCase();
      const allowed = normalizeStringList(reqVal);
      if (
        allowed.some((a) => a.includes("legally concluded") || a === "yes")
      ) {
        return candConc === "yes" || candConc === "not applicable";
      }
      return allowed.includes(candConc);
    }

    default:
      return false;
  }
}

// ============================================================================
// 4. Area Compatibility & Preference Alignment Calculators
// Rules:
// - No preference = no negative scoring (1.0 credit or skipped from denominator)
// - Unanswered ordinary question = unknown, not incompatible
// ============================================================================

function scoreSingleFieldMatch(
  valA: string | null | undefined,
  valB: string | null | undefined,
  flexibleValues: string[] = ["flexible", "decide together", "adapt to circumstances", "depends"],
): number | null {
  if (isUnanswered(valA) || isUnanswered(valB)) {
    return null; // Unknown -> do not penalize
  }
  const a = valA!.trim().toLowerCase();
  const b = valB!.trim().toLowerCase();
  if (a === b) return 1.0;
  if (
    flexibleValues.some((f) => a.includes(f) || b.includes(f))
  ) {
    return 0.85;
  }
  return 0.25;
}

function scoreArrayOverlap(
  listA: string[] | null | undefined,
  listB: string[] | null | undefined,
  targetOverlap = 2,
): number | null {
  if (isUnanswered(listA) || isUnanswered(listB)) return null;
  const setA = new Set(normalizeStringList(listA));
  const setB = new Set(normalizeStringList(listB));
  if (setA.size === 0 || setB.size === 0) return null;

  let shared = 0;
  for (const item of setA) {
    if (setB.has(item)) shared += 1;
  }
  if (shared >= targetOverlap) return 1.0;
  if (shared === 1) return 0.7;
  return 0.3;
}

function averageKnownScores(scores: (number | null)[], fallback = 0.75): number {
  const valid = scores.filter((s): s is number => s !== null && !Number.isNaN(s));
  if (valid.length === 0) return fallback;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  return sum / valid.length;
}

/**
 * Area 1: Family & Future (Suggested Weight: 0.25)
 */
export function calculateFamilyFutureScore(
  a: CandidateBundle,
  b: CandidateBundle,
): number {
  const pa = a.profile;
  const pb = b.profile;

  const subScores: (number | null)[] = [
    scoreSingleFieldMatch(pa.wants_more_children, pb.wants_more_children, ["open to it", "unsure"]),
    scoreSingleFieldMatch(pa.blended_family_comfort, pb.blended_family_comfort, ["open to it", "very comfortable"]),
    scoreSingleFieldMatch(pa.step_parent_comfort, pb.step_parent_comfort, ["open to it", "comfortable", "very comfortable"]),
    scoreSingleFieldMatch(pa.extended_family_living, pb.extended_family_living, ["depends", "temporarily"]),
    scoreSingleFieldMatch(pa.extended_family_involvement, pb.extended_family_involvement, ["depends"]),
    scoreSingleFieldMatch(pa.work_family_balance, pb.work_family_balance),
    scoreSingleFieldMatch(pa.financial_management, pb.financial_management),
    scoreSingleFieldMatch(pa.household_responsibilities, pb.household_responsibilities),
    scoreSingleFieldMatch(pa.children_faith_upbringing, pb.children_faith_upbringing, ["shared faith", "decide together"]),
    scoreSingleFieldMatch(pa.relocation_willingness, pb.relocation_willingness, ["yes", "possibly", "within the uk"]),
    scoreSingleFieldMatch(pa.long_distance_consideration, pb.long_distance_consideration, ["yes", "maybe"]),
    scoreSingleFieldMatch(pa.ideal_living_environment, pb.ideal_living_environment, ["no preference"]),
    scoreArrayOverlap(pa.ideal_future_lifestyle, pb.ideal_future_lifestyle, 2),
  ];

  return averageKnownScores(subScores, 0.78);
}

/**
 * Area 2: Relationship Intention (Suggested Weight: 0.20)
 */
export function calculateRelationshipIntentionScore(
  a: CandidateBundle,
  b: CandidateBundle,
): number {
  const pa = a.profile;
  const pb = b.profile;

  const subScores: (number | null)[] = [
    scoreSingleFieldMatch(pa.looking_for_intention, pb.looking_for_intention, ["marriage"]),
    scoreSingleFieldMatch(pa.marriage_timeline, pb.marriage_timeline, ["no particular timeline"]),
    scoreSingleFieldMatch(pa.relationship_journey_stage, pb.relationship_journey_stage),
    scoreSingleFieldMatch(pa.introduce_partner_to_children, pb.introduce_partner_to_children, ["depends"]),
    scoreSingleFieldMatch(pa.discuss_marriage_early, pb.discuss_marriage_early),
    scoreSingleFieldMatch(pa.relationship_progression, pb.relationship_progression, ["no fixed approach"]),
    scoreSingleFieldMatch(pa.religious_ceremony_requirements, pb.religious_ceremony_requirements, ["open to discussing"]),
  ];

  return averageKnownScores(subScores, 0.8);
}

/**
 * Area 3: My Values (Suggested Weight: 0.20)
 */
export function calculateValuesScore(
  a: CandidateBundle,
  b: CandidateBundle,
): number {
  const pa = a.profile;
  const pb = b.profile;

  // How well B's top 5 values match A's 3 most important values in a partner
  let partnerValuesMatch: number | null = null;
  if (!isUnanswered(pa.partner_top_values) && !isUnanswered(pb.my_top_values)) {
    const wantedByA = normalizeStringList(pa.partner_top_values);
    const heldByB = new Set(normalizeStringList(pb.my_top_values));
    if (wantedByA.length > 0 && heldByB.size > 0) {
      const hits = wantedByA.filter((v) => heldByB.has(v)).length;
      partnerValuesMatch = Math.min(1.0, 0.4 + (hits / Math.min(3, wantedByA.length)) * 0.6);
    }
  }

  const subScores: (number | null)[] = [
    scoreArrayOverlap(pa.my_top_values, pb.my_top_values, 2),
    partnerValuesMatch,
    scoreSingleFieldMatch(pa.family_importance, pb.family_importance),
    scoreSingleFieldMatch(pa.faith_importance, pb.faith_importance),
    scoreSingleFieldMatch(pa.life_outlook, pb.life_outlook, ["balance of traditional & modern"]),
    scoreSingleFieldMatch(pa.decision_making_style, pb.decision_making_style, ["depends on the decision"]),
    scoreSingleFieldMatch(pa.cultural_traditions_importance, pb.cultural_traditions_importance, ["flexible"]),
  ];

  return averageKnownScores(subScores, 0.8);
}

/**
 * Area 4: Dating as a Parent (Suggested Weight: 0.15)
 */
export function calculateDatingAsParentScore(
  a: CandidateBundle,
  b: CandidateBundle,
): number {
  const pa = a.profile;
  const pb = b.profile;

  // Cross-check A's expected partner child involvement with B's comfortable role with partner's children
  let roleAlignment: number | null = null;
  if (
    !isUnanswered(pa.expected_partner_child_involvement) &&
    !isUnanswered(pb.comfortable_role_with_partner_children)
  ) {
    const exp = pa.expected_partner_child_involvement!.toLowerCase();
    const role = pb.comfortable_role_with_partner_children!.toLowerCase();
    if (
      (exp.includes("parent together") && role.includes("parent together")) ||
      (exp.includes("supportive adult") && role.includes("supportive adult")) ||
      (exp.includes("gradual") && role.includes("gradual")) ||
      (exp.includes("separate") && role.includes("separate"))
    ) {
      roleAlignment = 1.0;
    } else {
      roleAlignment = 0.65;
    }
  }

  const subScores: (number | null)[] = [
    roleAlignment,
    scoreSingleFieldMatch(pa.usual_availability, pb.usual_availability, ["flexible"]),
    scoreSingleFieldMatch(pa.ideal_meeting_frequency, pb.ideal_meeting_frequency, ["flexible"]),
    scoreSingleFieldMatch(pa.date_travel_comfort, pb.date_travel_comfort, ["flexible", "more than 1 hour"]),
    scoreSingleFieldMatch(pa.preferred_first_date_style, pb.preferred_first_date_style, ["no preference"]),
  ];

  return averageKnownScores(subScores, 0.78);
}

/**
 * Area 5: Personality (Suggested Weight: 0.10)
 */
export function calculatePersonalityScore(
  a: CandidateBundle,
  b: CandidateBundle,
): number {
  const pa = a.profile;
  const pb = b.profile;

  const subScores: (number | null)[] = [
    scoreArrayOverlap(pa.personality_traits, pb.personality_traits, 2),
    scoreSingleFieldMatch(pa.perfect_weekend, pb.perfect_weekend, ["a mixture of home and going out"]),
    scoreSingleFieldMatch(pa.conflict_resolution_style, pb.conflict_resolution_style, ["find a compromise", "depends on the situation"]),
    scoreSingleFieldMatch(pa.planning_style, pb.planning_style, ["a bit of both"]),
    scoreSingleFieldMatch(pa.communication_preference, pb.communication_preference, ["a mixture"]),
    scoreArrayOverlap(pa.affection_styles, pb.affection_styles, 1),
  ];

  return averageKnownScores(subScores, 0.76);
}

/**
 * Area 6: Lifestyle & Preferences Compatibility (Suggested Weight: 0.10)
 * Evaluates how well candidate B aligns with user A's "WHAT I WANT" preferences.
 * Strict rule: No preference = no negative scoring!
 * Unanswered ordinary field on B = unknown (null), not incompatible!
 */
export function calculateDirectionalPreferenceScore(
  a: CandidateBundle,
  b: CandidateBundle,
): number {
  const pref = a.preferences;
  const pb = b.profile;
  const checks: (number | null)[] = [];

  // 1. Age preference
  if (pref.preferred_age_min || pref.preferred_age_max) {
    if (!isUnanswered(pb.dob)) {
      const ageB = calculateAgeFromDob(pb.dob);
      const min = pref.preferred_age_min ?? 18;
      const max = pref.preferred_age_max ?? 99;
      if (ageB >= min && ageB <= max) {
        checks.push(1.0);
      } else {
        const diff = ageB < min ? min - ageB : ageB - max;
        checks.push(Math.max(0.2, 1.0 - diff * 0.12));
      }
    }
  } else {
    checks.push(1.0); // No preference = no negative scoring
  }

  // 2. Height preference
  if (pref.preferred_height_min_cm || pref.preferred_height_max_cm) {
    if (pb.height_cm) {
      const minH = pref.preferred_height_min_cm ?? 140;
      const maxH = pref.preferred_height_max_cm ?? 220;
      checks.push(pb.height_cm >= minH && pb.height_cm <= maxH ? 1.0 : 0.45);
    }
  }

  // 3. Religion preference
  if (!isNoPreference(pref.preferred_religions)) {
    if (!isUnanswered(pb.religion)) {
      const allowed = normalizeStringList(pref.preferred_religions);
      const candRel = pb.religion!.trim().toLowerCase();
      checks.push(
        allowed.some((r) => candRel === r || candRel.includes(r) || r.includes(candRel))
          ? 1.0
          : 0.15,
      );
    }
  } else {
    checks.push(1.0);
  }

  // 4. Religious denomination preference
  if (!isNoPreference(pref.preferred_denominations)) {
    if (!isUnanswered(pb.religious_denomination)) {
      const allowed = normalizeStringList(pref.preferred_denominations);
      const candDenom = pb.religious_denomination!.trim().toLowerCase();
      checks.push(
        allowed.some((d) => candDenom === d || candDenom.includes(d) || d.includes(candDenom))
          ? 1.0
          : 0.4,
      );
    }
  }

  // 5. Smoking preference
  if (!isNoPreference(pref.preferred_smoking)) {
    if (!isUnanswered(pb.smoking)) {
      checks.push(
        pb.smoking!.trim().toLowerCase() === pref.preferred_smoking!.trim().toLowerCase()
          ? 1.0
          : 0.2,
      );
    }
  } else {
    checks.push(1.0);
  }

  // 6. Alcohol preference
  if (!isNoPreference(pref.preferred_alcohol)) {
    if (!isUnanswered(pb.alcohol)) {
      checks.push(
        pb.alcohol!.trim().toLowerCase() === pref.preferred_alcohol!.trim().toLowerCase()
          ? 1.0
          : 0.2,
      );
    }
  } else {
    checks.push(1.0);
  }

  // 7. Hijab / Facial hair preference
  if (pb.gender === "Female" && !isNoPreference(pref.preferred_hijab)) {
    if (!isUnanswered(pb.hijab_preference)) {
      const allowed = normalizeStringList(pref.preferred_hijab);
      const candH = pb.hijab_preference!.trim().toLowerCase();
      checks.push(
        allowed.some(
          (h) =>
            candH === h ||
            candH.includes(h) ||
            (h === "regularly" &&
              (candH.includes("always") || candH.includes("most of the time"))),
        )
          ? 1.0
          : 0.3,
      );
    }
  }

  if (pb.gender === "Male" && !isNoPreference(pref.preferred_facial_hair)) {
    if (!isUnanswered(pb.facial_hair)) {
      const allowed = normalizeStringList(pref.preferred_facial_hair);
      const candF = pb.facial_hair!.trim().toLowerCase();
      checks.push(allowed.includes(candF) ? 1.0 : 0.4);
    }
  }

  // 8. Education preference
  if (!isNoPreference(pref.preferred_education)) {
    if (!isUnanswered(pb.education_level)) {
      checks.push(
        pb.education_level!.trim().toLowerCase() ===
          pref.preferred_education!.trim().toLowerCase()
          ? 1.0
          : 0.5,
      );
    }
  }

  // 9. Partner has children preference
  if (!isNoPreference(pref.partner_has_children_pref)) {
    const pStr = pref.partner_has_children_pref!.trim().toLowerCase();
    const candHas =
      Boolean(pb.has_children) ||
      (Boolean(pb.children_count) && pb.children_count !== "None");
    if (pStr.includes("with children") && !pStr.includes("without")) {
      checks.push(candHas ? 1.0 : 0.4);
    } else if (pStr.includes("without children")) {
      checks.push(!candHas ? 1.0 : 0.4);
    } else {
      checks.push(1.0);
    }
  }

  return averageKnownScores(checks, 0.85);
}

// ============================================================================
// 5. Complete Mutual Compatibility Engine (Step-by-Step per Section 8.D)
// ============================================================================

export function evaluatePairCompatibility(
  userA: CandidateBundle,
  userB: CandidateBundle,
  weights: CompatibilityWeights = DEFAULT_COMPATIBILITY_WEIGHTS,
  locationRestriction?: {
    enabled?: boolean;
    allowed_postcode_prefixes?: string[];
  },
): PairEvaluationResult {
  // 1. Opposite gender check for Islamic matrimony
  if (userA.profile.gender === userB.profile.gender) {
    return {
      userAId: userA.userId,
      userBId: userB.userId,
      isMutuallyEligible: false,
      aMeetsBDealbreakers: false,
      bMeetsADealbreakers: false,
      failedDealbreakersForA: [],
      failedDealbreakersForB: [],
      locationEligible: true,
      exclusionReasonCode: "SAME_GENDER",
      scoreAToB: 0,
      scoreBToA: 0,
      mutualScore: 0,
      areaBreakdown: {
        family_future: 0,
        relationship_intention: 0,
        my_values: 0,
        dating_as_parent: 0,
        personality: 0,
        lifestyle_preferences: 0,
      },
      matchReasons: [],
    };
  }

  // 2. Check postcode-based location restrictions
  let locationEligible = true;
  if (locationRestriction?.enabled) {
    if (!userA.profile.postcode_verified || !userB.profile.postcode_verified) {
      locationEligible = false;
    }
    const prefixes = locationRestriction.allowed_postcode_prefixes || [];
    if (prefixes.length > 0) {
      const aMatch = prefixes.some((p) =>
        userA.profile.postcode_area?.toUpperCase().startsWith(p.toUpperCase()),
      );
      const bMatch = prefixes.some((p) =>
        userB.profile.postcode_area?.toUpperCase().startsWith(p.toUpperCase()),
      );
      if (!aMatch || !bMatch) {
        locationEligible = false;
      }
    }
  }

  // 3. Apply both users' dealbreakers (WHAT I REQUIRE)
  const failedDealbreakersForA: string[] = [];
  for (const dbA of userA.dealbreakers) {
    if (!checkSingleDealbreaker(dbA, userA, userB)) {
      failedDealbreakersForA.push(dbA.dealbreaker_code);
    }
  }

  const failedDealbreakersForB: string[] = [];
  for (const dbB of userB.dealbreakers) {
    if (!checkSingleDealbreaker(dbB, userB, userA)) {
      failedDealbreakersForB.push(dbB.dealbreaker_code);
    }
  }

  const bMeetsADealbreakers = failedDealbreakersForA.length === 0;
  const aMeetsBDealbreakers = failedDealbreakersForB.length === 0;
  const isMutuallyEligible =
    locationEligible && bMeetsADealbreakers && aMeetsBDealbreakers;

  // 4. Calculate compatibility across the 6 workbook areas
  const familyFuture = calculateFamilyFutureScore(userA, userB);
  const relationshipIntention = calculateRelationshipIntentionScore(userA, userB);
  const myValues = calculateValuesScore(userA, userB);
  const datingAsParent = calculateDatingAsParentScore(userA, userB);
  const personality = calculatePersonalityScore(userA, userB);

  const prefAToB = calculateDirectionalPreferenceScore(userA, userB);
  const prefBToA = calculateDirectionalPreferenceScore(userB, userA);
  const mutualPref = (prefAToB + prefBToA) / 2;

  const baseWeighted =
    familyFuture * weights.family_future +
    relationshipIntention * weights.relationship_intention +
    myValues * weights.my_values +
    datingAsParent * weights.dating_as_parent +
    personality * weights.personality;

  const rawScoreAToB = Math.round((baseWeighted + prefAToB * weights.lifestyle_preferences) * 100);
  const rawScoreBToA = Math.round((baseWeighted + prefBToA * weights.lifestyle_preferences) * 100);
  const rawMutualScore = Math.round((baseWeighted + mutualPref * weights.lifestyle_preferences) * 100);

  const areaBreakdown: CompatibilityAreaBreakdown = {
    family_future: Math.round(familyFuture * 100),
    relationship_intention: Math.round(relationshipIntention * 100),
    my_values: Math.round(myValues * 100),
    dating_as_parent: Math.round(datingAsParent * 100),
    personality: Math.round(personality * 100),
    lifestyle_preferences: Math.round(mutualPref * 100),
  };

  // Generate safe, meaningful compatibility reasons without leaking private dealbreakers
  const matchReasons: string[] = [];
  if (areaBreakdown.my_values >= 80) {
    matchReasons.push("Similar family and faith values");
  }
  if (areaBreakdown.relationship_intention >= 80) {
    matchReasons.push("Aligned marriage intentions and timeline");
  }
  if (areaBreakdown.family_future >= 78) {
    matchReasons.push("Compatible blended family and future household vision");
  }
  if (areaBreakdown.dating_as_parent >= 75) {
    matchReasons.push("Harmonious parenting and meeting expectations");
  }
  if (areaBreakdown.lifestyle_preferences >= 80) {
    matchReasons.push("Compatible lifestyle and partner preferences");
  }
  if (matchReasons.length === 0) {
    matchReasons.push("Mutually eligible across core relationship criteria");
  }

  let exclusionReasonCode: string | null = null;
  if (!locationEligible) {
    exclusionReasonCode = "LOCATION_RESTRICTED";
  } else if (!bMeetsADealbreakers && !aMeetsBDealbreakers) {
    exclusionReasonCode = "BOTH_DEALBREAKERS_FAILED";
  } else if (!bMeetsADealbreakers) {
    exclusionReasonCode = "CANDIDATE_FAILED_USER_DEALBREAKER";
  } else if (!aMeetsBDealbreakers) {
    exclusionReasonCode = "USER_FAILED_CANDIDATE_DEALBREAKER";
  }

  return {
    userAId: userA.userId,
    userBId: userB.userId,
    isMutuallyEligible,
    aMeetsBDealbreakers,
    bMeetsADealbreakers,
    failedDealbreakersForA,
    failedDealbreakersForB,
    locationEligible,
    exclusionReasonCode,
    scoreAToB: Math.min(100, Math.max(0, rawScoreAToB)),
    scoreBToA: Math.min(100, Math.max(0, rawScoreBToA)),
    mutualScore: Math.min(100, Math.max(0, rawMutualScore)),
    areaBreakdown,
    matchReasons: matchReasons.slice(0, 4),
  };
}

// ============================================================================
// 6. Deterministic Gale-Shapley Deferred Acceptance Algorithm
// ============================================================================

export function runGaleShapleyAlgorithm(
  proposers: CandidateBundle[],
  receivers: CandidateBundle[],
  pairEvaluations: Map<string, PairEvaluationResult>,
): GaleShapleyResult {
  const pairKey = (aId: string, bId: string) => `${aId}::${bId}`;

  // Sort proposers and receivers deterministically by userId
  const sortedProposers = [...proposers].sort((a, b) =>
    a.userId.localeCompare(b.userId),
  );
  const sortedReceivers = [...receivers].sort((a, b) =>
    a.userId.localeCompare(b.userId),
  );

  const proposerPreferences: Record<string, string[]> = {};
  for (const p of sortedProposers) {
    const eligibleCandidates: { receiverId: string; score: number; mutual: number }[] = [];
    for (const r of sortedReceivers) {
      const ev = pairEvaluations.get(pairKey(p.userId, r.userId));
      // Enforce mandatory mutual eligibility BEFORE preference ranking!
      if (ev && ev.isMutuallyEligible) {
        eligibleCandidates.push({
          receiverId: r.userId,
          score: ev.scoreAToB,
          mutual: ev.mutualScore,
        });
      }
    }
    eligibleCandidates.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.mutual !== left.mutual) return right.mutual - left.mutual;
      return left.receiverId.localeCompare(right.receiverId);
    });
    proposerPreferences[p.userId] = eligibleCandidates.map((c) => c.receiverId);
  }

  const receiverPreferences: Record<string, string[]> = {};
  const receiverRankMap: Record<string, Record<string, number>> = {};

  for (const r of sortedReceivers) {
    const eligibleProposers: { proposerId: string; score: number; mutual: number }[] = [];
    for (const p of sortedProposers) {
      const ev = pairEvaluations.get(pairKey(p.userId, r.userId));
      if (ev && ev.isMutuallyEligible) {
        eligibleProposers.push({
          proposerId: p.userId,
          score: ev.scoreBToA,
          mutual: ev.mutualScore,
        });
      }
    }
    eligibleProposers.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.mutual !== left.mutual) return right.mutual - left.mutual;
      return left.proposerId.localeCompare(right.proposerId);
    });
    const rankedIds = eligibleProposers.map((c) => c.proposerId);
    receiverPreferences[r.userId] = rankedIds;

    const rankLookup: Record<string, number> = {};
    rankedIds.forEach((pId, idx) => {
      rankLookup[pId] = idx;
    });
    receiverRankMap[r.userId] = rankLookup;
  }

  // Deferred Acceptance State
  const nextProposalIndex: Record<string, number> = {};
  const proposerEngagedTo: Record<string, string | null> = {};
  const receiverEngagedTo: Record<string, string | null> = {};

  for (const p of sortedProposers) {
    nextProposalIndex[p.userId] = 0;
    proposerEngagedTo[p.userId] = null;
  }
  for (const r of sortedReceivers) {
    receiverEngagedTo[r.userId] = null;
  }

  const freeProposersQueue: string[] = sortedProposers
    .filter((p) => (proposerPreferences[p.userId]?.length || 0) > 0)
    .map((p) => p.userId);

  let proposalsCount = 0;

  while (freeProposersQueue.length > 0) {
    const proposerId = freeProposersQueue.shift()!;
    const prefList = proposerPreferences[proposerId] || [];
    const idx = nextProposalIndex[proposerId] ?? 0;

    if (idx >= prefList.length) {
      continue; // Exhausted all acceptable candidates
    }

    const receiverId = prefList[idx];
    nextProposalIndex[proposerId] = idx + 1;
    proposalsCount += 1;

    // Receiver must also consider proposer acceptable
    const newProposerRank = receiverRankMap[receiverId]?.[proposerId];
    if (newProposerRank === undefined) {
      freeProposersQueue.push(proposerId);
      continue;
    }

    const currentPartnerId = receiverEngagedTo[receiverId];
    if (currentPartnerId === null) {
      // Receiver is free -> tentatively accept proposal
      receiverEngagedTo[receiverId] = proposerId;
      proposerEngagedTo[proposerId] = receiverId;
    } else {
      const currentPartnerRank =
        receiverRankMap[receiverId]?.[currentPartnerId] ?? Number.MAX_SAFE_INTEGER;
      if (newProposerRank < currentPartnerRank) {
        // Receiver strictly prefers new proposer over current fiancé
        receiverEngagedTo[receiverId] = proposerId;
        proposerEngagedTo[proposerId] = receiverId;
        proposerEngagedTo[currentPartnerId] = null;
        if (
          (nextProposalIndex[currentPartnerId] ?? 0) <
          (proposerPreferences[currentPartnerId]?.length || 0)
        ) {
          freeProposersQueue.push(currentPartnerId);
        }
      } else {
        // Receiver rejects new proposer; proposer remains free if choices remain
        if (nextProposalIndex[proposerId] < prefList.length) {
          freeProposersQueue.push(proposerId);
        }
      }
    }
  }

  const allocations: GaleShapleyAllocation[] = [];
  for (const p of sortedProposers) {
    const matchedReceiverId = proposerEngagedTo[p.userId];
    if (!matchedReceiverId) continue;
    const ev = pairEvaluations.get(pairKey(p.userId, matchedReceiverId));
    if (!ev) continue;
    allocations.push({
      proposerId: p.userId,
      receiverId: matchedReceiverId,
      scoreProposerToReceiver: ev.scoreAToB,
      scoreReceiverToProposer: ev.scoreBToA,
      mutualScore: ev.mutualScore,
    });
  }

  const blockingPairsCount = countBlockingPairs(
    proposerPreferences,
    receiverPreferences,
    proposerEngagedTo,
    receiverEngagedTo,
  );

  return {
    allocations,
    proposerPreferences,
    receiverPreferences,
    blockingPairsCount,
    proposalsCount,
  };
}

/**
 * Verifies stability of a Gale-Shapley matching allocation.
 * A blocking pair (p, r) exists if:
 * 1. p and r are mutually acceptable (in each other's preference lists)
 * 2. p is either unmatched or prefers r over p's assigned partner
 * 3. r is either unmatched or prefers p over r's assigned partner
 */
export function countBlockingPairs(
  proposerPreferences: Record<string, string[]>,
  receiverPreferences: Record<string, string[]>,
  proposerEngagedTo: Record<string, string | null>,
  receiverEngagedTo: Record<string, string | null>,
): number {
  let blockingCount = 0;

  for (const [pId, pList] of Object.entries(proposerPreferences)) {
    const currentReceiver = proposerEngagedTo[pId];
    const currentReceiverRank =
      currentReceiver !== null && currentReceiver !== undefined
        ? pList.indexOf(currentReceiver)
        : Number.MAX_SAFE_INTEGER;

    // Every receiver ranked higher than currentReceiver (index < currentReceiverRank)
    for (let i = 0; i < pList.length && i < currentReceiverRank; i += 1) {
      const candidateR = pList[i];
      const rList = receiverPreferences[candidateR] || [];
      const pRankInR = rList.indexOf(pId);
      if (pRankInR === -1) continue;

      const rCurrentProposer = receiverEngagedTo[candidateR];
      const rCurrentRank =
        rCurrentProposer !== null && rCurrentProposer !== undefined
          ? rList.indexOf(rCurrentProposer)
          : Number.MAX_SAFE_INTEGER;

      if (pRankInR < rCurrentRank) {
        blockingCount += 1;
      }
    }
  }

  return blockingCount;
}

// ============================================================================
// 7. Database-Backed Matching Orchestration
// ============================================================================

export async function loadEligibleCandidatePool(): Promise<{
  candidates: CandidateBundle[];
  blockedPairs: Set<string>;
  weights: CompatibilityWeights;
  locationConfig: { enabled?: boolean; allowed_postcode_prefixes?: string[] };
}> {
  const sb = createAdminSupabaseClient();

  const [
    { data: users },
    { data: profiles },
    { data: preferences },
    { data: dealbreakers },
    { data: photos },
    { data: blocks },
    { data: settingsRows },
  ] = await Promise.all([
    sb
      .from("users")
      .select("id, first_name, username, id_verified, account_status")
      .eq("account_status", "active"),
    sb
      .from("user_profiles")
      .select("*")
      .eq("is_published", true)
      .eq("moderation_status", "approved"),
    sb.from("user_preferences").select("*"),
    sb.from("user_dealbreakers").select("*"),
    sb
      .from("profile_photographs")
      .select("id, user_id, url, is_primary, sort_order")
      .eq("moderation_status", "approved")
      .order("sort_order", { ascending: true }),
    sb.from("blocked_users").select("blocker_id, blocked_id"),
    sb
      .from("cms_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["matching_weights", "location_restrictions"]),
  ]);

  const userMap = new Map((users || []).map((u) => [u.id, u]));
  const prefMap = new Map((preferences || []).map((p) => [p.user_id, p]));
  const dbMap = new Map<string, UserDealbreakerRecord[]>();
  for (const d of dealbreakers || []) {
    const arr = dbMap.get(d.user_id) || [];
    arr.push(d as UserDealbreakerRecord);
    dbMap.set(d.user_id, arr);
  }

  const photoMap = new Map<
    string,
    { id: string; url: string; is_primary: boolean }[]
  >();
  for (const ph of photos || []) {
    const arr = photoMap.get(ph.user_id) || [];
    arr.push({ id: ph.id, url: ph.url, is_primary: ph.is_primary });
    photoMap.set(ph.user_id, arr);
  }

  const blockedPairs = new Set<string>();
  for (const b of blocks || []) {
    blockedPairs.add(`${b.blocker_id}::${b.blocked_id}`);
    blockedPairs.add(`${b.blocked_id}::${b.blocker_id}`);
  }

  let weights: CompatibilityWeights = { ...DEFAULT_COMPATIBILITY_WEIGHTS };
  let locationConfig: { enabled?: boolean; allowed_postcode_prefixes?: string[] } = {
    enabled: true,
    allowed_postcode_prefixes: [],
  };

  for (const s of settingsRows || []) {
    if (s.setting_key === "matching_weights" && s.setting_value) {
      const v = s.setting_value as Record<string, unknown>;
      weights = {
        family_future: Number(v.family_future ?? 0.25),
        relationship_intention: Number(v.relationship_intention ?? 0.2),
        my_values: Number(v.my_values ?? 0.2),
        dating_as_parent: Number(v.dating_as_parent ?? 0.15),
        personality: Number(v.personality ?? 0.1),
        lifestyle_preferences: Number(v.lifestyle_preferences ?? 0.1),
      };
    }
    if (s.setting_key === "location_restrictions" && s.setting_value) {
      locationConfig = s.setting_value as {
        enabled?: boolean;
        allowed_postcode_prefixes?: string[];
      };
    }
  }

  const candidates: CandidateBundle[] = [];
  for (const prof of profiles || []) {
    const u = userMap.get(prof.user_id);
    if (!u) continue;
    candidates.push({
      userId: u.id,
      firstName: u.first_name,
      username: u.username,
      idVerified: Boolean(u.id_verified),
      accountStatus: u.account_status,
      profile: prof as UserProfileRecord,
      preferences: (prefMap.get(u.id) || {}) as Partial<UserPreferencesRecord>,
      dealbreakers: dbMap.get(u.id) || [],
      photos: photoMap.get(u.id) || [],
    });
  }

  return { candidates, blockedPairs, weights, locationConfig };
}

export async function executeBatchMatchingRun(
  runType: "on-demand" | "batch" | "admin_triggered" | "profile_updated" = "on-demand",
  triggeredBy?: string | null,
) {
  const startTime = Date.now();
  const sb = createAdminSupabaseClient();

  const { candidates, blockedPairs, weights, locationConfig } =
    await loadEligibleCandidatePool();

  const { data: runRow } = await sb
    .from("matching_runs")
    .insert({
      run_type: runType,
      triggered_by: triggeredBy || null,
      status: "running",
      total_users: candidates.length,
      weights_snapshot: weights,
    })
    .select("id")
    .single();

  const runId = runRow?.id;

  const proposers = candidates.filter((c) => c.profile.gender === "Male");
  const receivers = candidates.filter((c) => c.profile.gender === "Female");

  const pairEvaluations = new Map<string, PairEvaluationResult>();
  const scoreRowsToUpsert: Record<string, unknown>[] = [];
  let eligiblePairsCount = 0;

  for (const p of proposers) {
    for (const r of receivers) {
      const isBlocked =
        blockedPairs.has(`${p.userId}::${r.userId}`) ||
        blockedPairs.has(`${r.userId}::${p.userId}`);

      let ev: PairEvaluationResult;
      if (isBlocked) {
        ev = {
          userAId: p.userId,
          userBId: r.userId,
          isMutuallyEligible: false,
          aMeetsBDealbreakers: false,
          bMeetsADealbreakers: false,
          failedDealbreakersForA: [],
          failedDealbreakersForB: [],
          locationEligible: true,
          exclusionReasonCode: "BLOCKED_USER",
          scoreAToB: 0,
          scoreBToA: 0,
          mutualScore: 0,
          areaBreakdown: {
            family_future: 0,
            relationship_intention: 0,
            my_values: 0,
            dating_as_parent: 0,
            personality: 0,
            lifestyle_preferences: 0,
          },
          matchReasons: [],
        };
      } else {
        ev = evaluatePairCompatibility(p, r, weights, locationConfig);
      }

      pairEvaluations.set(`${p.userId}::${r.userId}`, ev);
      if (ev.isMutuallyEligible) eligiblePairsCount += 1;

      scoreRowsToUpsert.push({
        user_a_id: p.userId,
        user_b_id: r.userId,
        is_mutually_eligible: ev.isMutuallyEligible,
        a_meets_b_dealbreakers: ev.aMeetsBDealbreakers,
        b_meets_a_dealbreakers: ev.bMeetsADealbreakers,
        location_eligible: ev.locationEligible,
        exclusion_reason_code: ev.exclusionReasonCode,
        score_a_to_b: ev.scoreAToB,
        score_b_to_a: ev.scoreBToA,
        mutual_score: ev.mutualScore,
        area_breakdown: ev.areaBreakdown,
        match_reasons: ev.matchReasons,
        calculated_at: new Date().toISOString(),
      });
    }
  }

  if (scoreRowsToUpsert.length > 0) {
    await sb
      .from("compatibility_scores")
      .upsert(scoreRowsToUpsert, { onConflict: "user_a_id,user_b_id" });
  }

  // Run Gale-Shapley Stable Matching
  const gsResult = runGaleShapleyAlgorithm(proposers, receivers, pairEvaluations);
  const optimalPairSet = new Set(
    gsResult.allocations.flatMap((a) => [
      `${a.proposerId}::${a.receiverId}`,
      `${a.receiverId}::${a.proposerId}`,
    ]),
  );

  // Build ranked recommendations for each user (Gale-Shapley optimal match ranked #1, followed by ranked eligible matches)
  const recommendationRows: Record<string, unknown>[] = [];

  for (const p of proposers) {
    const rankedReceivers = gsResult.proposerPreferences[p.userId] || [];
    // Place Gale-Shapley partner at position 1 if matched, then remaining ranked eligible candidates
    const ordered = [...rankedReceivers].sort((rA, rB) => {
      const aOpt = optimalPairSet.has(`${p.userId}::${rA}`) ? 1 : 0;
      const bOpt = optimalPairSet.has(`${p.userId}::${rB}`) ? 1 : 0;
      if (bOpt !== aOpt) return bOpt - aOpt;
      return rankedReceivers.indexOf(rA) - rankedReceivers.indexOf(rB);
    });

    ordered.forEach((rId, idx) => {
      const ev = pairEvaluations.get(`${p.userId}::${rId}`)!;
      recommendationRows.push({
        run_id: runId || null,
        user_id: p.userId,
        matched_user_id: rId,
        is_gale_shapley_optimal: optimalPairSet.has(`${p.userId}::${rId}`),
        rank_position: idx + 1,
        mutual_score: ev.mutualScore,
        score_user_to_match: ev.scoreAToB,
        score_match_to_user: ev.scoreBToA,
        area_breakdown: ev.areaBreakdown,
        match_reasons: ev.matchReasons,
        status: "active",
      });
    });
  }

  for (const r of receivers) {
    const rankedProposers = gsResult.receiverPreferences[r.userId] || [];
    const ordered = [...rankedProposers].sort((pA, pB) => {
      const aOpt = optimalPairSet.has(`${pA}::${r.userId}`) ? 1 : 0;
      const bOpt = optimalPairSet.has(`${pB}::${r.userId}`) ? 1 : 0;
      if (bOpt !== aOpt) return bOpt - aOpt;
      return rankedProposers.indexOf(pA) - rankedProposers.indexOf(pB);
    });

    ordered.forEach((pId, idx) => {
      const ev = pairEvaluations.get(`${pId}::${r.userId}`)!;
      recommendationRows.push({
        run_id: runId || null,
        user_id: r.userId,
        matched_user_id: pId,
        is_gale_shapley_optimal: optimalPairSet.has(`${pId}::${r.userId}`),
        rank_position: idx + 1,
        mutual_score: ev.mutualScore,
        score_user_to_match: ev.scoreBToA,
        score_match_to_user: ev.scoreAToB,
        area_breakdown: ev.areaBreakdown,
        match_reasons: ev.matchReasons,
        status: "active",
      });
    });
  }

  // Replace active recommendations
  await sb.from("match_recommendations").delete().neq("status", "___never___");
  if (recommendationRows.length > 0) {
    await sb
      .from("match_recommendations")
      .upsert(recommendationRows, { onConflict: "user_id,matched_user_id" });
  }

  const executionTimeMs = Date.now() - startTime;
  if (runId) {
    await sb
      .from("matching_runs")
      .update({
        status: "completed",
        eligible_pairs_count: eligiblePairsCount,
        stable_matches_count: gsResult.allocations.length,
        blocking_pairs_count: gsResult.blockingPairsCount,
        execution_time_ms: executionTimeMs,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);
  }

  await recordAuditLog({
    actorId: triggeredBy || null,
    category: "matching",
    action: "matching.gale_shapley_completed",
    resourceType: "matching_run",
    resourceId: runId,
    details: {
      runType,
      totalUsers: candidates.length,
      eligiblePairsCount,
      stableMatchesCount: gsResult.allocations.length,
      blockingPairsCount: gsResult.blockingPairsCount,
      executionTimeMs,
    },
  });

  return {
    runId,
    totalUsers: candidates.length,
    eligiblePairsCount,
    stableMatchesCount: gsResult.allocations.length,
    blockingPairsCount: gsResult.blockingPairsCount,
    allocations: gsResult.allocations,
    executionTimeMs,
  };
}
