"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";
import {
  Send,
  Phone,
  Video,
  XCircle,
  Lock,
  CheckCheck,
  ShieldCheck,
} from "lucide-react";

interface ConversationItem {
  id: string;
  status: "active" | "closed" | "blocked";
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
  partner: {
    id: string;
    first_name: string;
    username: string;
    id_verified: boolean;
    photo_url: string | null;
  } | null;
}

interface MessageItem {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeChatsCount, setActiveChatsCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/v1/conversations");
    if (res.ok) {
      const json = await res.json();
      const list = (json.data?.conversations || []) as ConversationItem[];
      setConversations(list);
      setActiveChatsCount(Number(json.data?.activeChatsCount || 0));
      if (!selectedConvId && list.length > 0) {
        const queryConvId = new URLSearchParams(window.location.search).get(
          "conversation",
        );
        const queried = queryConvId
          ? list.find((item) => item.id === queryConvId)
          : undefined;
        setSelectedConvId(queried?.id || list[0].id);
      }
    }
  }, [selectedConvId]);

  const loadMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/v1/conversations/${convId}/messages`);
    if (res.ok) {
      const json = await res.json();
      setMessages(json.data?.messages || []);
      await fetch(`/api/v1/conversations/${convId}/read`, { method: "POST" });
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

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
    const refresh = () => void loadConversations();

    channel.bind("message-notification", refresh);
    channel.bind("new-request", refresh);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [currentUserId, loadConversations]);

  useEffect(() => {
    if (selectedConvId) {
      void loadMessages(selectedConvId);
    }
  }, [selectedConvId, loadMessages]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
    if (!key || !selectedConvId) return;

    const pusher = new Pusher(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || "eu",
      authEndpoint: "/api/v1/pusher/auth",
    });
    const channelName = `private-conversation-${selectedConvId}`;
    const channel = pusher.subscribe(channelName);

    channel.bind("new-message", (payload: { message?: MessageItem }) => {
      const message = payload.message;
      if (!message) return;
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message],
      );
      void loadConversations();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [selectedConvId, loadConversations]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConvId || !inputText.trim()) return;

    const res = await fetch(`/api/v1/conversations/${selectedConvId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: inputText }),
    });
    const json = await res.json();
    if (res.ok) {
      setInputText("");
      await loadMessages(selectedConvId);
      await loadConversations();
    } else {
      setToast(json.message || "Failed to send message.");
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function handleCloseConversation(convId: string) {
    const res = await fetch(`/api/v1/conversations/${convId}/close`, {
      method: "POST",
    });
    const json = await res.json();
    setToast(json.message);
    setTimeout(() => setToast(null), 4000);
    await loadConversations();
  }

  async function handleStartCall(partnerId: string, callType: "audio" | "video") {
    const res = await fetch("/api/v1/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calleeId: partnerId,
        callType,
        conversationId: selectedConvId,
      }),
    });
    const json = await res.json();
    if (res.ok && json.data?.call?.id) {
      router.push(`/calls?callId=${json.data.call.id}`);
    } else {
      setToast(json.message || "Unable to initiate call.");
      setTimeout(() => setToast(null), 4000);
    }
  }

  const currentConv = conversations.find((c) => c.id === selectedConvId) || null;
  const realtimeEnabled = Boolean(process.env.NEXT_PUBLIC_PUSHER_APP_KEY);

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl">
          {toast}
        </div>
      )}

      {/* Active Chat Limit Banner (Max 3 Active Chats Rule) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#C59B5F]/40 bg-[#14110E] px-6 py-4 text-xs text-[#FAF6F0]">
        <div className="flex items-center gap-2.5">
          <Lock className="h-4 w-4 text-[#C59B5F]" />
          <span>
            <strong>Intentional Courtship Policy:</strong> You may hold a
            maximum of <strong>3 active chats</strong> at any one time. Closed
            conversations do not count toward your limit.
          </span>
        </div>
        <span className="rounded-full bg-[#C59B5F] px-3.5 py-1 font-bold text-[#14110E]">
          Active Chats: {activeChatsCount} / 3
        </span>
      </div>

      <div className="grid min-h-[540px] overflow-hidden rounded-3xl border border-[#E5DEC9] bg-white shadow-xs lg:grid-cols-12">
        {/* Left Conversations List */}
        <div className="border-r border-[#E5DEC9] bg-[#FAF6F0] lg:col-span-4">
          <div className="border-b border-[#E5DEC9] p-4 font-serif text-lg font-semibold text-[#1A1612]">
            My Conversations ({conversations.length})
          </div>
          <div className="divide-y divide-[#E5DEC9]">
            {conversations.length === 0 ? (
              <p className="p-6 text-xs text-[#665C4E]">
                No conversations yet. Accept an introduction request or message
                an eligible match to begin.
              </p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedConvId(c.id)}
                  className={`flex w-full items-center justify-between p-4 text-left transition ${
                    selectedConvId === c.id ? "bg-white" : "hover:bg-white/60"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-serif text-base font-semibold text-[#1A1612]">
                      <span>{c.partner?.first_name || "Member"}</span>
                      {c.partner?.id_verified && (
                        <ShieldCheck className="h-3.5 w-3.5 text-[#9C743C]" />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[#665C4E]">
                      {c.last_message_preview}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.status === "active"
                          ? "bg-emerald-900/10 text-emerald-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {c.status}
                    </span>
                    {c.unread_count > 0 && (
                      <span className="rounded-full bg-[#C59B5F] px-2 py-0.5 text-[10px] font-bold text-[#14110E]">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Active Chat Window */}
        <div className="flex flex-col justify-between lg:col-span-8">
          {currentConv ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5DEC9] px-6 py-4">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
                    {currentConv.partner?.first_name || "Conversation"}
                  </h2>
                  <p className="text-[11px] text-[#665C4E]">
                    Status: {currentConv.status.toUpperCase()} •{" "}
                    {realtimeEnabled ? "Real-time enabled" : "Secure conversation"}
                  </p>
                </div>

                {currentConv.status === "active" && currentConv.partner && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleStartCall(currentConv.partner!.id, "audio")
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-[#E5DEC9] px-3 py-1.5 text-xs font-semibold text-[#1A1612] hover:border-[#C59B5F]"
                    >
                      <Phone className="h-3.5 w-3.5 text-[#9C743C]" />
                      <span>Voice Call</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleStartCall(currentConv.partner!.id, "video")
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-[#E5DEC9] px-3 py-1.5 text-xs font-semibold text-[#1A1612] hover:border-[#C59B5F]"
                    >
                      <Video className="h-3.5 w-3.5 text-[#9C743C]" />
                      <span>Video Call</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCloseConversation(currentConv.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>End Chat (Free Slot)</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-6">
                {messages.map((m) => {
                  const isPartner = m.sender_id === currentConv.partner?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${
                        isPartner ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-md rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          isPartner
                            ? "bg-[#FAF6F0] text-[#1A1612] border border-[#E5DEC9]"
                            : "bg-[#14110E] text-[#FAF6F0]"
                        }`}
                      >
                        <p>{m.content}</p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-65">
                          <span>
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {!isPartner && (
                            <CheckCheck className="h-3 w-3 text-[#DFBE8A]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {currentConv.status === "active" ? (
                <form
                  onSubmit={handleSendMessage}
                  className="flex gap-2 border-t border-[#E5DEC9] p-4"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Write a respectful message..."
                    className="flex-1 rounded-full border border-[#E5DEC9] bg-[#FAF6F0] px-4 py-2.5 text-xs focus:border-[#C59B5F] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#14110E] px-5 py-2.5 text-xs font-semibold text-[#DFBE8A]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              ) : (
                <div className="border-t border-[#E5DEC9] bg-[#FAF6F0] p-4 text-center text-xs text-[#665C4E]">
                  This conversation is closed and no longer counts toward your 3
                  active chats limit.
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-12 text-center text-xs text-[#665C4E]">
              Select a conversation on the left to view messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
