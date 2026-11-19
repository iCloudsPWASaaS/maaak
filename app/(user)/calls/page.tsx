"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
} from "agora-rtc-sdk-ng";
import Pusher from "pusher-js";
import {
  Phone,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Check,
  ShieldCheck,
} from "lucide-react";

interface CallRecord {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: "audio" | "video";
  channel_name: string;
  status: string;
  duration_seconds: number;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
}

interface AgoraBundle {
  token: string;
  appId: string;
  channelName: string;
  uid?: string;
  expiresAt?: string;
}

interface CallEventPayload {
  call?: CallRecord;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [agoraToken, setAgoraToken] = useState<AgoraBundle | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const audioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const videoTrackRef = useRef<ILocalVideoTrack | null>(null);

  const activeCallId = activeCall?.id;
  const activeCallStatus = activeCall?.status;
  const activeCallType = activeCall?.call_type;
  const activeChannel = activeCall?.channel_name;

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadCalls = useCallback(async () => {
    const res = await fetch("/api/v1/calls");
    if (!res.ok) return;

    const json = await res.json();
    const list = (json.data?.calls || []) as CallRecord[];
    setCalls(list);

    setActiveCall((current) => {
      if (
        current &&
        (current.status === "ringing" || current.status === "accepted") &&
        list.some((item) => item.id === current.id && item.status === current.status)
      ) {
        return current;
      }

      const queryCallId = new URLSearchParams(window.location.search).get("callId");
      const queried = queryCallId
        ? list.find((item) => item.id === queryCallId)
        : undefined;
      if (queried && ["ringing", "accepted"].includes(queried.status)) {
        return queried;
      }

      return (
        list.find(
          (item) => item.status === "ringing" || item.status === "accepted",
        ) || null
      );
    });
  }, []);

  const requestToken = useCallback(
    async (callId: string): Promise<AgoraBundle | null> => {
      const res = await fetch(`/api/v1/calls/${callId}/token`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.data?.agora?.token) {
        showToast(json.message || "Unable to refresh the Agora token.");
        return null;
      }
      const bundle = json.data.agora as AgoraBundle;
      setAgoraToken(bundle);
      return bundle;
    },
    [showToast],
  );

  useEffect(() => {
    void loadCalls();
  }, [loadCalls]);

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
    setMuted(false);
    setCameraOff(false);
  }, [activeCallId]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
    if (!key || !currentUserId) return;

    const pusher = new Pusher(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || "eu",
      authEndpoint: "/api/v1/pusher/auth",
    });
    const channelName = `private-user-${currentUserId}`;
    const channel = pusher.subscribe(channelName);

    channel.bind("incoming-call", (payload: CallEventPayload) => {
      if (!payload.call) return;
      setActiveCall(payload.call);
      setAgoraToken(null);
      showToast(`Incoming ${payload.call.call_type} call.`);
      void loadCalls();
    });

    channel.bind("call-accepted", (payload: CallEventPayload) => {
      if (!payload.call) return;
      setActiveCall(payload.call);
      showToast("Call accepted. Connecting securely...");
      void requestToken(payload.call.id);
      void loadCalls();
    });

    channel.bind("call-rejected", (payload: CallEventPayload) => {
      if (!payload.call) return;
      setActiveCall(null);
      setAgoraToken(null);
      showToast("The call was declined.");
      void loadCalls();
    });

    channel.bind("call-ended", (payload: CallEventPayload) => {
      if (!payload.call) return;
      setActiveCall(null);
      setAgoraToken(null);
      showToast("The call has ended.");
      void loadCalls();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [currentUserId, loadCalls, requestToken, showToast]);

  useEffect(() => {
    if (activeCallId && activeCallStatus === "accepted" && !agoraToken) {
      void requestToken(activeCallId);
    }
  }, [activeCallId, activeCallStatus, agoraToken, requestToken]);

  useEffect(() => {
    let cancelled = false;

    if (
      !activeCallId ||
      !activeChannel ||
      !agoraToken?.token ||
      !agoraToken.appId ||
      activeCallStatus !== "accepted"
    ) {
      return;
    }

    const remoteContainer = remoteVideoRef.current;
    const localContainer = localVideoRef.current;

    void (async () => {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      if (cancelled) return;

      AgoraRTC.setLogLevel(4);
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "h264" });

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video" && user.videoTrack && remoteContainer) {
          user.videoTrack.play(remoteContainer);
          setMediaReady(true);
        }
        if (mediaType === "audio" && user.audioTrack) {
          user.audioTrack.play();
        }
      });

      client.on("user-unpublished", (_user, mediaType) => {
        if (mediaType === "video") setMediaReady(false);
      });

      client.on("token-privilege-will-expire", () => {
        void requestToken(activeCallId).then((bundle) => {
          if (bundle && !cancelled) client.renewToken(bundle.token);
        });
      });

      await client.join(
        agoraToken.appId,
        activeChannel,
        agoraToken.token,
        agoraToken.uid || currentUserId || null,
      );
      if (cancelled) {
        await client.leave();
        return;
      }

      const audio = await AgoraRTC.createMicrophoneAudioTrack();
      const video =
        activeCallType === "video"
          ? await AgoraRTC.createCameraVideoTrack()
          : null;

      if (cancelled) {
        audio.stop();
        video?.stop();
        await client.leave();
        return;
      }

      if (video && localContainer) {
        video.play(localContainer);
      }

      const tracks: Array<ILocalAudioTrack | ILocalVideoTrack> = [audio];
      if (video) tracks.push(video);
      await client.publish(tracks);

      clientRef.current = client;
      audioTrackRef.current = audio;
      videoTrackRef.current = video;
      setMediaReady(Boolean(video));
    })().catch(() => {
      showToast("Unable to access Agora media. Check microphone/camera permissions.");
    });

    return () => {
      cancelled = true;
      audioTrackRef.current?.stop();
      videoTrackRef.current?.stop();
      if (clientRef.current) void clientRef.current.leave();
      clientRef.current = null;
      audioTrackRef.current = null;
      videoTrackRef.current = null;
      setMediaReady(false);
      remoteContainer?.replaceChildren();
      localContainer?.replaceChildren();
    };
  }, [
    activeCallId,
    activeCallStatus,
    activeCallType,
    activeChannel,
    agoraToken,
    currentUserId,
    requestToken,
    showToast,
  ]);

  useEffect(() => {
    void audioTrackRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    void videoTrackRef.current?.setMuted(cameraOff);
  }, [cameraOff, mediaReady]);

  async function handleAcceptCall(callId: string) {
    const res = await fetch(`/api/v1/calls/${callId}/accept`, {
      method: "POST",
    });
    const json = await res.json();
    if (res.ok) {
      setActiveCall(json.data.call);
      setAgoraToken(json.data.agora);
      showToast("Connected via Agora secure RTC channel!");
      await loadCalls();
    } else {
      showToast(json.message || "Unable to accept the call.");
    }
  }

  async function handleRejectCall(callId: string) {
    await fetch(`/api/v1/calls/${callId}/reject`, { method: "POST" });
    setActiveCall(null);
    setAgoraToken(null);
    await loadCalls();
  }

  async function handleEndCall(callId: string) {
    await fetch(`/api/v1/calls/${callId}/end`, { method: "POST" });
    setActiveCall(null);
    setAgoraToken(null);
    showToast("Call ended.");
    await loadCalls();
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
          Voice &amp; Video Calls
          <span className="ml-3 inline-flex items-center rounded-full border border-[#C59B5F]/40 bg-[#C59B5F]/15 px-3 py-1 align-middle text-[11px] font-bold uppercase tracking-wide text-[#9C743C]">
            Coming Soon
          </span>
        </h1>
      </div>

      {activeCall ? (
        <div className="rounded-3xl border-2 border-[#C59B5F] bg-[#14110E] p-8 text-[#FAF6F0] shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C59B5F]/20 px-3 py-1 text-xs font-semibold text-[#DFBE8A]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Channel: {activeCall.channel_name}
              </span>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-white">
                {activeCall.call_type === "video" ? "Video Call" : "Voice Call"}{" "}
                ({activeCall.status.toUpperCase()})
              </h2>
            </div>

            <button
              type="button"
              onClick={() => void requestToken(activeCall.id)}
              className="rounded-full border border-[#C59B5F] px-4 py-1.5 text-xs font-semibold text-[#DFBE8A]"
            >
              Refresh Secure Token
            </button>
          </div>

          <div className="mt-4 text-[11px] text-white/60">
            {agoraToken
              ? `Agora token ready${agoraToken.expiresAt ? ` • expires ${new Date(agoraToken.expiresAt).toLocaleTimeString()}` : ""}`
              : activeCall.status === "ringing"
                ? "Waiting for the recipient to accept..."
                : "Requesting secure Agora token..."}
          </div>

          <div className="my-8 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/50">
                {activeCall.call_type === "video" ? "Remote video" : "Live call"}
              </p>
              <div className="relative h-64 overflow-hidden rounded-2xl border border-white/10 bg-[#1F1A16]">
                <div ref={remoteVideoRef} className="absolute inset-0" />
                {!mediaReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {activeCall.call_type === "video" ? (
                      <Video className="h-12 w-12 text-[#DFBE8A]" />
                    ) : (
                      <Phone className="h-12 w-12 text-[#DFBE8A]" />
                    )}
                    <p className="mt-3 text-sm text-white/80">
                      {activeCall.status === "ringing"
                        ? "Ringing participant..."
                        : "Waiting for remote media..."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {activeCall.call_type === "video" && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/50">
                  Your video
                </p>
                <div className="relative h-64 overflow-hidden rounded-2xl border border-white/10 bg-[#1F1A16]">
                  <div ref={localVideoRef} className="absolute inset-0" />
                  {!mediaReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-white/50">
                      Starting camera...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4">
            {activeCall.status === "ringing" && (
              <>
                <button
                  type="button"
                  onClick={() => void handleAcceptCall(activeCall.id)}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-xs font-bold text-white"
                >
                  <Check className="h-4 w-4" />
                  <span>Accept Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleRejectCall(activeCall.id)}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-6 py-3 text-xs font-bold text-white"
                >
                  <PhoneOff className="h-4 w-4" />
                  <span>Reject</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                const next = !muted;
                void audioTrackRef.current?.setMuted(next);
                setMuted(next);
              }}
              className="rounded-full border border-white/20 bg-white/10 p-3.5 text-white"
            >
              {muted ? (
                <MicOff className="h-5 w-5 text-rose-400" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>

            {activeCall.call_type === "video" && (
              <button
                type="button"
                onClick={() => {
                  const next = !cameraOff;
                  void videoTrackRef.current?.setMuted(next);
                  setCameraOff(next);
                }}
                className="rounded-full border border-white/20 bg-white/10 p-3.5 text-white"
              >
                {cameraOff ? (
                  <CameraOff className="h-5 w-5 text-rose-400" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleEndCall(activeCall.id)}
              className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-6 py-3.5 text-xs font-bold text-white"
            >
              <PhoneOff className="h-4 w-4" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#E5DEC9] bg-white p-8 text-center">
          <Video className="mx-auto h-10 w-10 text-[#9C743C]" />
          <h2 className="mt-3 font-serif text-xl font-semibold text-[#1A1612]">
            No Active Call Right Now
          </h2>
          <p className="mt-1 text-xs text-[#665C4E]">
            Start a Voice or Video call directly from any active conversation in
            Messages.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-xs">
        <h2 className="font-serif text-2xl font-semibold text-[#1A1612]">
          Call History ({calls.length})
        </h2>
        <div className="mt-4 divide-y divide-[#FAF6F0]">
          {calls.length === 0 ? (
            <p className="py-6 text-xs text-[#665C4E]">No call records yet.</p>
          ) : (
            calls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between py-3.5 text-xs"
              >
                <div className="flex items-center gap-3">
                  {call.call_type === "video" ? (
                    <Video className="h-4 w-4 text-[#9C743C]" />
                  ) : (
                    <Phone className="h-4 w-4 text-[#9C743C]" />
                  )}
                  <div>
                    <div className="font-semibold text-[#1A1612]">
                      {call.call_type === "video" ? "Video Call" : "Voice Call"} •{" "}
                      {call.channel_name}
                    </div>
                    <div className="text-[#665C4E]">
                      {new Date(call.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#FAF6F0] px-3 py-1 font-semibold text-[#8C6D3F]">
                    {call.status.toUpperCase()} ({call.duration_seconds}s)
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
