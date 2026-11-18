"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetPreview, setResetPreview] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Invalid login credentials.");
      } else {
        const role = json.data?.user?.role;
        if (role === "admin" || role === "super_admin" || role === "moderator") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch {
      setError("Network error while signing in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestReset() {
    setResetStatus(null);
    const res = await fetch("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetEmail }),
    });
    const json = await res.json();
    if (json.data?.resetCodePreview) {
      setResetPreview(json.data.resetCodePreview);
      setResetCode(json.data.resetCodePreview);
    }
    setResetStatus(json.message || "Reset code sent.");
  }

  async function handleConfirmReset() {
    const res = await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: resetEmail,
        code: resetCode,
        newPassword,
      }),
    });
    const json = await res.json();
    setResetStatus(json.message);
    if (res.ok) {
      setTimeout(() => setForgotOpen(false), 1500);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#14110E] px-4 py-12 text-[#FAF6F0]">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Ma'aak" className="mx-auto h-14 w-auto" />
          </Link>
          <h1 className="mt-4 font-serif text-3xl font-semibold text-white">
            Sign In
          </h1>
          <p className="mt-1 text-xs text-white/65">
            Enter your email address or username to access your matrimony
            sanctuary
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-[#C59B5F]/30 bg-[#1F1A16] p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#DFBE8A]">
                Email Address or Username
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="aisha@maaak.co.uk or aisha34"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#14110E] px-4 py-3 text-sm text-white focus:border-[#C59B5F] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[#DFBE8A]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs text-[#C59B5F] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/15 bg-[#14110E] px-4 py-3 pr-10 text-sm text-white focus:border-[#C59B5F] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#C59B5F] to-[#DFBE8A] py-3.5 text-xs font-bold text-[#14110E] shadow-lg transition hover:opacity-95 disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{loading ? "Signing In..." : "Sign In"}</span>
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-white/70">
            New to Ma&apos;aak?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#DFBE8A] hover:underline"
            >
              Register
            </Link>
          </p>
        </div>

      </div>

      {/* Password Reset Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#C59B5F]/40 bg-[#1F1A16] p-6">
            <h3 className="font-serif text-xl font-semibold text-[#DFBE8A]">
              Account Recovery &amp; Password Reset
            </h3>
            <div className="mt-4 space-y-3">
              <input
                type="email"
                placeholder="Enter your registered email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#14110E] px-3.5 py-2.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleRequestReset}
                className="w-full rounded-full border border-[#C59B5F] py-2 text-xs font-semibold text-[#DFBE8A]"
              >
                Send 6-Digit Reset Code
              </button>

              {resetPreview && (
                <p className="rounded-lg bg-[#C59B5F]/15 p-2 text-xs text-[#DFBE8A]">
                  Verification OTP Code: <strong>{resetPreview}</strong>
                </p>
              )}

              <input
                type="text"
                placeholder="6-Digit Reset Code"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#14110E] px-3.5 py-2.5 text-xs text-white"
              />
              <input
                type="password"
                placeholder="New Password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#14110E] px-3.5 py-2.5 text-xs text-white"
              />
              {resetStatus && (
                <p className="text-xs text-[#DFBE8A]">{resetStatus}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="rounded-full px-4 py-2 text-xs text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="rounded-full bg-[#C59B5F] px-5 py-2 text-xs font-bold text-[#14110E]"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
