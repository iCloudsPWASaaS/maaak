import test from "node:test";
import assert from "node:assert/strict";
import {
  checkSingleDealbreaker,
  countBlockingPairs,
  evaluatePairCompatibility,
  isNoPreference,
  isUnanswered,
  runGaleShapleyAlgorithm,
  validateDealbreakersInput,
  type CandidateBundle,
  type PairEvaluationResult,
} from "../services/matching-service";
import { SUPPORTED_DEALBREAKERS } from "../lib/workbook-catalog";
import type { UserDealbreakerRecord, UserProfileRecord } from "../types";

function makeProfile(overrides: Record<string, unknown> = {}): UserProfileRecord {
  return {
    id: "profile",
    user_id: "user",
    gender: "male",
    dob: "1990-05-01",
    city: "London",
    postcode_area: "SW1",
    postcode_verified: true,
    religion: "Islam",
    religious_practice: "Practising",
    smoking: "never",
    alcohol: "never",
    has_children: false,
    children_count: "0",
    latitude: 51.5,
    longitude: -0.12,
    ...overrides,
  } as unknown as UserProfileRecord;
}

function makeCandidate(
  userId: string,
  gender: "male" | "female",
  profileOverrides: Record<string, unknown> = {},
): CandidateBundle {
  return {
    userId,
    firstName: userId,
    username: userId,
    idVerified: false,
    accountStatus: "active",
    profile: makeProfile({ gender, ...profileOverrides }),
    preferences: {},
    dealbreakers: [],
    photos: [],
  };
}

function makeDealbreaker(
  code: string,
  requiredValue: unknown,
): UserDealbreakerRecord {
  return {
    user_id: "owner",
    dealbreaker_code: code,
    dealbreaker_label: code,
    required_value: requiredValue,
  };
}

function makeEvaluation(
  userAId: string,
  userBId: string,
  scoreAToB: number,
  scoreBToA: number,
  isMutuallyEligible = true,
): PairEvaluationResult {
  return {
    userAId,
    userBId,
    isMutuallyEligible,
    aMeetsBDealbreakers: isMutuallyEligible,
    bMeetsADealbreakers: isMutuallyEligible,
    failedDealbreakersForA: [],
    failedDealbreakersForB: [],
    locationEligible: true,
    exclusionReasonCode: isMutuallyEligible ? null : "DEALBREAKER_FAILED",
    scoreAToB,
    scoreBToA,
    mutualScore: Math.round((scoreAToB + scoreBToA) / 2),
    areaBreakdown: {
      family_future: 80,
      relationship_intention: 80,
      my_values: 80,
      dating_as_parent: 80,
      personality: 80,
      lifestyle_preferences: 80,
    },
    matchReasons: [],
  };
}

test("dealbreaker input enforces maximum five, supported codes, duplicates, and non-empty values", () => {
  const supportedCodes = SUPPORTED_DEALBREAKERS.slice(0, 5).map((d) => d.code);
  const valid = supportedCodes.map((dealbreaker_code) => ({
    dealbreaker_code,
    required_value: "Islam",
  }));
  assert.equal(validateDealbreakersInput(valid).valid, true);

  const tooMany = validateDealbreakersInput([
    ...valid,
    {
      dealbreaker_code: SUPPORTED_DEALBREAKERS[5].code,
      required_value: "Islam",
    },
  ]);
  assert.equal(tooMany.valid, false);
  assert.ok(tooMany.errors.some((e) => e.message.includes("maximum of 5")));

  const duplicate = validateDealbreakersInput([
    supportedCodes[0] && { dealbreaker_code: supportedCodes[0], required_value: "Islam" },
    supportedCodes[0] && { dealbreaker_code: supportedCodes[0], required_value: "Islam" },
  ].filter(Boolean) as { dealbreaker_code: string; required_value: unknown }[]);
  assert.equal(duplicate.valid, false);
  assert.ok(duplicate.errors.some((e) => e.message.includes("Duplicate")));

  const unsupported = validateDealbreakersInput([
    { dealbreaker_code: "not_a_real_code", required_value: "yes" },
  ]);
  assert.equal(unsupported.valid, false);
  assert.ok(unsupported.errors.some((e) => e.message.includes("Unsupported")));

  const empty = validateDealbreakersInput([
    { dealbreaker_code: supportedCodes[0], required_value: "" },
  ]);
  assert.equal(empty.valid, false);
  assert.ok(empty.errors.some((e) => e.message.includes("non-empty")));
});

test("unanswered and no-preference values follow the requirement semantics", () => {
  assert.equal(isUnanswered(null), true);
  assert.equal(isUnanswered(undefined), true);
  assert.equal(isUnanswered(""), true);
  assert.equal(isUnanswered("No preference"), false);
  assert.equal(isUnanswered("Prefer not to say"), true);
  assert.equal(isUnanswered("Practising"), false);

  assert.equal(isNoPreference("No preference"), true);
  assert.equal(isNoPreference("Anywhere in UK"), true);
  assert.equal(isNoPreference("Within 10 miles"), false);
});

test("dealbreaker checks reject unanswered candidate values and accept no-preference distance", () => {
  const owner = makeCandidate("m1", "male", { religion: "Islam" });
  const candidate = makeCandidate("f1", "female", { religion: "Islam" });
  const unanswered = makeCandidate("f2", "female", { religion: null });

  assert.equal(
    checkSingleDealbreaker(makeDealbreaker("religion", ["Islam"]), owner, candidate),
    true,
  );
  assert.equal(
    checkSingleDealbreaker(makeDealbreaker("religion", ["Islam"]), owner, unanswered),
    false,
  );
  assert.equal(
    checkSingleDealbreaker(makeDealbreaker("distance", "No preference"), owner, unanswered),
    true,
  );
});

test("pair evaluation excludes same-gender pairs and failed dealbreakers", () => {
  const maleOne = makeCandidate("m1", "male");
  const maleTwo = makeCandidate("m2", "male");
  const sameGender = evaluatePairCompatibility(maleOne, maleTwo);
  assert.equal(sameGender.isMutuallyEligible, false);
  assert.equal(sameGender.exclusionReasonCode, "SAME_GENDER");

  const femaleSmoker = makeCandidate("f1", "female", { smoking: "often" });
  maleOne.dealbreakers = [makeDealbreaker("smoking", ["non-smoker"])];

  const failedDealbreaker = evaluatePairCompatibility(maleOne, femaleSmoker);
  assert.equal(failedDealbreaker.isMutuallyEligible, false);
  assert.equal(failedDealbreaker.exclusionReasonCode, "CANDIDATE_FAILED_USER_DEALBREAKER");
  assert.deepEqual(failedDealbreaker.failedDealbreakersForA, ["smoking"]);
});

test("Gale-Shapley produces a stable allocation with zero blocking pairs", () => {
  const proposers = [
    makeCandidate("m1", "male"),
    makeCandidate("m2", "male"),
  ];
  const receivers = [
    makeCandidate("f1", "female"),
    makeCandidate("f2", "female"),
  ];

  const evaluations = new Map<string, PairEvaluationResult>();
  evaluations.set("m1::f1", makeEvaluation("m1", "f1", 90, 95));
  evaluations.set("m1::f2", makeEvaluation("m1", "f2", 80, 50));
  evaluations.set("m2::f1", makeEvaluation("m2", "f1", 85, 60));
  evaluations.set("m2::f2", makeEvaluation("m2", "f2", 70, 92));

  const result = runGaleShapleyAlgorithm(proposers, receivers, evaluations);
  const allocations = new Map(
    result.allocations.map((allocation) => [
      allocation.proposerId,
      allocation.receiverId,
    ]),
  );

  assert.equal(result.allocations.length, 2);
  assert.equal(allocations.get("m1"), "f1");
  assert.equal(allocations.get("m2"), "f2");
  assert.equal(result.blockingPairsCount, 0);
});

test("ineligible pairs are excluded from preference lists and allocations", () => {
  const proposer = makeCandidate("m1", "male");
  const eligibleReceiver = makeCandidate("f1", "female");
  const ineligibleReceiver = makeCandidate("f2", "female");

  const evaluations = new Map<string, PairEvaluationResult>();
  evaluations.set("m1::f1", makeEvaluation("m1", "f1", 90, 90));
  evaluations.set("m1::f2", makeEvaluation("m1", "f2", 99, 99, false));

  const result = runGaleShapleyAlgorithm(
    [proposer],
    [eligibleReceiver, ineligibleReceiver],
    evaluations,
  );

  assert.deepEqual(result.proposerPreferences.m1, ["f1"]);
  assert.equal(result.allocations.length, 1);
  assert.equal(result.allocations[0].receiverId, "f1");
});

test("countBlockingPairs reports unstable allocations", () => {
  const proposerPreferences = { m1: ["f2", "f1"], m2: ["f1", "f2"] };
  const receiverPreferences = { f1: ["m2", "m1"], f2: ["m1", "m2"] };
  const proposerEngagedTo = { m1: "f1", m2: "f2" };
  const receiverEngagedTo = { f1: "m1", f2: "m2" };

  assert.equal(
    countBlockingPairs(
      proposerPreferences,
      receiverPreferences,
      proposerEngagedTo,
      receiverEngagedTo,
    ),
    2,
  );
});
