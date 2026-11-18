"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Crown,
  ShieldCheck,
  Flag,
  MessageCircle,
  Wallet,
} from "lucide-react";
import {
  AdminAccessDenied,
  AdminLoading,
  AdminNotice,
  AdminPageHeader,
  formatDate,
  statusStyle,
} from "@/components/admin/AdminUi";

interface AdminMetrics {
  [key: string]: number | string;
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [recentRuns, setRecentRuns] = useState<Record<string, unknown>[]>([]);
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadDashboard() {
    const res = await fetch("/api/v1/admin/dashboard");
    if (res.status === 403 || res.status === 401) {
      setDenied(true);
      return;
    }
    if (!res.ok) {
      setNotice("Could not load administrator dashboard metrics.");
      return;
    }
    const json = await res.json();
    setMetrics(json.data?.metrics || {});
    setRecentRuns(json.data?.recentMatchingRuns || []);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (denied) return <AdminAccessDenied />;

  const cardDefinitions = [
    { key: "totalRegisteredUsers", label: "Registered Members", icon: Users },
    { key: "activeUsers", label: "Active Accounts", icon: UserCheck },
    { key: "newRegistrations", label: "New This Week", icon: Users },
    { key: "verifiedProfiles", label: "ID Verified", icon: ShieldCheck },
    { key: "pendingVerification", label: "Pending ID Checks", icon: ShieldCheck },
    { key: "pendingReports", label: "Pending Reports", icon: Flag },
    { key: "premiumUsers", label: "Premium Members", icon: Crown },
    { key: "freeUsers", label: "Free Members", icon: Users },
    { key: "totalRevenueGbp", label: "Collected Revenue (£)", icon: Wallet },
    { key: "activeConversations", label: "Active Conversations", icon: MessageCircle },
    { key: "totalMessages", label: "Total Messages", icon: MessageCircle },
    { key: "newFeedbackCount", label: "New Feedback", icon: MessageCircle },
  ];

  return (
    <div>
      {notice && <AdminNotice message={notice} tone="error" />}
      <AdminPageHeader
        eyebrow="Control Room Overview"
        title="Platform Health &amp; Trust Signals"
        description="Live operational metrics across membership, verification, subscriptions, safety, communication, matching, and feedback."
      />

      {!metrics ? (
        <AdminLoading />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cardDefinitions.map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="rounded-2xl border border-[#E5DEC9] bg-white p-5 shadow-xs"
            >
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8C6D3F]">
                  {label}
                </span>
                <Icon className="h-4 w-4 text-[#C59B5F]" />
              </div>
              <div className="mt-4 font-serif text-3xl font-bold text-[#1A1612]">
                {typeof metrics[key] === "number"
                  ? Number(metrics[key]).toLocaleString(undefined, {
                      minimumFractionDigits: key === "totalRevenueGbp" ? 2 : 0,
                      maximumFractionDigits: key === "totalRevenueGbp" ? 2 : 0,
                    })
                  : String(metrics[key] ?? 0)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-3xl border border-[#E5DEC9] bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
            Recent Stable Matching Runs
          </h2>
          <Link
            href="/admin/matching"
            className="text-xs font-semibold text-[#9C743C] underline"
          >
            Open Matching Console
          </Link>
        </div>

        {recentRuns.length === 0 ? (
          <p className="mt-4 text-xs text-[#665C4E]">
            No matching runs recorded yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="border-b border-[#E5DEC9] text-[#8C6D3F]">
                <tr>
                  <th className="py-2.5">Run ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Stable Matches</th>
                  <th>Blocking Pairs</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF6F0]">
                {recentRuns.map((run) => (
                  <tr key={String(run.id)}>
                    <td className="py-3 font-mono text-[11px]">
                      {String(run.id).slice(0, 8)}
                    </td>
                    <td>{String(run.run_type)}</td>
                    <td>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle(
                          run.status,
                        )}`}
                      >
                        {String(run.status)}
                      </span>
                    </td>
                    <td>{String(run.stable_matches_count ?? 0)}</td>
                    <td>{String(run.blocking_pairs_count ?? 0)}</td>
                    <td>{formatDate(run.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
