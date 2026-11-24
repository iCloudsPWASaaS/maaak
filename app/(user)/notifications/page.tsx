"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Pusher from "pusher-js";
import {
  Bell,
  Check,
  CheckCheck,
  Crown,
  Heart,
  Mail,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Smartphone,
  User,
  Video,
  type LucideIcon,
} from "lucide-react";

type NotificationCategory = "matches" | "messages" | "verification" | "account";
type FilterId = "all" | NotificationCategory;

interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationItem extends Omit<NotificationRecord, "type"> {
  type: NotificationCategory;
  sourceType: string;
}

interface NotificationGroup {
  key: string;
  label: string;
  items: NotificationItem[];
}

interface FilterOption {
  id: FilterId;
  label: string;
  icon: LucideIcon | null;
}

type PreferenceKey =
  | "push"
  | "calls"
  | "email"
  | "messages"
  | "requests"
  | "subscription"
  | "verification";

interface PreferenceOption {
  key: PreferenceKey;
  label: string;
  icon: LucideIcon;
}

const DEFAULT_PREFERENCES: Record<PreferenceKey, boolean> = {
  push: true,
  calls: true,
  email: true,
  messages: true,
  requests: true,
  subscription: true,
  verification: true,
};

const FILTERS: FilterOption[] = [
  { id: "all", label: "All", icon: null },
  { id: "matches", label: "Matches", icon: Heart },
  { id: "messages", label: "My Messages", icon: MessageCircle },
  { id: "verification", label: "Verification", icon: ShieldCheck },
  { id: "account", label: "Account", icon: User },
];

const PREFERENCES: PreferenceOption[] = [
  { key: "push", label: "Push notifications", icon: Smartphone },
  { key: "calls", label: "Call notifications", icon: Phone },
  { key: "email", label: "Email notifications", icon: Mail },
  { key: "messages", label: "Message notifications", icon: MessageCircle },
  { key: "requests", label: "Requests notifications", icon: Send },
  { key: "subscription", label: "Subscription notifications", icon: Crown },
  { key: "verification", label: "Verification notifications", icon: ShieldCheck },
];

const CATEGORY_BY_SOURCE_TYPE: Record<string, NotificationCategory> = {
  new_match: "matches",
  introduction_request: "matches",
  request_accepted: "matches",
  new_message: "messages",
  incoming_call: "messages",
  missed_call: "messages",
  verification_update: "verification",
  subscription_update: "account",
  account_alert: "account",
  system: "account",
};

function categoryFromSourceType(type: string): NotificationCategory {
  return CATEGORY_BY_SOURCE_TYPE[type] ?? "account";
}

function toNotificationItem(record: NotificationRecord): NotificationItem {
  return {
    id: record.id,
    title: record.title,
    body: record.body,
    action_url: record.action_url,
    is_read: record.is_read,
    created_at: record.created_at,
    type: categoryFromSourceType(record.type),
    sourceType: record.type,
  };
}

const ICON_BY_SOURCE_TYPE: Record<string, LucideIcon> = {
  incoming_call: Video,
  missed_call: Video,
  new_message: MessageCircle,
  subscription_update: Crown,
};

const ICON_BY_CATEGORY: Record<NotificationCategory, LucideIcon> = {
  matches: Heart,
  messages: MessageCircle,
  verification: ShieldCheck,
  account: User,
};

function daysSince(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - day.getTime()) / 86_400_000);
}

function formatTimestamp(createdAt: string): string {
  const date = new Date(createdAt);
  const days = daysSince(date);
  const dayLabel =
    days === 0
      ? "Today"
      : days === 1
        ? "Yesterday"
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dayLabel} at ${time}`;
}

function groupNotifications(notifications: NotificationItem[]): NotificationGroup[] {
  const groups = new Map<string, NotificationGroup>();

  for (const notification of notifications) {
    const date = new Date(notification.created_at);
    const days = daysSince(date);
    const key =
      days === 0
        ? "today"
        : days === 1
          ? "yesterday"
          : date.toISOString().slice(0, 10);
    const label =
      days === 0
        ? "Today"
        : days === 1
          ? "Yesterday"
          : date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            });
    const group = groups.get(key) ?? { key, label, items: [] };
    group.items.push(notification);
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

interface NotificationCardProps {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
}

function NotificationCard({ notification, onMarkRead }: NotificationCardProps) {
  const Icon =
    ICON_BY_SOURCE_TYPE[notification.sourceType] ??
    ICON_BY_CATEGORY[notification.type];

  return (
    <article
      className={`relative rounded-[14px] border shadow-[0_2px_10px_rgba(64,45,20,0.05)] transition focus-within:ring-2 focus-within:ring-[#C59B5F]/50 ${
        notification.is_read
          ? "border border-[#E5DEC9] bg-[#FFFDF9]"
          : "border-[1.5px] border-[#C59B5F] bg-[#FDF6EA]"
      }`}
    >
      <button
        type="button"
        onClick={() => onMarkRead(notification.id)}
        aria-label={`Mark ${notification.title} as read`}
        className="absolute inset-0 z-0 h-full w-full rounded-[14px] cursor-pointer"
      />
      <div className="pointer-events-none relative z-10 flex items-start gap-4 p-4">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-[#F2E9D9] text-[#B18345]">
          <Icon className="h-6 w-6" strokeWidth={1.7} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] leading-6 font-semibold text-[#1A1612]">
            {notification.title}
          </h3>
          <p className="mt-1 text-sm leading-5 text-[#5C5346]">
            {notification.body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <time
              dateTime={notification.created_at}
              className="text-xs text-[#8C7F6C]"
            >
              {formatTimestamp(notification.created_at)}
            </time>
            {notification.action_url && (
              <Link
                href={notification.action_url}
                onClick={() => onMarkRead(notification.id)}
                className="pointer-events-auto relative z-20 text-xs font-semibold text-[#9C743C] underline underline-offset-2 hover:text-[#7A5828]"
              >
                Open
              </Link>
            )}
          </div>
        </div>
        {!notification.is_read && (
          <span
            role="img"
            aria-label="Unread"
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#C59B5F]"
          />
        )}
      </div>
    </article>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<PreferenceKey, boolean>>(
    DEFAULT_PREFERENCES,
  );
  const [toast, setToast] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    const res = await fetch("/api/v1/notifications");
    if (!res.ok) return;

    const json = await res.json();
    const records = (json.data?.notifications ?? []) as NotificationRecord[];
    setNotifications(records.map(toNotificationItem));
    setPrefs({
      ...DEFAULT_PREFERENCES,
      ...(json.data?.preferences ?? {}),
    });
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

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  const filteredNotifications = useMemo(
    () =>
      activeFilter === "all"
        ? notifications
        : notifications.filter((notification) => notification.type === activeFilter),
    [activeFilter, notifications],
  );

  const groups = useMemo(
    () => groupNotifications(filteredNotifications),
    [filteredNotifications],
  );

  async function handleMarkAllRead() {
    const previous = notifications;
    if (!notifications.some((notification) => !notification.is_read)) return;

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, is_read: true })),
    );
    const res = await fetch("/api/v1/notifications/read-all", {
      method: "POST",
    });
    if (!res.ok) {
      setNotifications(previous);
      setToast("Unable to mark all notifications as read.");
    }
  }

  async function handleMarkRead(id: string) {
    const target = notifications.find((notification) => notification.id === id);
    if (!target || target.is_read) return;

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, is_read: true } : notification,
      ),
    );
    const res = await fetch(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
      method: "POST",
    });
    if (!res.ok) {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? target : notification,
        ),
      );
      setToast("Unable to mark notification as read.");
    }
  }

  async function handleTogglePreference(key: PreferenceKey) {
    const previous = prefs;
    const updated = { ...previous, [key]: !previous[key] };
    setPrefs(updated);

    const res = await fetch("/api/v1/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: updated }),
    });
    if (!res.ok) {
      setPrefs(previous);
      setToast("Unable to update notification preferences.");
      return;
    }
    setToast("Notification preferences updated.");
  }

  return (
    <div className="w-full">
      {toast && (
        <div
          role="status"
          className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl"
        >
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="notification-serif text-[36px] leading-tight font-bold text-[#14110E]">
                Notifications
              </h1>
              <p className="mt-1.5 text-sm text-[#665C4E]">
                Stay updated on your matches, messages and account activity.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              className="inline-flex items-center gap-2 rounded-full bg-[#14110E] px-6 py-3 text-xs font-semibold text-[#DFBE8A] shadow-sm transition hover:bg-[#1F1A16] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B5F]"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              <span>Mark All as Read</span>
            </button>
          </header>

          <div
            role="tablist"
            aria-label="Notification filters"
            className="mt-7 flex gap-2 overflow-x-auto pb-2"
          >
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter.id;
              const Icon = filter.icon;
              return (
                <button
                  key={filter.id}
                  id={`notification-filter-${filter.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="notification-list"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B5F] ${
                    isActive
                      ? "border-[#A9783D] bg-[#B18345] text-white shadow-md"
                      : "border-[#E5DEC9] bg-white/90 text-[#4A4034] shadow-sm hover:border-[#C59B5F]/60"
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-white" : "text-[#B18345]"}`}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  )}
                  <span>{filter.label}</span>
                  {filter.id === "all" && unreadCount > 0 && (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                        isActive
                          ? "bg-white text-[#9C743C]"
                          : "bg-[#F2E9D9] text-[#9C743C]"
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div
            id="notification-list"
            role="tabpanel"
            aria-labelledby={`notification-filter-${activeFilter}`}
            className="mt-5 space-y-6"
          >
            {groups.length === 0 ? (
              <div className="rounded-[14px] border border-[#E5DEC9] bg-[#FFFDF9] px-6 py-14 text-center shadow-[0_2px_10px_rgba(64,45,20,0.05)]">
                <Bell
                  className="mx-auto mb-3 h-8 w-8 text-[#B18345]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-[#4A4034]">
                  {activeFilter === "all"
                    ? "You have no notifications yet."
                    : "No notifications in this category."}
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <section
                  key={group.key}
                  aria-labelledby={`notification-group-${group.key}`}
                >
                  <h2
                    id={`notification-group-${group.key}`}
                    className="mb-3 text-lg font-semibold text-[#1A1612]"
                  >
                    {group.label}
                  </h2>
                  <div className="space-y-3">
                    {group.items.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onMarkRead={(id) => void handleMarkRead(id)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>

        <aside className="min-[900px]:sticky min-[900px]:top-6 min-[900px]:self-start">
          <div className="rounded-2xl border border-[#E5DEC9] bg-[#FFFDF9] p-6 shadow-[0_4px_18px_rgba(64,45,20,0.06)]">
            <h2 className="notification-serif text-[22px] leading-tight font-bold text-[#14110E]">
              Notification Preferences
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#665C4E]">
              Choose which updates you&apos;d like to receive from Ma&apos;aak.
            </p>

            <div className="mt-5 space-y-2">
              {PREFERENCES.map((preference) => {
                const Icon = preference.icon;
                return (
                  <label
                    key={preference.key}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-[#F8F2E9] px-3.5 py-3 transition hover:bg-[#F2E9D9]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon
                        className="h-[18px] w-[18px] shrink-0 text-[#B18345]"
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-[#2A241D]">
                        {preference.label}
                      </span>
                    </span>
                    <span className="relative inline-flex shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(prefs[preference.key])}
                        onChange={() => void handleTogglePreference(preference.key)}
                        className="peer h-[22px] w-[22px] cursor-pointer appearance-none rounded-[5px] border border-[#C59B5F]/70 bg-white checked:border-[#14110E] checked:bg-[#14110E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B5F]"
                      />
                      <Check
                        className="pointer-events-none absolute top-1/2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
