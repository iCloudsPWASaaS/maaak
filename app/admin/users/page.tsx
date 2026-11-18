"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AdminAccessDenied,
  AdminNotice,
  AdminPageHeader,
  formatDate,
  statusStyle,
} from "@/components/admin/AdminUi";

interface AdminUserRow {
  id: string;
  email: string;
  mobile_number?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  account_status: string;
  email_verified: boolean;
  mobile_verified: boolean;
  id_verified: boolean;
  created_at: string;
  last_login_at?: string;
  profile: {
    gender?: string;
    city?: string;
    completion_percentage?: number;
    is_published?: boolean;
    moderation_status?: string;
  } | null;
  subscription: {
    plan_slug?: string;
    status?: string;
    is_trial?: boolean;
    trial_ends_at?: string;
  } | null;
}

interface UserEditState {
  userId: string;
  accountStatus: string;
  role: string;
  idVerified: boolean;
  emailVerified: boolean;
  mobileVerified: boolean;
  moderationStatus: string;
  isPublished: boolean;
  moderationNotes: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(null);
  const [editing, setEditing] = useState<UserEditState | null>(null);

  const loadUsers = useCallback(
    async (query = search, statusFilter = status) => {
      const params = new URLSearchParams({ search: query, status: statusFilter });
      const res = await fetch(`/api/v1/admin/users?${params.toString()}`);
      if (res.status === 403 || res.status === 401) {
        setDenied(true);
        return;
      }
      if (!res.ok) return;
      const json = await res.json();
      setUsers(json.data?.users || []);
    },
    [search, status],
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function startEditing(user: AdminUserRow) {
    setEditing({
      userId: user.id,
      accountStatus: user.account_status,
      role: user.role,
      idVerified: user.id_verified,
      emailVerified: user.email_verified,
      mobileVerified: user.mobile_verified,
      moderationStatus: user.profile?.moderation_status || "approved",
      isPublished: user.profile?.is_published || false,
      moderationNotes: "",
    });
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    const res = await fetch("/api/v1/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: editing.userId,
        account_status: editing.accountStatus,
        role: editing.role,
        id_verified: editing.idVerified,
        email_verified: editing.emailVerified,
        mobile_verified: editing.mobileVerified,
        moderation_status: editing.moderationStatus,
        is_published: editing.isPublished,
        moderation_notes: editing.moderationNotes,
      }),
    });
    const json = await res.json();
    setNotice({
      text: json.message || (res.ok ? "Member updated." : "Update failed."),
      tone: res.ok ? "success" : "error",
    });
    if (res.ok) {
      setEditing(null);
      loadUsers();
    }
  }

  if (denied) return <AdminAccessDenied />;

  return (
    <div>
      {notice && <AdminNotice message={notice.text} tone={notice.tone} />}
      <AdminPageHeader
        eyebrow="Member Management"
        title="Members &amp; Profile Moderation"
        description="Search every member, review completion and subscription status, verify identity claims, and control profile publication."
      />

      <div className="mb-5 flex flex-wrap gap-3 rounded-2xl border border-[#E5DEC9] bg-white p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, username, mobile, city"
          className="min-w-64 flex-1 rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-4 py-2.5 text-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-4 py-2.5 text-xs"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
          <option value="deleted">Deleted</option>
        </select>
        <button
          type="button"
          onClick={() => loadUsers()}
          className="rounded-xl bg-[#14110E] px-5 py-2.5 text-xs font-semibold text-[#DFBE8A]"
        >
          Search Members
        </button>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-[#E5DEC9] bg-white shadow-xs">
        <table className="w-full min-w-[1050px] text-left text-xs">
          <thead className="border-b border-[#E5DEC9] bg-[#FAF6F0] text-[#8C6D3F]">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Plan</th>
              <th>Completion</th>
              <th>Verified</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FAF6F0]">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#665C4E]">
                  No members found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#1A1612]">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-[11px] text-[#665C4E]">
                      @{user.username || "—"} • {user.email}
                    </div>
                    <div className="text-[11px] text-[#665C4E]">
                      {user.mobile_number || "No mobile"} •{" "}
                      {user.profile?.city || "No city"}
                    </div>
                  </td>
                  <td>{user.role}</td>
                  <td>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle(
                        user.account_status,
                      )}`}
                    >
                      {user.account_status}
                    </span>
                  </td>
                  <td>
                    {user.subscription?.plan_slug || "free"}
                    <div className="text-[11px] text-[#665C4E]">
                      {user.subscription?.status || "inactive"}
                    </div>
                  </td>
                  <td>{user.profile?.completion_percentage ?? 0}%</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        user.id_verified
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-[#EFE8DC] text-[#6E5229]"
                      }`}
                    >
                      {user.id_verified ? "Verified" : "Not Verified"}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => startEditing(user)}
                      className="rounded-full border border-[#C59B5F] px-3.5 py-1.5 text-[11px] font-semibold text-[#6E5229]"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={saveUser}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
          >
            <h2 className="font-serif text-2xl font-semibold text-[#1A1612]">
              Manage Member Account
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#665C4E]">
                Account Status
                <select
                  value={editing.accountStatus}
                  onChange={(e) =>
                    setEditing({ ...editing, accountStatus: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="suspended">Suspended</option>
                  <option value="deactivated">Deactivated</option>
                  <option value="deleted">Deleted</option>
                </select>
              </label>

              <label className="text-xs font-semibold text-[#665C4E]">
                Role
                <select
                  value={editing.role}
                  onChange={(e) =>
                    setEditing({ ...editing, role: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
                >
                  <option value="member">Member</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </label>

              <label className="text-xs font-semibold text-[#665C4E]">
                Profile Moderation
                <select
                  value={editing.moderationStatus}
                  onChange={(e) =>
                    setEditing({ ...editing, moderationStatus: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="flagged">Flagged</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>

              <label className="flex items-center gap-2 rounded-xl bg-[#FAF6F0] px-3 py-2 text-xs font-semibold text-[#665C4E]">
                <input
                  type="checkbox"
                  checked={editing.isPublished}
                  onChange={(e) =>
                    setEditing({ ...editing, isPublished: e.target.checked })
                  }
                />
                Publish profile to matches
              </label>

              <label className="flex items-center gap-2 rounded-xl bg-[#FAF6F0] px-3 py-2 text-xs font-semibold text-[#665C4E]">
                <input
                  type="checkbox"
                  checked={editing.idVerified}
                  onChange={(e) =>
                    setEditing({ ...editing, idVerified: e.target.checked })
                  }
                />
                ID verified badge
              </label>

              <label className="flex items-center gap-2 rounded-xl bg-[#FAF6F0] px-3 py-2 text-xs font-semibold text-[#665C4E]">
                <input
                  type="checkbox"
                  checked={editing.emailVerified}
                  onChange={(e) =>
                    setEditing({ ...editing, emailVerified: e.target.checked })
                  }
                />
                Email verified
              </label>

              <label className="flex items-center gap-2 rounded-xl bg-[#FAF6F0] px-3 py-2 text-xs font-semibold text-[#665C4E]">
                <input
                  type="checkbox"
                  checked={editing.mobileVerified}
                  onChange={(e) =>
                    setEditing({ ...editing, mobileVerified: e.target.checked })
                  }
                />
                Mobile verified
              </label>
            </div>

            <label className="mt-4 block text-xs font-semibold text-[#665C4E]">
              Moderation Notes
              <textarea
                value={editing.moderationNotes}
                onChange={(e) =>
                  setEditing({ ...editing, moderationNotes: e.target.value })
                }
                rows={3}
                className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full border border-[#E5DEC9] px-5 py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#14110E] px-6 py-2.5 text-xs font-semibold text-[#DFBE8A]"
              >
                Save Member Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
