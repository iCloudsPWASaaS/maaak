"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Eye, EyeOff, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState<"Male" | "Female">("Female");
  const [dob, setDob] = useState("1994-06-15");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [city, setCity] = useState("London");
  const [postcode, setPostcode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"premium" | "free">("premium");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptSubscriptionDisclosure, setAcceptSubscriptionDisclosure] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"details" | "verify">("details");
  const [emailCode, setEmailCode] = useState("");
  const [mobileCode, setMobileCode] = useState("");
  const [previewCodes, setPreviewCodes] = useState<{
    emailVerificationCode?: string;
    mobileVerificationCode?: string;
  } | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [verifying, setVerifying] = useState<"email" | "mobile" | null>(null);
  const [resending, setResending] = useState<"email" | "mobile" | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          username,
          gender,
          dob,
          email,
          mobileNumber,
          city,
          postcode,
          password,
          selectedPlan,
          acceptTerms,
          acceptSubscriptionDisclosure,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const msg =
          json.errors?.[0]?.message ||
          json.message ||
          "Unable to complete registration.";
        setError(msg);
      } else {
        setPreviewCodes(json.data?.verificationPreview || null);
        setStep("verify");
      }
    } catch {
      setError("Network error during registration.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyContact(type: "email" | "mobile") {
    const code = type === "email" ? emailCode : mobileCode;
    if (!code.trim()) {
      setError(`Enter the 6-digit ${type} verification code.`);
      return;
    }

    setVerifying(type);
    setError(null);
    try {
      const res = await fetch(
        type === "email"
          ? "/api/v1/auth/verify-email"
          : "/api/v1/auth/verify-mobile",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || `Unable to verify ${type}.`);
        return;
      }
      if (type === "email") setEmailVerified(true);
      else setMobileVerified(true);
    } catch {
      setError("Network error during verification.");
    } finally {
      setVerifying(null);
    }
  }

  async function handleResendContact(type: "email" | "mobile") {
    setResending(type);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || `Unable to resend ${type} code.`);
        return;
      }
      if (json.data?.code) {
        setPreviewCodes((current) => ({
          ...(current || {}),
          [type === "email" ? "emailVerificationCode" : "mobileVerificationCode"]:
            json.data.code,
        }));
      }
    } catch {
      setError("Network error while requesting a new code.");
    } finally {
      setResending(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#14110E] px-4 py-12 text-[#FAF6F0]">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <Link href="/" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Ma'aak" className="mx-auto h-14 w-auto" />
          </Link>
          <h1 className="mt-4 font-serif text-3xl font-semibold text-white sm:text-4xl">
            Register
          </h1>
          <p className="mt-1.5 text-sm text-white/70">
            Authoritative Registration Specification • 1 Verified Email &amp; 1
            Verified Mobile per Member
          </p>
        </div>

        {/* Clear First-Month Free Subscription Disclosure (Section 6 & 30.3) */}
        <div className="mt-8 rounded-3xl border border-[#C59B5F] bg-[#1F1A16] p-6 shadow-xl">
          <div className="flex items-center gap-2.5 text-[#DFBE8A]">
            <Crown className="h-5 w-5" />
            <h2 className="font-serif text-xl font-semibold">
              Transparent Subscription &amp; First-Month Free Arrangement
            </h2>
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/85">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C59B5F]" />
              <span>
                You can register today and create your complete marriage
                compatibility profile.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C59B5F]" />
              <span>
                Under our <strong>Premium Introductory Arrangement</strong>,
                your <strong>first month (30 days) is 100% free</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C59B5F]" />
              <span>
                <strong>No payment is taken during the first month</strong>{" "}
                (£0.00 charged today).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C59B5F]" />
              <span>
                Recurring monthly billing (£24.99/month) begins only after your
                30-day introductory period ends, and you may cancel at any time
                before the trial end date.
              </span>
            </li>
          </ul>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedPlan("premium")}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedPlan === "premium"
                  ? "border-[#C59B5F] bg-[#C59B5F]/15 text-white"
                  : "border-white/15 bg-[#14110E] text-white/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-base font-semibold text-[#DFBE8A]">
                  Premium Membership
                </span>
                <span className="rounded-full bg-[#C59B5F] px-2.5 py-0.5 text-[10px] font-bold text-[#14110E]">
                  1st Month Free
                </span>
              </div>
              <p className="mt-1 text-xs text-white/75">
                £0.00 for 30 days, then £24.99/month. Unlimited requests,
                messaging &amp; video calling.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlan("free")}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedPlan === "free"
                  ? "border-[#C59B5F] bg-[#C59B5F]/15 text-white"
                  : "border-white/15 bg-[#14110E] text-white/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-base font-semibold text-white">
                  Free Membership
                </span>
                <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[10px] text-white/80">
                  £0.00 / month
                </span>
              </div>
              <p className="mt-1 text-xs text-white/75">
                Browse eligible profiles and send up to 10 introduction
                requests.
              </p>
            </button>
          </div>
        </div>

        {step === "verify" ? (
          <div className="mt-6 rounded-3xl border border-[#C59B5F] bg-[#1F1A16] p-8 shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#DFBE8A]">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="font-serif text-xl font-semibold">
                Verify Your Email &amp; Mobile
              </h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/75">
              Confirm both contact details now to complete registration. Each
              code is valid for 30 minutes.
            </p>

            {(previewCodes?.emailVerificationCode ||
              previewCodes?.mobileVerificationCode) && (
              <div className="mt-4 rounded-2xl border border-white/15 bg-[#14110E] p-4 text-xs text-white/75">
                <div className="font-semibold text-[#DFBE8A]">
                  Demo verification codes
                </div>
                <div className="mt-2">
                  Email:{" "}
                  <code className="font-bold text-white">
                    {previewCodes?.emailVerificationCode}
                  </code>
                </div>
                <div>
                  Mobile:{" "}
                  <code className="font-bold text-white">
                    {previewCodes?.mobileVerificationCode}
                  </code>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-[#14110E] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#DFBE8A]">
                    Email Address
                  </span>
                  {emailVerified && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <p className="mt-1 break-all text-[11px] text-white/60">{email}</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="6-digit code"
                  disabled={emailVerified}
                  className="mt-3 w-full rounded-xl border border-white/15 bg-[#1F1A16] px-4 py-3 text-sm tracking-widest text-white disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => void handleVerifyContact("email")}
                  disabled={emailVerified || verifying === "email"}
                  className="mt-3 w-full rounded-full bg-[#C59B5F] px-4 py-2.5 text-xs font-bold text-[#14110E] disabled:opacity-50"
                >
                  {emailVerified
                    ? "Email Verified"
                    : verifying === "email"
                      ? "Verifying..."
                      : "Verify Email"}
                </button>
                {!emailVerified && (
                  <button
                    type="button"
                    onClick={() => void handleResendContact("email")}
                    disabled={resending === "email"}
                    className="mt-2 w-full text-[11px] font-semibold text-[#DFBE8A] underline disabled:opacity-50"
                  >
                    {resending === "email" ? "Sending..." : "Resend email code"}
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-white/15 bg-[#14110E] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#DFBE8A]">
                    Mobile Number
                  </span>
                  {mobileVerified && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <p className="mt-1 break-all text-[11px] text-white/60">
                  {mobileNumber}
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mobileCode}
                  onChange={(e) => setMobileCode(e.target.value)}
                  placeholder="6-digit code"
                  disabled={mobileVerified}
                  className="mt-3 w-full rounded-xl border border-white/15 bg-[#1F1A16] px-4 py-3 text-sm tracking-widest text-white disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => void handleVerifyContact("mobile")}
                  disabled={mobileVerified || verifying === "mobile"}
                  className="mt-3 w-full rounded-full bg-[#C59B5F] px-4 py-2.5 text-xs font-bold text-[#14110E] disabled:opacity-50"
                >
                  {mobileVerified
                    ? "Mobile Verified"
                    : verifying === "mobile"
                      ? "Verifying..."
                      : "Verify Mobile"}
                </button>
                {!mobileVerified && (
                  <button
                    type="button"
                    onClick={() => void handleResendContact("mobile")}
                    disabled={resending === "mobile"}
                    className="mt-2 w-full text-[11px] font-semibold text-[#DFBE8A] underline disabled:opacity-50"
                  >
                    {resending === "mobile" ? "Sending..." : "Resend mobile code"}
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={!emailVerified || !mobileVerified}
              onClick={() => {
                router.push("/profile/wizard?registered=1");
                router.refresh();
              }}
              className="mt-6 w-full rounded-full bg-gradient-to-r from-[#C59B5F] to-[#DFBE8A] py-4 text-xs font-bold text-[#14110E] disabled:opacity-50"
            >
              Continue to Profile
            </button>
            <p className="mt-4 text-center text-xs text-white/65">
              <Link
                href="/profile/wizard?registered=1"
                className="font-semibold text-[#DFBE8A] underline"
              >
                Continue without verifying
              </Link>
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-3xl border border-white/15 bg-[#1F1A16] p-8 shadow-2xl"
          >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#DFBE8A]">
                First Name *{" "}
                <span className="text-white/50">(Visible on profile)</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Aisha"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#14110E] px-4 py-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#DFBE8A]">
                Second Name (Surname) *{" "}
                <span className="text-white/50">(Kept strictly hidden)</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Rahman"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#14110E] px-4 py-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#DFBE8A]">
                Username *{" "}
                <span className="text-white/50">
                  (5–10 letters/numbers, no symbols)
                </span>
              </label>
              <input
                type="text"
                required
                minLength={5}
                maxLength={10}
                pattern="^[A-Za-z0-9]{5,10}$"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. aisha2026"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#14110E] px-4 py-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#DFBE8A]">
                Gender *
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "Male" | "Female")}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#14110E] px-4 py-3 text-sm text-white"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#DFBE8A]">
                Date of Birth *{" "}
                <span className="text-white/50">(Private — only AGE shows)</span>
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#14110E] px-4 py-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#DFBE8A]">
                Email Address *{" "}
                <span className="text-white/50">(1 email per account)</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#14110E] px-4 py-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#DFBE8A]">
                Mobile Number *{" "}
                <span className="text-white/50">(1 mobile per account)</span>
              </label>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+447700900123"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#14110E] px-4 py-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#DFBE8A]">
                Password *{" "}
                <span className="text-white/50">(Min 8 characters)</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full rounded-xl border border-white/15 bg-[#14110E] px-4 py-3 pr-10 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-white/50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#DFBE8A]">
                City / Area *{" "}
                <span className="text-white/50">(Shown on profile)</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. London"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#14110E] px-4 py-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#DFBE8A]">
                UK Postcode *{" "}
                <span className="text-white/50">
                  (Exact postcode kept private)
                </span>
              </label>
              <input
                type="text"
                required
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="e.g. SW1A 1AA"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#14110E] px-4 py-3 text-sm text-white"
              />
            </div>
          </div>

          <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-[#14110E] p-4 text-xs">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptSubscriptionDisclosure}
                onChange={(e) =>
                  setAcceptSubscriptionDisclosure(e.target.checked)
                }
                className="mt-0.5 h-4 w-4 accent-[#C59B5F]"
              />
              <span className="text-white/85">
                I understand and consent that my{" "}
                <strong>first month of Premium is free (£0.00 today)</strong>,
                no payment is taken during the first month, and recurring
                monthly subscription billing (£24.99/month) begins only after the
                first month unless cancelled.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#C59B5F]"
              />
              <span className="text-white/85">
                I agree to the Ma&apos;aak{" "}
                <Link href="/terms" className="text-[#DFBE8A] underline">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-[#DFBE8A] underline">
                  Privacy Policy
                </Link>
                , and confirm I am seeking marriage.
              </span>
            </label>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#C59B5F] to-[#DFBE8A] py-4 text-xs font-bold text-[#14110E] shadow-xl transition hover:opacity-95 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{loading ? "Registering..." : "Register"}</span>
          </button>

          <p className="mt-4 text-center text-xs text-white/65">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#DFBE8A]">
              Sign In
            </Link>
          </p>
          </form>
        )}
      </div>
    </div>
  );
}
