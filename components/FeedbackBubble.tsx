"use client";

import React, { useState } from "react";
import { MessageSquareHeart, Send, X, CheckCircle2 } from "lucide-react";

export function FeedbackBubble() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<
    "general_feedback" | "suggestion" | "technical_problem" | "complaint"
  >("general_feedback");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          category,
          message,
          pageUrl: typeof window !== "undefined" ? window.location.pathname : "/",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Unable to submit feedback.");
      } else {
        setSubmitted(true);
        setMessage("");
      }
    } catch {
      setError("Network error while sending feedback.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed right-5 bottom-20 z-50 lg:bottom-6">
      {open ? (
        <div className="w-80 sm:w-96 rounded-2xl border border-[#C59B5F]/40 bg-white p-5 text-[#1A1612] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#C59B5F]/20 pb-3">
            <div>
              <h3 className="text-lg font-semibold text-black">
                Share Feedback with Ma&apos;aak
              </h3>
              <p className="text-xs text-black">
                Connected directly to info@maaak.co.uk
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSubmitted(false);
              }}
              aria-label="Close feedback"
              className="rounded-lg p-1.5 text-black hover:bg-[#F3EEE7]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {submitted ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[#C59B5F]" />
              <p className="mt-3 text-base font-medium text-black">
                JazakAllahu Khayran!
              </p>
              <p className="mt-1 text-xs text-black">
                Your submission has been recorded and sent to{" "}
                <span className="text-black">info@maaak.co.uk</span>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setOpen(false);
                }}
                className="mt-4 rounded-full bg-[#C59B5F] px-5 py-2 text-xs font-semibold text-[#14110E]"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-black">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value as
                        | "general_feedback"
                        | "suggestion"
                        | "technical_problem"
                        | "complaint",
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-[#C59B5F]/30 bg-white px-3 py-2 text-xs text-black placeholder:text-black/60 focus:border-[#C59B5F] focus:outline-none"
                >
                  <option value="general_feedback">General Feedback</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="technical_problem">Technical Problem</option>
                  <option value="complaint">Complaint</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-black">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Optional"
                    className="mt-1 w-full rounded-xl border border-[#C59B5F]/30 bg-white px-3 py-2 text-xs text-black placeholder:text-black/60 focus:border-[#C59B5F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-xl border border-[#C59B5F]/30 bg-white px-3 py-2 text-xs text-black placeholder:text-black/60 focus:border-[#C59B5F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-black">
                  How can we help or improve? *
                </label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your feedback, suggestion, or issue..."
                  className="mt-1 w-full rounded-xl border border-[#C59B5F]/30 bg-white px-3 py-2 text-xs text-black placeholder:text-black/60 focus:border-[#C59B5F] focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-xs text-black">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#C59B5F] to-[#DFBE8A] px-4 py-2.5 text-xs font-semibold text-black transition hover:opacity-95 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {loading ? "Sending..." : "Send to info@maaak.co.uk"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-[#C59B5F]/50 bg-[#14110E] px-4 py-3 text-xs font-semibold text-[#DFBE8A] shadow-xl transition hover:scale-105 hover:bg-[#1F1A16]"
        >
          <MessageSquareHeart className="h-4 w-4 text-[#C59B5F]" />
          <span>Feedback</span>
        </button>
      )}
    </div>
  );
}
