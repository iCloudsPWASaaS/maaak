"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Trash2, MessageCircle, ShieldCheck } from "lucide-react";

export default function IntroductionRequestsPage() {
  const [received, setReceived] = useState<Record<string, unknown>[]>([]);
  const [sent, setSent] = useState<Record<string, unknown>[]>([]);
  const [entitlements, setEntitlements] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function loadRequests() {
    const [recRes, sentRes] = await Promise.all([
      fetch("/api/v1/requests/received"),
      fetch("/api/v1/requests/sent"),
    ]);
    if (recRes.ok) {
      const rJson = await recRes.json();
      setReceived(rJson.data?.requests || []);
    }
    if (sentRes.ok) {
      const sJson = await sentRes.json();
      setSent(sJson.data?.requests || []);
      setEntitlements(sJson.data?.entitlements || null);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleAccept(id: string) {
    const res = await fetch(`/api/v1/requests/${id}/accept`, {
      method: "POST",
    });
    const json = await res.json();
    setToast(json.message);
    setTimeout(() => setToast(null), 4000);
    loadRequests();
  }

  async function handleReject(id: string) {
    const res = await fetch(`/api/v1/requests/${id}/reject`, {
      method: "POST",
    });
    const json = await res.json();
    setToast(json.message);
    setTimeout(() => setToast(null), 3000);
    loadRequests();
  }

  async function handleCancel(id: string) {
    const res = await fetch(`/api/v1/requests/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    setToast(json.message);
    setTimeout(() => setToast(null), 3000);
    loadRequests();
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
          <span className="text-xs font-bold uppercase tracking-widest text-[#9C743C]">
            Marriage Introductions
          </span>
          <h1 className="font-serif text-3xl font-semibold text-[#1A1612]">
            Received &amp; Sent Introduction Requests
          </h1>
        </div>
        {entitlements && (
          <div className="rounded-full border border-[#C59B5F] bg-[#14110E] px-4 py-2 text-xs text-[#DFBE8A]">
            {entitlements.maxIntroductionRequests !== null &&
            entitlements.maxIntroductionRequests !== undefined
              ? `Free Allowance: ${String(entitlements.introductionRequestsRemaining)} / ${String(entitlements.maxIntroductionRequests)} requests remaining`
              : "Premium Plan: Unlimited Introduction Requests"}
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Received Requests */}
        <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-xs">
          <h2 className="font-serif text-2xl font-semibold text-[#1A1612]">
            Received Requests ({received.length})
          </h2>
          <div className="mt-4 space-y-4">
            {received.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#665C4E]">
                No received introduction requests yet.
              </p>
            ) : (
              received.map((r) => {
                const sender = (r.sender || {}) as Record<string, unknown>;
                return (
                  <div
                    key={String(r.id)}
                    className="rounded-2xl border border-[#E5DEC9] bg-[#FAF6F0] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Link
                          href={`/profiles/${String(sender.id || r.sender_id)}`}
                          className="font-serif text-lg font-semibold text-[#1A1612] hover:underline"
                        >
                          {String(sender.first_name || "Member")}
                          {sender.age ? `, ${String(sender.age)}` : ""}
                        </Link>
                        <p className="text-xs text-[#665C4E]">
                          {String(sender.city || "")} •{" "}
                          {String(sender.profession || "")}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#14110E] px-3 py-1 text-[11px] font-semibold text-[#DFBE8A]">
                        {String(r.status).toUpperCase()}
                      </span>
                    </div>

                    <p className="mt-2.5 text-xs italic text-[#3D362D]">
                      &ldquo;{String(r.message || "")}&rdquo;
                    </p>

                    {r.status === "pending" && (
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAccept(String(r.id))}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-800 px-4 py-1.5 text-xs font-semibold text-white"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Accept &amp; Open Chat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(String(r.id))}
                          className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-white px-4 py-1.5 text-xs font-semibold text-rose-700"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}

                    {r.status === "accepted" && (
                      <div className="mt-3">
                        <Link
                          href="/messages"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9C743C] underline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>Go to Active Conversation</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sent Requests */}
        <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-xs">
          <h2 className="font-serif text-2xl font-semibold text-[#1A1612]">
            Sent Requests ({sent.length})
          </h2>
          <div className="mt-4 space-y-4">
            {sent.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#665C4E]">
                You haven&apos;t sent any introduction requests yet.
              </p>
            ) : (
              sent.map((r) => {
                const recipient = (r.recipient || {}) as Record<string, unknown>;
                return (
                  <div
                    key={String(r.id)}
                    className="rounded-2xl border border-[#E5DEC9] bg-[#FAF6F0] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Link
                          href={`/profiles/${String(recipient.id || r.receiver_id)}`}
                          className="inline-flex items-center gap-1 font-serif text-lg font-semibold text-[#1A1612] hover:underline"
                        >
                          <span>{String(recipient.first_name || "Member")}</span>
                          {Boolean(recipient.id_verified) && (
                            <ShieldCheck className="h-4 w-4 text-[#9C743C]" />
                          )}
                        </Link>
                        <p className="text-xs text-[#665C4E]">
                          {String(recipient.city || "")} •{" "}
                          {String(recipient.profession || "")}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#14110E] px-3 py-1 text-[11px] font-semibold text-[#DFBE8A]">
                        {String(r.status).toUpperCase()}
                      </span>
                    </div>

                    <p className="mt-2.5 text-xs italic text-[#3D362D]">
                      &ldquo;{String(r.message || "")}&rdquo;
                    </p>

                    {r.status === "pending" && (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCancel(String(r.id))}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Cancel Request</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
