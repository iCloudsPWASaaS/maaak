import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  generateOtpCode,
  hashPassword,
  signJwt,
  verifyJwt,
  verifyPassword,
} from "../lib/jwt";
import {
  buildDiditCanonicalJson,
  verifyDiditWebhookSignature,
} from "../services/verification-service";

const jwtPayload = {
  sub: "user-1",
  user_id: "user-1",
  email: "member@maaak.co.uk",
  username: "member",
  app_role: "user" as const,
  type: "access" as const,
};

test("JWT signing and verification round-trip", () => {
  const token = signJwt(jwtPayload, 3600);
  const decoded = verifyJwt(token);

  assert.ok(decoded);
  assert.equal(decoded.user_id, "user-1");
  assert.equal(decoded.app_role, "user");
  assert.equal(decoded.type, "access");
});

test("tampered and expired JWTs are rejected", () => {
  const token = signJwt(jwtPayload, 3600);
  const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
  assert.equal(verifyJwt(tampered), null);
  assert.equal(verifyJwt(signJwt(jwtPayload, -10)), null);
  assert.equal(verifyJwt("not.a.jwt"), null);
});

test("passwords use salted scrypt hashes and verify safely", () => {
  const hash = hashPassword("MaaakSecurePass2026!");
  assert.ok(hash.startsWith("scrypt:"));
  assert.equal(verifyPassword("MaaakSecurePass2026!", hash), true);
  assert.equal(verifyPassword("WrongPassword", hash), false);
  assert.notEqual(hashPassword("MaaakSecurePass2026!"), hash);
});

test("OTP codes are always six digits", () => {
  for (let i = 0; i < 20; i += 1) {
    assert.match(generateOtpCode(), /^\d{6}$/);
  }
});

test("Didit canonical JSON normalizes key order and whole floats", () => {
  assert.equal(
    buildDiditCanonicalJson({ b: 1, a: { z: 2.0, y: [3.0, 2] } }),
    '{"a":{"y":[3,2],"z":2},"b":1}',
  );
});

test("Didit webhook signatures are verified against canonical JSON and timestamp window", () => {
  const secret = "test-didit-webhook-secret";
  const rawBody = JSON.stringify({ status: "approved", session_id: "session-1" });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const canonical = buildDiditCanonicalJson(JSON.parse(rawBody));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(canonical, "utf8")
    .digest("hex");

  assert.equal(
    verifyDiditWebhookSignature({ rawBody, signature, timestamp, secret }),
    true,
  );
  assert.equal(
    verifyDiditWebhookSignature({
      rawBody,
      signature: `sha256=${signature}`,
      timestamp,
      secret,
    }),
    true,
  );
  assert.equal(
    verifyDiditWebhookSignature({ rawBody, signature: "deadbeef", timestamp, secret }),
    false,
  );
  assert.equal(
    verifyDiditWebhookSignature({
      rawBody,
      signature,
      timestamp: String(Number(timestamp) - 900),
      secret,
    }),
    false,
  );
});
