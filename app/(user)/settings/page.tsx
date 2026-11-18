"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PauseCircle, Power, Trash2, Lock, Ban } from "lucide-react";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Record<string, unknown>[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  async function loadBlocks() {
    const res = await fetch("/api/v1/blocks");
    if (res.ok) {
      const json = await res.json();
      setBlocks(json.data?.blocks || []);
    }
  }

  useEffect(() => {
    loadBlocks();
  }, []);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/account/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    setToast(json.message);
    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  async function handleUnblock(id: string) {
    await fetch(`/api/v1/blocks/${id}`, { method: "DELETE" });
    setToast("User unblocked.");
    loadBlocks();
  }

  async function handlePauseResume(resume: boolean) {
    const res = await fetch("/api/v1/account/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume }),
    });
    const json = await res.json();
    setToast(json.message);
  }

  async function handleDeactivate() {
    if (!confirm("Deactivate your account? You can reactivate by logging back in.")) {
      return;
    }
    await fetch("/api/v1/account/deactivate", { method: "POST" });
    router.push("/login");
  }

  async function handlePermanentDelete() {
    if (
      !confirm(
        "Request permanent GDPR account deletion? Your profile will be unpublished immediately.",
      )
    ) {
      return;
    }
    await fetch("/api/v1/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "User requested permanent deletion" }),
    });
    router.push("/");
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl">
          {toast}
        </div>
      )}

      <div>
        <h1 className="font-serif text-3xl font-semibold text-[#1A1612]">
          Safety, Privacy &amp; Account Settings
        </h1>
        <p className="text-xs text-[#665C4E]">
          Manage your password, blocked users, profile visibility, or GDPR
          account deletion.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Password Change */}
        <form
          onSubmit={handlePasswordChange}
          className="rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-xs"
        >
          <div className="flex items-center gap-2 font-serif text-xl font-semibold text-[#1A1612]">
            <Lock className="h-5 w-5 text-[#9C743C]" />
            <span>Change Password</span>
          </div>
          <div className="mt-4 space-y-3">
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-4 py-2.5 text-xs"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="New Password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-4 py-2.5 text-xs"
            />
            <button
              type="submit"
              className="rounded-full bg-[#14110E] px-6 py-2.5 text-xs font-semibold text-[#DFBE8A]"
            >
              Update Password
            </button>
          </div>
        </form>

        {/* Blocked Users */}
        <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 font-serif text-xl font-semibold text-[#1A1612]">
            <Ban className="h-5 w-5 text-[#9C743C]" />
            <span>Blocked Users ({blocks.length})</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {blocks.length === 0 ? (
              <p className="text-xs text-[#665C4E]">
                You have not blocked any users.
              </p>
            ) : (
              blocks.map((b) => {
                const bu = (b.blocked_user || {}) as Record<string, unknown>;
                return (
                  <div
                    key={String(b.id)}
                    className="flex items-center justify-between rounded-xl bg-[#FAF6F0] px-4 py-2.5 text-xs"
                  >
                    <span className="font-semibold">
                      {String(bu.first_name || "User")} (@
                      {String(bu.username || "")})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnblock(String(b.id))}
                      className="font-semibold text-[#9C743C] underline"
                    >
                      Unblock
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Account Lifecycle Controls */}
      <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-xs">
        <h2 className="font-serif text-2xl font-semibold text-[#1A1612]">
          Profile Pause, Deactivation &amp; Permanent Deletion
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handlePauseResume(false)}
            className="inline-flex items-center gap-2 rounded-full border border-[#C59B5F] px-5 py-2.5 text-xs font-semibold text-[#1A1612]"
          >
            <PauseCircle className="h-4 w-4 text-[#9C743C]" />
            <span>Pause My Profile</span>
          </button>

          <button
            type="button"
            onClick={() => handlePauseResume(true)}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-5 py-2.5 text-xs font-semibold text-white"
          >
            <span>Resume My Profile</span>
          </button>

          <button
            type="button"
            onClick={handleDeactivate}
            className="inline-flex items-center gap-2 rounded-full border border-amber-600 px-5 py-2.5 text-xs font-semibold text-amber-800"
          >
            <Power className="h-4 w-4" />
            <span>Deactivate Account</span>
          </button>

          <button
            type="button"
            onClick={handlePermanentDelete}
            className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-5 py-2.5 text-xs font-semibold text-white"
          >
            <Trash2 className="h-4 w-4" />
            <span>Request Permanent Deletion</span>
          </button>
        </div>
      </div>
    </div>
  );
}
