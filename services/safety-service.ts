import { recordAuditLog } from "@/services/audit-service";
import { executeBatchMatchingRun } from "@/services/matching-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function blockUserAccount(input: {
  blockerId: string;
  blockedId: string;
  reason?: string;
}) {
  if (input.blockerId === input.blockedId) {
    return { ok: false as const, message: "You cannot block yourself." };
  }

  const sb = createAdminSupabaseClient();

  const { data: blockRecord, error } = await sb
    .from("blocked_users")
    .upsert(
      {
        blocker_id: input.blockerId,
        blocked_id: input.blockedId,
        reason: input.reason || null,
      },
      { onConflict: "blocker_id,blocked_id" },
    )
    .select("*")
    .single();

  if (error) {
    return { ok: false as const, message: error.message };
  }

  // Immediately close/block any active conversation between the two users
  await sb
    .from("conversations")
    .update({
      status: "blocked",
      closed_by: input.blockerId,
      closed_at: new Date().toISOString(),
    })
    .or(
      `and(user_one_id.eq.${input.blockerId},user_two_id.eq.${input.blockedId}),and(user_one_id.eq.${input.blockedId},user_two_id.eq.${input.blockerId})`,
    );

  // Cancel any pending introduction requests between them
  await sb
    .from("introduction_requests")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .or(
      `and(sender_id.eq.${input.blockerId},receiver_id.eq.${input.blockedId}),and(sender_id.eq.${input.blockedId},receiver_id.eq.${input.blockerId})`,
    );

  // Remove any active match recommendations between them
  await sb
    .from("match_recommendations")
    .delete()
    .or(
      `and(user_id.eq.${input.blockerId},matched_user_id.eq.${input.blockedId}),and(user_id.eq.${input.blockedId},matched_user_id.eq.${input.blockerId})`,
    );

  await recordAuditLog({
    actorId: input.blockerId,
    targetUserId: input.blockedId,
    category: "moderation",
    action: "user.blocked",
    resourceType: "blocked_user",
    resourceId: blockRecord.id,
    details: { reason: input.reason },
  });

  return { ok: true as const, block: blockRecord };
}

export async function unblockUserAccount(input: {
  blockerId: string;
  blockIdOrTargetUserId: string;
}) {
  const sb = createAdminSupabaseClient();

  await sb
    .from("blocked_users")
    .delete()
    .eq("blocker_id", input.blockerId)
    .or(`id.eq.${input.blockIdOrTargetUserId},blocked_id.eq.${input.blockIdOrTargetUserId}`);

  await executeBatchMatchingRun("profile_updated", input.blockerId);

  return { ok: true as const };
}

export async function createModerationReport(input: {
  reporterId: string;
  reportedUserId: string;
  reportedMessageId?: string | null;
  reportType:
    | "profile"
    | "message"
    | "photo"
    | "call"
    | "harassment"
    | "impersonation"
    | "other";
  reason: string;
  details?: string;
}) {
  const sb = createAdminSupabaseClient();

  const { data: report, error } = await sb
    .from("reports")
    .insert({
      reporter_id: input.reporterId,
      reported_user_id: input.reportedUserId,
      reported_message_id: input.reportedMessageId || null,
      report_type: input.reportType,
      reason: input.reason.trim(),
      details: input.details?.trim() || null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false as const, message: error.message };
  }

  await recordAuditLog({
    actorId: input.reporterId,
    targetUserId: input.reportedUserId,
    category: "moderation",
    action: "report.submitted",
    resourceType: "report",
    resourceId: report.id,
    details: { reportType: input.reportType, reason: input.reason },
  });

  return { ok: true as const, report };
}

export async function submitUserFeedback(input: {
  userId?: string | null;
  name?: string;
  email: string;
  category: "general_feedback" | "suggestion" | "technical_problem" | "complaint";
  subject?: string;
  message: string;
  pageUrl?: string;
}) {
  const sb = createAdminSupabaseClient();
  const recipientEmail =
    process.env.FEEDBACK_RECIPIENT_EMAIL || "info@maaak.co.uk";

  const { data: row, error } = await sb
    .from("feedback")
    .insert({
      user_id: input.userId || null,
      name: input.name?.trim() || null,
      email: input.email.trim().toLowerCase(),
      category: input.category,
      subject: input.subject?.trim() || `Ma'aak ${input.category.replace("_", " ")}`,
      message: input.message.trim(),
      page_url: input.pageUrl || null,
      recipient_email: recipientEmail,
      status: "new",
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return {
    ok: true as const,
    feedback: row,
    forwardedTo: recipientEmail,
  };
}

export async function updateAccountLifecycleStatus(input: {
  userId: string;
  action: "pause" | "resume" | "deactivate" | "request_deletion";
  reason?: string;
}) {
  const sb = createAdminSupabaseClient();

  if (input.action === "pause") {
    await sb
      .from("users")
      .update({ account_status: "paused" })
      .eq("id", input.userId);
    await sb
      .from("user_profiles")
      .update({ is_published: false })
      .eq("user_id", input.userId);
  } else if (input.action === "resume") {
    await sb
      .from("users")
      .update({ account_status: "active" })
      .eq("id", input.userId);
    await sb
      .from("user_profiles")
      .update({ is_published: true })
      .eq("user_id", input.userId);
  } else if (input.action === "deactivate") {
    await sb
      .from("users")
      .update({ account_status: "deactivated" })
      .eq("id", input.userId);
    await sb
      .from("user_profiles")
      .update({ is_published: false })
      .eq("user_id", input.userId);
    await sb
      .from("auth_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", input.userId);
  } else if (input.action === "request_deletion") {
    const scheduled = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await sb
      .from("users")
      .update({
        account_status: "pending_deletion",
        deletion_requested_at: new Date().toISOString(),
        deletion_scheduled_for: scheduled,
      })
      .eq("id", input.userId);
    await sb
      .from("user_profiles")
      .update({ is_published: false })
      .eq("user_id", input.userId);
    await sb
      .from("auth_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", input.userId);
  }

  await recordAuditLog({
    actorId: input.userId,
    category: "user",
    action: `account.${input.action}`,
    details: { reason: input.reason },
  });

  await executeBatchMatchingRun("profile_updated", input.userId);

  return { ok: true as const };
}
