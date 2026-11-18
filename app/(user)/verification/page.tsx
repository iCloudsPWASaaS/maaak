"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function VerificationPage() {
  const [statusData, setStatusData] = useState<{
    id_verified: boolean;
    latestSession: Record<string, unknown> | null;
    history: Record<string, unknown>[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    const res = await fetch("/api/v1/verification/status");
    if (res.ok) {
      const json = await res.json();
      setStatusData(json.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleStartOrRetry(isRetry = false) {
    setStarting(true);
    const endpoint = isRetry
      ? "/api/v1/verification/retry"
      : "/api/v1/verification/start";
    const res = await fetch(endpoint, { method: "POST" });
    const json = await res.json();
    setStarting(false);

    if (res.ok && json.data?.redirectUrl) {
      setRedirectUrl(json.data.redirectUrl);
      setToast("Didit verification session generated!");
      loadStatus();
    } else {
      setToast(json.message || "Could not start Didit session.");
    }
  }

  if (loading) {
    return <div className="h-72 animate-pulse rounded-3xl bg-[#EFE8DC]" />;
  }

  const isVerified = Boolean(statusData?.id_verified);
  const latest = statusData?.latestSession;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {toast && (
        <div className="fixed right-6 bottom-20 z-50 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl">
          {toast}
        </div>
      )}

      <div className="rounded-3xl border border-[#C59B5F]/40 bg-[#14110E] p-8 text-[#FAF6F0]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#DFBE8A]">
              Didit.me Identity Verification
            </span>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-white">
              Checked, Verified &amp; Trusted Badge
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/75">
              Ma&apos;aak integrates with Didit.me (Workflow{" "}
              <code>15480d9c-b20f-45f7-ae86-9aa8f71e8a41</code>) to verify
              Passports and Driving Licences. We never store raw identity
              documents—only the cryptographically verified webhook status.
            </p>
          </div>

          {isVerified ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white">
              <CheckCircle2 className="h-4 w-4" />
              <span>ID Verified (Blue Tick Active)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-5 py-2.5 text-xs font-bold text-[#DFBE8A]">
              <Clock className="h-4 w-4" />
              <span>Verification Pending</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-[#E5DEC9] bg-white p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#1A1612]">
              {isVerified
                ? "Alhamdulillah, Your Identity is Verified"
                : "Complete Your Didit Identity Verification"}
            </h2>
            <p className="mt-1 text-xs text-[#665C4E]">
              Frontend callbacks are never trusted as proof of verification;
              your verified badge is awarded when Didit&apos;s signed webhook
              confirms approval.
            </p>
          </div>

          {!isVerified && (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={starting}
                onClick={() => handleStartOrRetry(false)}
                className="inline-flex items-center gap-2 rounded-full bg-[#14110E] px-6 py-3 text-xs font-semibold text-[#DFBE8A]"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {starting ? "Creating Session..." : "Start Verification"}
                </span>
              </button>

              {latest && (
                <button
                  type="button"
                  disabled={starting}
                  onClick={() => handleStartOrRetry(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#C59B5F] px-5 py-3 text-xs font-semibold text-[#1A1612]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}
        </div>

        {redirectUrl && (
          <div className="mt-6 rounded-2xl border border-[#C59B5F] bg-[#FAF6F0] p-5">
            <div className="text-xs font-semibold text-[#1A1612]">
              Your Didit Verification Session is Ready
            </div>
            <p className="mt-1 text-xs text-[#665C4E] break-all">
              Session URL: {redirectUrl}
            </p>
            <a
              href={redirectUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#C59B5F] px-5 py-2 text-xs font-bold text-[#14110E]"
            >
              <span>Continue to Didit Verification</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* Verification Session History */}
        <div className="mt-8 border-t border-[#E5DEC9] pt-6">
          <h3 className="font-serif text-lg font-semibold text-[#1A1612]">
            Verification Sessions
          </h3>
          <div className="mt-3 space-y-2.5">
            {(statusData?.history || []).length === 0 ? (
              <p className="text-xs text-[#665C4E]">
                No verification sessions started yet.
              </p>
            ) : (
              (statusData?.history || []).map((s) => (
                <div
                  key={String(s.id)}
                  className="flex flex-wrap items-center justify-between rounded-xl bg-[#FAF6F0] px-4 py-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-[#1A1612]">
                      Session: {String(s.didit_session_id)}
                    </div>
                    <div className="text-[#665C4E]">
                      Created: {new Date(String(s.created_at)).toLocaleString()}
                    </div>
                  </div>
                  <span className="rounded-full bg-[#14110E] px-3 py-1 font-bold text-[#DFBE8A]">
                    {String(s.status).toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
