"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Pusher from "pusher-js";
import { Bell, CheckCheck } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    email: true,
    push: true,
    requests: true,
    messages: true,
    calls: true,
    verification: true,
    subscription: true,
  });
  const [toast, setToast] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    const res = await fetch("/api/v1/notifications");
    if (res.ok) {
      const json = await res.json();
      setNotifications(json.data?.notifications || []);
      if (json.data?.preferences) setPrefs(json.data.preferences);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/v1/auth/me");
      if (!res.ok) return;
      const json = await res.json();
      const id = json.data?.user?.id;
      if (typeof id === "string") setCurrentUserId(id);
    })();
  }, []);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
    if (!key || !currentUserId) return;

    const pusher = new Pusher(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || "eu",
      authEndpoint: "/api/v1/pusher/auth",
    });
    const channelName = `private-user-${currentUserId}`;
    const channel = pusher.subscribe(channelName);
    const refresh = () => void loadNotifications();

    channel.bind("new-request", refresh);
    channel.bind("message-notification", refresh);
    channel.bind("incoming-call", refresh);
    channel.bind("notification", refresh);
    channel.bind("call-ended", refresh);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [currentUserId, loadNotifications]);

  async function handleMarkAllRead() {
    await fetch("/api/v1/notifications/read-all", { method: "POST" });
    loadNotifications();
  }

  async function handleTogglePreference(key: string) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await fetch("/api/v1/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: updated }),
    });
    setToast("Notification preferences updated.");
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#1A1612]">
            Notifications &amp; Alerts
          </h1>
          <p className="text-xs text-[#665C4E]">
            Stay updated on introduction requests, messages, calls, verification,
            and billing.
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#14110E] px-5 py-2 text-xs font-semibold text-[#DFBE8A]"
        >
          <CheckCheck className="h-4 w-4" />
          <span>Mark All as Read</span>
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-8">
          {notifications.length === 0 ? (
            <div className="rounded-3xl border border-[#E5DEC9] bg-white p-10 text-center text-xs text-[#665C4E]">
              <Bell className="mx-auto mb-2 h-8 w-8 text-[#9C743C]" />
              You have no notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${
                  n.is_read
                    ? "border-[#E5DEC9] bg-white"
                    : "border-[#C59B5F] bg-[#FAF6F0]"
                }`}
              >
                <div>
                  <h3 className="text-sm font-semibold text-[#1A1612]">
                    {n.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#5C5346]">{n.body}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-[#8C6D3F]">
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                    {n.action_url && (
                      <Link
                        href={n.action_url}
                        className="font-semibold underline"
                      >
                        Open
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6 lg:col-span-4">
          <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
            Push &amp; Email Preferences
          </h2>
          <div className="mt-4 space-y-3 text-xs">
            {Object.entries(prefs).map(([k, val]) => (
              <label
                key={k}
                className="flex items-center justify-between rounded-xl bg-[#FAF6F0] px-3.5 py-2.5 cursor-pointer"
              >
                <span className="capitalize font-medium text-[#1A1612]">
                  {k} notifications
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(val)}
                  onChange={() => handleTogglePreference(k)}
                  className="h-4 w-4 accent-[#14110E]"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
