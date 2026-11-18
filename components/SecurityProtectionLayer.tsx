"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

export function SecurityProtectionLayer({
  children,
}: {
  children: React.ReactNode;
}) {
  const [deterrentAlert, setDeterrentAlert] = useState<string | null>(null);

  useEffect(() => {
    const logSuspiciousEvent = (eventType: string, details: Record<string, unknown> = {}) => {
      fetch("/api/v1/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ securityEvent: eventType, details }),
      }).catch(() => {});
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      e.preventDefault();
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      e.preventDefault();
      setDeterrentAlert(
        "Copying profile content is disabled to protect member privacy.",
      );
      logSuspiciousEvent("copy_attempt");
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === "IMG") {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const rawKey = typeof e.key === "string" ? e.key : "";
      const key = rawKey.toLowerCase();
      const isPrintScreen = rawKey === "PrintScreen" || e.keyCode === 44;
      const isMacScreenshot =
        e.metaKey && e.shiftKey && ["3", "4", "5"].includes(key);
      const isWinSnip = e.metaKey && e.shiftKey && key === "s";
      const isPrintOrSave =
        (e.ctrlKey || e.metaKey) && (key === "p" || key === "s");

      if (isPrintScreen || isMacScreenshot || isWinSnip || isPrintOrSave) {
        e.preventDefault();
        setDeterrentAlert(
          "Screenshots, printing, and screen capture shortcuts are restricted on Ma'aak to protect member dignity and privacy.",
        );
        logSuspiciousEvent("capture_shortcut_detected", { key: rawKey || "Unknown" });
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyCut);
    document.addEventListener("cut", handleCopyCut);
    document.addEventListener("dragstart", handleDragStart);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyCut);
      document.removeEventListener("cut", handleCopyCut);
      document.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!deterrentAlert) return;
    const t = setTimeout(() => setDeterrentAlert(null), 5000);
    return () => clearTimeout(t);
  }, [deterrentAlert]);

  return (
    <div className="maaak-protected relative min-h-screen">
      {deterrentAlert && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-full border border-[#C59B5F] bg-[#14110E] px-5 py-3 text-xs font-medium text-[#FAF6F0] shadow-2xl"
        >
          <ShieldAlert className="h-4 w-4 shrink-0 text-[#C59B5F]" />
          <span>{deterrentAlert}</span>
        </div>
      )}
      {children}
    </div>
  );
}

export function WatermarkedPhoto({
  src,
  alt,
  watermarkText = "MA'AAK VERIFIED VIEW",
  className = "",
}: {
  src: string;
  alt: string;
  watermarkText?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden select-none ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="h-full w-full object-cover"
      />
      {/* Subtle diagonal anti-scrape watermark overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-3 opacity-25"
      >
        <span className="self-end rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold tracking-widest text-white">
          {watermarkText}
        </span>
        <span className="-rotate-12 text-[10px] font-bold tracking-[0.22em] text-white drop-shadow">
          {watermarkText}
        </span>
        <span className="self-start text-[8px] font-medium tracking-widest text-white/80">
          DO NOT SCREENSHOT
        </span>
      </div>
    </div>
  );
}
