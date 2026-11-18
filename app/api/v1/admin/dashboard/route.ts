import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { verifyAdminRequest } from "@/lib/auth-guard";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return apiError("Forbidden: Administrator or Moderator access required.", 403);
  }

  const sb = createAdminSupabaseClient();

  const [
    { data: users },
    { data: profiles },
    { data: subscriptions },
    { data: payments },
    { data: reports },
    { data: verifications },
    { data: conversations },
    { count: messagesCount },
    { data: matchingRuns },
    { data: feedbackRows },
  ] = await Promise.all([
    sb
      .from("users")
      .select("id, role, account_status, id_verified, created_at"),
    sb
      .from("user_profiles")
      .select("id, user_id, is_published, moderation_status"),
    sb.from("user_subscriptions").select("id, user_id, plan_slug, status, is_trial"),
    sb.from("payments").select("amount, status"),
    sb.from("reports").select("id, status, report_type, created_at"),
    sb.from("identity_verification_sessions").select("id, status"),
    sb.from("conversations").select("id, status"),
    sb.from("messages").select("id", { count: "exact", head: true }),
    sb
      .from("matching_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(5),
    sb.from("feedback").select("id, status"),
  ]);

  const userList = users || [];
  const subList = subscriptions || [];
  const reportList = reports || [];
  const verifList = verifications || [];
  const convList = conversations || [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const totalRegisteredUsers = userList.length;
  const activeUsers = userList.filter((u) => u.account_status === "active").length;
  const newRegistrations = userList.filter(
    (u) => new Date(u.created_at) >= sevenDaysAgo,
  ).length;
  const verifiedProfiles = userList.filter((u) => u.id_verified).length;
  const pendingVerification = verifList.filter(
    (v) => v.status === "pending" || v.status === "in_progress",
  ).length;
  const pausedProfiles = userList.filter((u) => u.account_status === "paused").length;
  const reportedProfiles = reportList.length;
  const pendingReports = reportList.filter((r) => r.status === "pending").length;

  const activeSubs = subList.filter(
    (s) => s.status === "active" || s.status === "trialing",
  );
  const premiumUsers = activeSubs.filter(
    (s) => s.plan_slug === "premium" || s.plan_slug === "premium-plus",
  ).length;
  const freeUsers = Math.max(0, totalRegisteredUsers - premiumUsers);

  const totalRevenueGbp = (payments || [])
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  return apiSuccess("Admin dashboard metrics retrieved", {
    metrics: {
      totalRegisteredUsers,
      activeUsers,
      newRegistrations,
      verifiedProfiles,
      pendingVerification,
      pausedProfiles,
      reportedProfiles,
      pendingReports,
      activeSubscriptions: activeSubs.length,
      freeUsers,
      premiumUsers,
      totalRevenueGbp,
      activeConversations: convList.filter((c) => c.status === "active").length,
      totalMessages: messagesCount ?? 0,
      newFeedbackCount: (feedbackRows || []).filter((f) => f.status === "new")
        .length,
      publishedProfiles: (profiles || []).filter((p) => p.is_published).length,
    },
    recentMatchingRuns: matchingRuns || [],
  });
}
