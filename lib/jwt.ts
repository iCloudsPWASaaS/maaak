import crypto from "node:crypto";
import type { UserRole } from "@/types";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SUPABASE_SECRET_KEY ||
  "maaak-matrimony-jwt-secret-key-2026";

export interface JwtPayload {
  sub: string;
  user_id: string;
  email: string;
  username: string;
  app_role: UserRole;
  type: "access" | "refresh";
  iat: number;
  exp: number;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): string {
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf8");
}

export function signJwt(
  payload: Omit<JwtPayload, "iat" | "exp">,
  expiresInSeconds = 3600,
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerSegment = base64UrlEncode(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  );
  const payloadSegment = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(signingInput)
    .digest();
  const signatureSegment = base64UrlEncode(signature);

  return `${signingInput}.${signatureSegment}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerSeg, payloadSeg, sigSeg] = parts;
    const signingInput = `${headerSeg}.${payloadSeg}`;
    const expectedSig = base64UrlEncode(
      crypto.createHmac("sha256", JWT_SECRET).update(signingInput).digest(),
    );

    const a = Buffer.from(sigSeg);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const decoded = JSON.parse(base64UrlDecode(payloadSeg)) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!decoded.exp || decoded.exp < now) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash.startsWith("scrypt:")) return false;
    const [, salt, hashHex] = storedHash.split(":");
    if (!salt || !hashHex) return false;
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hashHex, "hex");
    return (
      derived.length === expected.length &&
      crypto.timingSafeEqual(derived, expected)
    );
  } catch {
    return false;
  }
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateOtpCode(digits = 6): string {
  const max = 10 ** digits;
  const min = 10 ** (digits - 1);
  return String(crypto.randomInt(min, max));
}
