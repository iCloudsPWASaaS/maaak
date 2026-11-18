import crypto from "node:crypto";
import { recordAuditLog } from "@/services/audit-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

function shortenWholeFloats(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(shortenWholeFloats);
  }
  if (data !== null && typeof data === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      out[k] = shortenWholeFloats(v);
    }
    return out;
  }
  if (typeof data === "number" && Number.isFinite(data) && Math.floor(data) === data) {
    return Math.trunc(data);
  }
  return data;
}

function sortObjectKeysRecursively(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(sortObjectKeysRecursively);
  }
  if (data !== null && typeof data === "object") {
    const sortedKeys = Object.keys(data as Record<string, unknown>).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      out[k] = sortObjectKeysRecursively((data as Record<string, unknown>)[k]);
    }
    return out;
  }
  return data;
}

export function buildDiditCanonicalJson(data: unknown): string {
  const normalized = sortObjectKeysRecursively(shortenWholeFloats(data));
  return JSON.stringify(normalized);
}

/**
 * Verifies Didit.me webhook signature using HMAC-SHA256 over canonical JSON
 * and enforces a 5-minute replay window.
 */
export function verifyDiditWebhookSignature(input: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  secret?: string;
}): boolean {
  const secret = input.secret ?? process.env.DIDIT_WEBHOOK_SECRET;
  if (!secret || !input.signature || !input.timestamp) {
    return false;
  }

  const tsNum = parseInt(input.timestamp, 10);
  const nowSec = Math.floor(Date.now() / 1000);
  if (Number.isNaN(tsNum) || Math.abs(nowSec - tsNum) > 300) {
    return false;
  }

  try {
    const parsed = JSON.parse(input.rawBody);
    const canonical = buildDiditCanonicalJson(parsed);
    const expected = crypto
      .createHmac("sha256", secret)
      .update(canonical, "utf8")
      .digest("hex");

    const sigClean = input.signature.replace(/^sha256=/i, "").trim();
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sigClean, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function startDiditVerificationSession(userId: string) {
  const sb = createAdminSupabaseClient();

  const { data: user } = await sb
    .from("users")
    .select("id, username, first_name, last_name, id_verified")
    .eq("id", userId)
    .single();

  if (!user) {
    return { ok: false as const, message: "User not found." };
  }

  const { data: profile } = await sb
    .from("user_profiles")
    .select("dob")
    .eq("user_id", userId)
    .maybeSingle();

  const workflowId =
    process.env.DIDIT_WORKFLOW_ID || "15480d9c-b20f-45f7-ae86-9aa8f71e8a41";
  const baseUrl = (
    process.env.DIDIT_BASE_URL || "https://verification.didit.me"
  ).replace(/\/$/, "");
  const apiKey = process.env.DIDIT_API_KEY;
  const callbackUrl =
    process.env.DIDIT_CALLBACK ||
    `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/verification?callback=didit`;

  let diditSessionId = `didit_${crypto.randomBytes(10).toString("hex")}`;
  let verificationUrl = `${callbackUrl}&session_id=${diditSessionId}`;

  if (process.env.DIDIT_ENABLED === "true" && apiKey) {
    try {
      const payload = {
        workflow_id: workflowId,
        vendor_data: user.id,
        callback: callbackUrl,
        metadata: {
          user_id: user.id,
          username: user.username,
        },
        expected_details: {
          first_name: user.first_name,
          last_name: user.last_name,
          ...(profile?.dob ? { date_of_birth: profile.dob } : {}),
        },
      };

      const res = await fetch(`${baseUrl}/v3/session/`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          session_id?: string;
          url?: string;
        };
        if (json.session_id) diditSessionId = json.session_id;
        if (json.url) verificationUrl = json.url;
      }
    } catch (err) {
      console.warn(
        "[verification-service] Didit live call fallback to sandbox session:",
        (err as Error).message,
      );
    }
  }

  const { data: sessionRecord, error } = await sb
    .from("identity_verification_sessions")
    .insert({
      user_id: user.id,
      didit_session_id: diditSessionId,
      workflow_id: workflowId,
      verification_url: verificationUrl,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false as const, message: error.message };
  }

  await recordAuditLog({
    actorId: user.id,
    category: "verification",
    action: "didit.session_started",
    resourceType: "identity_verification_session",
    resourceId: sessionRecord.id,
    details: { diditSessionId, workflowId },
  });

  return {
    ok: true as const,
    session: sessionRecord,
    redirectUrl: verificationUrl,
  };
}

export async function processDiditWebhookEvent(input: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
}) {
  const isValid = verifyDiditWebhookSignature(input);
  if (!isValid) {
    return {
      ok: false as const,
      status: 401,
      message: "Invalid Didit webhook signature or expired timestamp.",
    };
  }

  const payload = JSON.parse(input.rawBody) as {
    session_id?: string;
    status?: string;
    vendor_data?: string;
    event_type?: string;
  };

  const sessionId = payload.session_id || "";
  const rawStatus = (payload.status || "").toLowerCase();
  const eventId = `didit_${sessionId}_${rawStatus}_${input.timestamp}`;

  const sb = createAdminSupabaseClient();

  // Idempotency check
  const { data: existingEvent } = await sb
    .from("payment_events")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingEvent) {
    return {
      ok: true as const,
      idempotentReplay: true,
      message: "Webhook event already processed.",
    };
  }

  await sb.from("payment_events").insert({
    provider: "didit",
    event_id: eventId,
    event_type: payload.event_type || "status.updated",
    payload: {
      session_id: sessionId,
      status: rawStatus,
      vendor_data: payload.vendor_data,
    },
    processing_status: "processed",
  });

  const statusMap: Record<string, string> = {
    approved: "approved",
    verified: "approved",
    declined: "declined",
    rejected: "declined",
    in_progress: "in_progress",
    in_review: "review_needed",
    expired: "expired",
    abandoned: "abandoned",
  };
  const normalizedStatus = statusMap[rawStatus] || "pending";

  const { data: sessionRecord } = await sb
    .from("identity_verification_sessions")
    .update({
      status: normalizedStatus,
      webhook_event_id: eventId,
      webhook_payload_summary: {
        status: normalizedStatus,
        updated_at: new Date().toISOString(),
      },
      ...(normalizedStatus === "approved"
        ? { verified_at: new Date().toISOString() }
        : {}),
    })
    .eq("didit_session_id", sessionId)
    .select("*")
    .maybeSingle();

  const targetUserId = sessionRecord?.user_id || payload.vendor_data;
  if (targetUserId && normalizedStatus === "approved") {
    await sb
      .from("users")
      .update({
        id_verified: true,
        id_verified_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    await sb.from("notifications").insert({
      user_id: targetUserId,
      type: "verification_update",
      title: "Identity Verified — Blue Tick Awarded",
      body: "Alhamdulillah! Your Didit identity verification has been approved and your profile now displays the verified badge.",
      action_url: "/verification",
    });
  }

  await recordAuditLog({
    targetUserId: targetUserId || null,
    category: "verification",
    action: `didit.webhook_${normalizedStatus}`,
    resourceType: "identity_verification_session",
    resourceId: sessionRecord?.id || sessionId,
    details: { sessionId, status: normalizedStatus },
  });

  return {
    ok: true as const,
    idempotentReplay: false,
    status: normalizedStatus,
  };
}
