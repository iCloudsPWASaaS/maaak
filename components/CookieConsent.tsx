"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "maaak-cookie-consent";

export const DEFAULT_COOKIE_CONSENT_CONTENT = {
  title: "Your privacy matters",
  bodyBefore:
    "We use cookies to keep you signed in, remember your preferences and improve your experience. Read our",
  bodyBetween: "and",
  bodyAfter: ".",
  accept: "Accept all",
  decline: "Decline",
  preferences: "Manage preferences",
  save: "Save choices",
  essential: "Essential cookies",
  alwaysOn: "(always on)",
  analytics: "Analytics cookies",
  advertising: "Advertising cookies",
};

interface CookieConsentContent {
  title?: string;
  bodyBefore?: string;
  bodyBetween?: string;
  bodyAfter?: string;
  accept?: string;
  decline?: string;
  preferences?: string;
  save?: string;
  essential?: string;
  alwaysOn?: string;
  analytics?: string;
  advertising?: string;
}

type Consent = {
  essential: true;
  analytics: boolean;
  advertising: boolean;
};

function saveConsent(consent: Consent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    return false;
  }
  return true;
}

export function CookieConsent({
  content = DEFAULT_COOKIE_CONSENT_CONTENT,
}: {
  content?: CookieConsentContent;
}) {
  const [visible, setVisible] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const text = { ...DEFAULT_COOKIE_CONSENT_CONTENT, ...content };

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function decide(consent: Consent) {
    saveConsent(consent);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed right-4 bottom-28 left-4 z-40 max-w-md rounded-2xl border border-[#C59B5F]/40 bg-[#1F1A16] p-5 text-[#FAF6F0] shadow-2xl sm:right-auto sm:bottom-6 sm:left-6 sm:w-96">
      <div className="flex items-start gap-3">
        <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-[#C59B5F]" />
        <div>
          <h3 className="text-base font-semibold text-[#DFBE8A]">{text.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#FAF6F0]/85">
            {text.bodyBefore}{" "}
            <Link
              href="/cookie-policy"
              className="font-medium text-[#DFBE8A] underline"
            >
              Cookie Policy
            </Link>{" "}
            {text.bodyBetween}{" "}
            <Link
              href="/privacy"
              className="font-medium text-[#DFBE8A] underline"
            >
              Privacy Policy
            </Link>
            {text.bodyAfter}
          </p>
        </div>
      </div>

      {preferences && (
        <div className="mt-4 space-y-2 rounded-xl border border-[#C59B5F]/20 bg-[#14110E] p-3 text-xs">
          <label className="flex items-center justify-between gap-3">
            <span className="text-[#FAF6F0]">
              {text.essential}{" "}
              <span className="text-[#FAF6F0]/60">{text.alwaysOn}</span>
            </span>
            <input type="checkbox" checked readOnly className="accent-[#C59B5F]" />
          </label>
          <label className="flex items-center justify-between gap-3">
              <span className="text-[#FAF6F0]">{text.analytics}</span>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="accent-[#C59B5F]"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
              <span className="text-[#FAF6F0]">{text.advertising}</span>
            <input
              type="checkbox"
              checked={advertising}
              onChange={(e) => setAdvertising(e.target.checked)}
              className="accent-[#C59B5F]"
            />
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            decide({ essential: true, analytics: true, advertising: true })
          }
          className="rounded-full bg-gradient-to-r from-[#C59B5F] to-[#DFBE8A] px-4 py-2 text-xs font-semibold text-[#14110E] transition hover:opacity-95"
        >
          {text.accept}
        </button>
        <button
          type="button"
          onClick={() =>
            decide({ essential: true, analytics: false, advertising: false })
          }
          className="rounded-full border border-[#C59B5F]/40 px-4 py-2 text-xs font-semibold text-[#DFBE8A] transition hover:bg-[#C59B5F]/15"
        >
          {text.decline}
        </button>
        {preferences ? (
          <button
            type="button"
            onClick={() => decide({ essential: true, analytics, advertising })}
            className="text-xs font-semibold text-[#DFBE8A] underline"
          >
            {text.save}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPreferences(true)}
            className="text-xs font-semibold text-[#DFBE8A] underline"
          >
            {text.preferences}
          </button>
        )}
      </div>
    </div>
  );
}
