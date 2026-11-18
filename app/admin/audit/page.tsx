"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AdminAccessDenied,
  AdminNotice,
  AdminPageHeader,
  formatDate,
} from "@/components/admin/AdminUi";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [category, setCategory] = useState("all");
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadLogs = useCallback(
    async (selected = category) => {
      const res = await fetch(`/api/v1/admin/audit-logs?category=${selected}`);
      if (res.status === 403 || res.status === 401) {
        setDenied(true);
        return;
      }
      if (!res.ok) {
        setNotice("Could not load audit logs.");
        return;
      }
      const json = await res.json();
      setLogs(json.data?.logs || []);
    },
    [category],
  );

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  if (denied) return <AdminAccessDenied />;

  return (
    <div>
      {notice && <AdminNotice message={notice} tone="error" />}
      <AdminPageHeader
        eyebrow="Security & Governance"
        title="Immutable Audit Trail"
        description="Every privileged action, moderation decision, matching run, billing change, and safety intervention is recorded with actor and resource context."
      />

      <div className="mb-5 flex flex-wrap gap-3 rounded-2xl border border-[#E5DEC9] bg-white p-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-4 py-2.5 text-xs"
        >
          <option value="all">All Categories</option>
          <option value="admin">Administration</option>
          <option value="matching">Matching</option>
          <option value="moderation">Moderation</option>
          <option value="verification">Verification</option>
          <option value="subscription">Subscription</option>
          <option value="security">Security</option>
        </select>
        <button
          type="button"
          onClick={() => loadLogs()}
          className="rounded-xl bg-[#14110E] px-5 py-2.5 text-xs font-semibold text-[#DFBE8A]"
        >
          Apply Filter
        </button>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-[#E5DEC9] bg-white shadow-xs">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-[#E5DEC9] bg-[#FAF6F0] text-[#8C6D3F]">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th>Category</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Resource</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FAF6F0]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#665C4E]">
                  No audit events found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={String(log.id)}>
                  <td className="px-4 py-3">{formatDate(log.created_at)}</td>
                  <td>{String(log.event_category || log.category || "-")}</td>
                  <td className="font-semibold text-[#1A1612]">
                    {String(log.action || "-")}
                  </td>
                  <td>
                    <div className="font-mono text-[11px]">
                      {String(log.actor_id || "system").slice(0, 8)}
                    </div>
                    <div className="text-[11px] text-[#665C4E]">
                      {String(log.actor_role || "system")}
                    </div>
                  </td>
                  <td>
                    <div>{String(log.resource_type || "-")}</div>
                    <div className="font-mono text-[11px] text-[#665C4E]">
                      {String(log.resource_id || "").slice(0, 8)}
                    </div>
                  </td>
                  <td className="max-w-xs">
                    <pre className="max-h-20 overflow-auto rounded-lg bg-[#FAF6F0] p-2 text-[10px] text-[#5C5346]">
                      {JSON.stringify(log.details || {})}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
