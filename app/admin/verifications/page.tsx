"use client";

import React, { useEffect, useState } from "react";
import {
  AdminAccessDenied,
  AdminNotice,
  AdminPageHeader,
  formatDate,
  statusStyle,
} from "@/components/admin/AdminUi";

interface VerificationSession {
  id: string;
  user_id: string;
  didit_session_id?: string;
  status: string;
  created_at: string;
  verified_at?: string;
  users?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    username?: string;
    id_verified?: boolean;
  } | null;
}

export default function AdminVerificationsPage() {
  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(null);

  async function loadSessions() {
    const res = await fetch("/api/v1/admin/verifications");
    if (res.status === 403 || res.status === 401) {
      setDenied(true);
      return;
    }
    if (!res.ok) return;
    const json = await res.json();
    setSessions(json.data?.sessions || []);
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function updateStatus(session: VerificationSession) {
    const status = statuses[session.id] || session.status;
    const res = await fetch("/api/v1/admin/verifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, status }),
    });
    const json = await res.json();
    setNotice({
      text: json.message || (res.ok ? "Verification updated." : "Update failed."),
      tone: res.ok ? "success" : "error",
    });
    if (res.ok) loadSessions();
  }

  if (denied) return <AdminAccessDenied />;

  return (
    <div>
      {notice && <AdminNotice message={notice.text} tone={notice.tone} />}
      <AdminPageHeader
        eyebrow="Identity Assurance"
        title="Didit.me Verification Sessions"
        description="Review identity verification attempts and issue the verified badge. Signed Didit webhooks remain the authoritative source for production verification state."
      />

      <div className="overflow-x-auto rounded-3xl border border-[#E5DEC9] bg-white shadow-xs">
        <table className="w-full min-w-[960px] text-left text-xs">
          <thead className="border-b border-[#E5DEC9] bg-[#FAF6F0] text-[#8C6D3F]">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th>Didit Session</th>
              <th>Status</th>
              <th>Created</th>
              <th>Verified At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FAF6F0]">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#665C4E]">
                  No verification sessions recorded yet.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">
                      {session.users?.first_name} {session.users?.last_name}
                    </div>
                    <div className="text-[11px] text-[#665C4E]">
                      @{session.users?.username || "—"} • {session.users?.email}
                    </div>
                  </td>
                  <td className="font-mono text-[11px]">
                    {session.didit_session_id || session.id}
                  </td>
                  <td>
                    <span
                      className={`rounded-full px-2.5 py-1 font-semibold ${statusStyle(
                        session.status,
                      )}`}
                    >
                      {session.status}
                    </span>
                  </td>
                  <td>{formatDate(session.created_at)}</td>
                  <td>{formatDate(session.verified_at)}</td>
                  <td>
                    <div className="flex gap-2">
                      <select
                        value={statuses[session.id] || session.status}
                        onChange={(e) =>
                          setStatuses({
                            ...statuses,
                            [session.id]: e.target.value,
                          })
                        }
                        className="rounded-lg border border-[#E5DEC9] bg-[#FAF6F0] px-2 py-1.5 text-[11px]"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="expired">Expired</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => updateStatus(session)}
                        className="rounded-full bg-[#14110E] px-3 py-1.5 text-[11px] font-semibold text-[#DFBE8A]"
                      >
                        Apply
                      </button>
                    </div>
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
