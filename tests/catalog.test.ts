import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_COMPATIBILITY_WEIGHTS,
  SUPPORTED_DEALBREAKERS,
  WORKBOOK_QUESTIONS,
} from "../lib/workbook-catalog";

test("workbook catalog contains every seeded profile question", () => {
  assert.equal(WORKBOOK_QUESTIONS.length, 66);

  const codes = WORKBOOK_QUESTIONS.map((question) => question.code);
  assert.equal(new Set(codes).size, codes.length);

  for (const question of WORKBOOK_QUESTIONS) {
    assert.ok(question.code && question.questionText && question.worksheet);
    if (question.answerType === "single_select" || question.answerType === "multi_select") {
      assert.ok(question.options && question.options.length > 0);
    }
  }
});

test("supported dealbreakers are unique and capped by product rules", () => {
  const codes = SUPPORTED_DEALBREAKERS.map((item) => item.code);
  assert.equal(new Set(codes).size, codes.length);
  assert.ok(codes.length >= 5);

  for (const item of SUPPORTED_DEALBREAKERS) {
    assert.ok(item.code);
    assert.ok(item.label);
  }
});

test("default compatibility weights total exactly 100 percent", () => {
  const total = Object.values(DEFAULT_COMPATIBILITY_WEIGHTS).reduce(
    (sum, value) => sum + value,
    0,
  );
  assert.ok(Math.abs(total - 1) < 0.0001);
  assert.equal(DEFAULT_COMPATIBILITY_WEIGHTS.family_future, 0.25);
  assert.equal(DEFAULT_COMPATIBILITY_WEIGHTS.relationship_intention, 0.2);
  assert.equal(DEFAULT_COMPATIBILITY_WEIGHTS.my_values, 0.2);
  assert.equal(DEFAULT_COMPATIBILITY_WEIGHTS.dating_as_parent, 0.15);
  assert.equal(DEFAULT_COMPATIBILITY_WEIGHTS.personality, 0.1);
  assert.equal(DEFAULT_COMPATIBILITY_WEIGHTS.lifestyle_preferences, 0.1);
});
