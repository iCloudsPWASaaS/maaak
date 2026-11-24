"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function RingsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="12" r="5.25" />
      <circle cx="15" cy="12" r="5.25" />
    </svg>
  );
}

export function Chip({
  icon,
  label,
  className = "",
}: {
  icon?: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#E4DBC9] bg-[#F5EEE2] px-3 py-1.5 text-[11px] font-medium text-[#4A4034] ${className}`}
    >
      {icon ? <span className="text-[#B18345]">{icon}</span> : null}
      <span>{label}</span>
    </span>
  );
}

export function InfoCard({
  icon,
  title,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[14px] border border-[#E8E0D4] bg-[#FFFDF9] p-5 shadow-[0_2px_10px_rgba(64,45,20,0.05)] ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center text-[#B18345]">
          {icon}
        </span>
        <h2 className="notification-serif text-[20px] leading-tight font-bold text-[#14110E]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function GlanceRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[24px_140px_1fr] items-center gap-3 border-b border-[#EEE7DC] py-3 last:border-0">
      <span className="flex h-6 w-6 items-center justify-center text-[#B18345]">
        {icon}
      </span>
      <dt className="text-[13px] font-semibold text-[#1A1612]">{label}</dt>
      <dd className="text-[13px] text-[#4A4034]">{value}</dd>
    </div>
  );
}

export function TabButton({
  id,
  label,
  icon,
  active,
  controls,
  onClick,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  controls: string;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`inline-flex min-w-[128px] flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-semibold whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B5F] md:min-w-0 ${
        active
          ? "bg-[#B18345] text-white shadow-[0_4px_12px_rgba(156,116,60,0.28)]"
          : "text-[#4A4034] hover:bg-[#F5EEE2]"
      }`}
    >
      <span className={active ? "text-white" : "text-[#B18345]"}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

const WAVEFORM_BARS = [
  10, 16, 24, 14, 30, 20, 36, 26, 16, 32, 22, 38, 28, 18, 34, 24, 14, 30, 20,
  36, 26, 16, 28, 18, 32, 22, 12, 20,
];

function formatDuration(value: number) {
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function VoiceIntroPlayer({
  src,
  duration = 30,
}: {
  src?: string;
  duration?: number;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const total = duration > 0 ? duration : 30;

  useEffect(() => {
    if (!playing || src) return;
    const timer = window.setInterval(() => {
      setCurrentTime((previous) => {
        if (previous >= total) {
          setPlaying(false);
          return total;
        }
        return Math.min(total, previous + 0.25);
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing, src, total]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    const handleTime = () => setCurrentTime(audio.currentTime || 0);
    const handleEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  const togglePlayback = async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    if (currentTime >= total) setCurrentTime(0);
    setPlaying(true);
    if (src && audioRef.current) {
      try {
        await audioRef.current.play();
      } catch {
        setPlaying(false);
      }
    }
  };

  const progress = Math.min(1, currentTime / total);

  return (
    <div className="mt-4 flex items-center gap-3 rounded-full border border-[#E8E0D4] bg-white px-3 py-2 shadow-sm">
      <audio ref={audioRef} src={src || undefined} preload="metadata" />
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={
          playing
            ? `Pause voice introduction, ${total} seconds`
            : `Play voice introduction, ${total} seconds`
        }
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#DFBE8A] to-[#B18345] text-white shadow-sm transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B5F]"
      >
        {playing ? (
          <Pause className="h-4 w-4" fill="currentColor" aria-hidden="true" />
        ) : (
          <Play className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden="true" />
        )}
      </button>
      <div className="flex h-7 flex-1 items-center gap-[3px]" aria-hidden="true">
        {WAVEFORM_BARS.map((height, index) => (
          <span
            key={index}
            className={`w-full max-w-[3px] rounded-full ${
              index / WAVEFORM_BARS.length <= progress
                ? "bg-[#B18345]"
                : "bg-[#DCCDB3]"
            }`}
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
      <span className="shrink-0 text-[11px] font-semibold text-[#4A4034]">
        {formatDuration(total)}
      </span>
    </div>
  );
}
