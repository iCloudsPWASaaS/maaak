import {
  generateOtpCode,
  hashPassword,
  hashRefreshToken,
  signJwt,
  verifyJwt,
  verifyPassword,
} from "@/lib/jwt";
import { recordAuditLog } from "@/services/audit-service";
import { createAdminSupabaseClient } from "@/supabase/admin";
import type { AuthUser } from "@/types";

export interface RegisterUserInput {
  firstName: string;
  lastName: string;
  username: string;
  gender: "Male" | "Female";
  dob: string;
  email: string;
  mobileNumber: string;
  password: string;
  city: string;
  postcode: string;
  selectedPlan?: "free" | "premium";
  acceptTerms: boolean;
  acceptSubscriptionDisclosure: boolean;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
}

export function normalizeMobileNumber(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("07") && cleaned.length === 11) {
    return `+44${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("447") && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  return cleaned;
}

export function extractOutwardPostcode(postcode: string): string {
  const normalized = postcode.trim().toUpperCase().replace(/\s+/g, " ");
  const parts = normalized.split(" ");
  if (parts.length > 1) return parts[0];
  if (normalized.length > 3) return normalized.slice(0, normalized.length - 3).trim();
  return normalized;
}

export function calculateAgeFromDob(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const m = today.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export async function issueSessionTokens(
  user: AuthUser,
  meta?: { deviceType?: string; ipAddress?: string; userAgent?: string },
) {
  const accessToken = signJwt(
    {
      sub: user.id,
      user_id: user.id,
      email: user.email,
      username: user.username,
      app_role: user.role,
      type: "access",
    },
    60 * 60 * 24, // 24 hours access token
  );

  const refreshToken = signJwt(
    {
      sub: user.id,
      user_id: user.id,
      email: user.email,
      username: user.username,
      app_role: user.role,
      type: "refresh",
    },
    60 * 60 * 24 * 30, // 30 days refresh token
  );

  const sb = createAdminSupabaseClient();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await sb.from("auth_sessions").insert({
    user_id: user.id,
    refresh_token_hash: hashRefreshToken(refreshToken),
    device_type: meta?.deviceType || "web",
    ip_address: meta?.ipAddress || null,
    user_agent: meta?.userAgent || null,
    expires_at: expiresAt,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 86400,
    tokenType: "Bearer",
  };
}

export async function registerUser(input: RegisterUserInput) {
  const email = input.email.trim().toLowerCase();
  const mobile = normalizeMobileNumber(input.mobileNumber);
  const username = input.username.trim();

  // Validate username rule from profile.xlsx Registration sheet:
  // "Minimum 5 letters or numbers no special characters. Maximum 10"
  if (!/^[A-Za-z0-9]{5,10}$/.test(username)) {
    return {
      ok: false as const,
      field: "username",
      message:
        "Username must be 5 to 10 characters containing only letters and numbers (no special characters).",
    };
  }

  const age = calculateAgeFromDob(input.dob);
  if (Number.isNaN(age) || age < 18 || age > 95) {
    return {
      ok: false as const,
      field: "dob",
      message: "You must be at least 18 years old to register on Ma'aak.",
    };
  }

  if (!input.acceptTerms || !input.acceptSubscriptionDisclosure) {
    return {
      ok: false as const,
      field: "acceptSubscriptionDisclosure",
      message:
        "You must acknowledge the Terms & Conditions and the 1st-Month Free introductory subscription disclosure.",
    };
  }

  const sb = createAdminSupabaseClient();

  // Uniqueness checks (Email, Mobile Number, Username)
  const { data: existingEmail } = await sb
    .from("users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existingEmail) {
    return {
      ok: false as const,
      field: "email",
      message: "An account with this email address already exists.",
    };
  }

  const { data: existingMobile } = await sb
    .from("users")
    .select("id")
    .eq("mobile_number", mobile)
    .maybeSingle();
  if (existingMobile) {
    return {
      ok: false as const,
      field: "mobileNumber",
      message: "An account with this mobile number already exists.",
    };
  }

  const { data: existingUsername } = await sb
    .from("users")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (existingUsername) {
    return {
      ok: false as const,
      field: "username",
      message: "This username is already taken.",
    };
  }

  const selectedPlan = input.selectedPlan === "free" ? "free" : "premium";

  const { data: createdUser, error: userErr } = await sb
    .from("users")
    .insert({
      email,
      mobile_number: mobile,
      username,
      password_hash: hashPassword(input.password),
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      role: "user",
      account_status: "active",
      email_verified: false,
      mobile_verified: false,
      id_verified: false,
      selected_initial_plan: selectedPlan,
      terms_accepted: true,
      subscription_terms_accepted_at: new Date().toISOString(),
    })
    .select(
      "id, email, mobile_number, username, first_name, last_name, role, account_status, email_verified, mobile_verified, id_verified, selected_initial_plan, notification_preferences, privacy_settings, created_at",
    )
    .single();

  if (userErr || !createdUser) {
    return {
      ok: false as const,
      field: "general",
      message: userErr?.message || "Unable to create user account.",
    };
  }

  // Create initial user_profiles row with Registration sheet data
  const postcodeClean = input.postcode.trim().toUpperCase();
  const postcodeArea = extractOutwardPostcode(postcodeClean);

  await sb.from("user_profiles").insert({
    user_id: createdUser.id,
    gender: input.gender,
    dob: input.dob,
    postcode: postcodeClean,
    postcode_area: postcodeArea,
    postcode_verified: true,
    city: input.city.trim(),
    country: "United Kingdom",
    wizard_step: 2,
    completion_percentage: 15,
    is_published: false,
    moderation_status: "approved",
  });

  // Create default user_preferences row
  await sb.from("user_preferences").insert({
    user_id: createdUser.id,
  });

  // Provision initial subscription (Free or 1st-Month Free Premium Trial)
  const { data: planRecord } = await sb
    .from("subscription_plans")
    .select("*")
    .eq("slug", selectedPlan)
    .maybeSingle();

  if (planRecord) {
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await sb.from("user_subscriptions").insert({
      user_id: createdUser.id,
      plan_id: planRecord.id,
      plan_slug: planRecord.slug,
      status: selectedPlan === "premium" ? "trialing" : "active",
      is_trial: selectedPlan === "premium",
      trial_starts_at: selectedPlan === "premium" ? now.toISOString() : null,
      trial_ends_at: selectedPlan === "premium" ? trialEnds.toISOString() : null,
      current_period_start: now.toISOString(),
      current_period_end: trialEnds.toISOString(),
    });
  }

  // Generate Email & Mobile verification OTP codes
  const emailCode = generateOtpCode(6);
  const mobileCode = generateOtpCode(6);
  const otpExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await sb.from("verification_codes").insert([
    {
      user_id: createdUser.id,
      type: "email_verification",
      target: email,
      code: emailCode,
      expires_at: otpExpiry,
    },
    {
      user_id: createdUser.id,
      type: "mobile_verification",
      target: mobile,
      code: mobileCode,
      expires_at: otpExpiry,
    },
  ]);

  // Create welcome notification
  await sb.from("notifications").insert({
    user_id: createdUser.id,
    type: "account_alert",
    title: "Welcome to Ma'aak!",
    body:
      selectedPlan === "premium"
        ? "Your 1st Month Free Premium introductory period is active (£0.00 charged today). Complete your profile wizard to start discovering compatible matches."
        : "Welcome to Ma'aak Free Membership. Complete your profile wizard to start discovering compatible matches.",
    action_url: "/profile/wizard",
  });

  await recordAuditLog({
    actorId: createdUser.id,
    actorRole: "user",
    category: "user",
    action: "user.registered",
    resourceType: "user",
    resourceId: createdUser.id,
    details: { selectedPlan, city: input.city, postcodeArea },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const tokens = await issueSessionTokens(createdUser as AuthUser, {
    deviceType: input.deviceType,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    ok: true as const,
    user: createdUser as AuthUser,
    tokens,
    verificationPreview: {
      emailVerificationCode: emailCode,
      mobileVerificationCode: mobileCode,
    },
  };
}

export async function loginUser(input: {
  identifier: string;
  password: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const sb = createAdminSupabaseClient();
  const cleanId = input.identifier.trim().toLowerCase();

  const isEmail = cleanId.includes("@");
  const query = sb
    .from("users")
    .select(
      "id, email, mobile_number, username, password_hash, first_name, last_name, role, account_status, email_verified, mobile_verified, id_verified, selected_initial_plan, failed_login_attempts, locked_until, notification_preferences, privacy_settings, created_at",
    );

  const { data: user } = isEmail
    ? await query.ilike("email", cleanId).maybeSingle()
    : await query.ilike("username", cleanId).maybeSingle();

  if (!user) {
    return {
      ok: false as const,
      status: 401,
      message: "Invalid email/username or password.",
    };
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return {
      ok: false as const,
      status: 429,
      message:
        "Account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.",
    };
  }

  if (user.account_status === "suspended" || user.account_status === "deleted") {
    return {
      ok: false as const,
      status: 403,
      message: `Your account is currently ${user.account_status}. Please contact info@maaak.co.uk.`,
    };
  }

  const valid = verifyPassword(input.password, user.password_hash);
  if (!valid) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    const lockedUntil =
      attempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : null;
    await sb
      .from("users")
      .update({
        failed_login_attempts: attempts,
        locked_until: lockedUntil,
      })
      .eq("id", user.id);

    await recordAuditLog({
      actorId: user.id,
      category: "security",
      action: "auth.login_failed",
      details: { attempts, locked: Boolean(lockedUntil) },
      ipAddress: input.ipAddress,
    });

    return {
      ok: false as const,
      status: 401,
      message: "Invalid email/username or password.",
    };
  }

  // Reactivate if user was paused/deactivated and logs back in
  const nextStatus =
    user.account_status === "deactivated" ? "active" : user.account_status;

  await sb
    .from("users")
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      account_status: nextStatus,
    })
    .eq("id", user.id);

  const safeUser: AuthUser = {
    id: user.id,
    email: user.email,
    mobile_number: user.mobile_number,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    account_status: nextStatus,
    email_verified: user.email_verified,
    mobile_verified: user.mobile_verified,
    id_verified: user.id_verified,
    selected_initial_plan: user.selected_initial_plan,
    notification_preferences: user.notification_preferences,
    privacy_settings: user.privacy_settings,
    created_at: user.created_at,
  };

  const tokens = await issueSessionTokens(safeUser, {
    deviceType: input.deviceType,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  await recordAuditLog({
    actorId: user.id,
    actorRole: user.role,
    category: "user",
    action: "auth.login_success",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    ok: true as const,
    user: safeUser,
    tokens,
  };
}

export async function refreshUserSession(refreshToken: string) {
  const payload = verifyJwt(refreshToken);
  if (!payload || payload.type !== "refresh") {
    return { ok: false as const, message: "Invalid or expired refresh token." };
  }

  const sb = createAdminSupabaseClient();
  const tokenHash = hashRefreshToken(refreshToken);

  const { data: session } = await sb
    .from("auth_sessions")
    .select("*")
    .eq("refresh_token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) {
    return { ok: false as const, message: "Refresh session expired or revoked." };
  }

  // Revoke old refresh token (rotation)
  await sb
    .from("auth_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", session.id);

  const { data: user } = await sb
    .from("users")
    .select(
      "id, email, mobile_number, username, first_name, last_name, role, account_status, email_verified, mobile_verified, id_verified, selected_initial_plan, notification_preferences, privacy_settings, created_at",
    )
    .eq("id", payload.user_id)
    .maybeSingle();

  if (!user || user.account_status === "suspended" || user.account_status === "deleted") {
    return { ok: false as const, message: "Account is no longer active." };
  }

  const tokens = await issueSessionTokens(user as AuthUser, {
    deviceType: session.device_type,
  });

  return {
    ok: true as const,
    user: user as AuthUser,
    tokens,
  };
}

export async function verifyUserCode(
  userId: string,
  type: "email_verification" | "mobile_verification",
  code: string,
) {
  const sb = createAdminSupabaseClient();
  const { data: record } = await sb
    .from("verification_codes")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!record) {
    return { ok: false as const, message: "No active verification code found." };
  }

  if (new Date(record.expires_at) < new Date()) {
    return { ok: false as const, message: "Verification code has expired." };
  }

  if (record.code !== code.trim()) {
    await sb
      .from("verification_codes")
      .update({ attempts: (record.attempts || 0) + 1 })
      .eq("id", record.id);
    return { ok: false as const, message: "Invalid verification code." };
  }

  await sb
    .from("verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", record.id);

  const updateFields =
    type === "email_verification"
      ? { email_verified: true, email_verified_at: new Date().toISOString() }
      : { mobile_verified: true, mobile_verified_at: new Date().toISOString() };

  await sb.from("users").update(updateFields).eq("id", userId);

  return { ok: true as const };
}
