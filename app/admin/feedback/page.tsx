"use client";

import React, { useEffect, useState } from "react";
import {
  AdminAccessDenied,
  AdminNotice,
  AdminPageHeader,
  formatDate,
  statusStyle,
} from "@/components/admin/AdminUi";

interface FeedbackRow {
  id: string;
  category?: string;
  subject?: string;
  message?: string;
  email?: string;
  status: string;
  admin_notes?: string;
  created_at: string;
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { status: string; notes: string }>>({});
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(null);

  async function loadFeedback() {
    const res = await fetch("/api/v1/admin/feedback");
    if (res.status === 403 || res.status === 401) {
      setDenied(true);
      return;
    }
    if (!res.ok) return;
    const json = await res.json();
    setFeedback(json.data?.feedback || []);
  }

  useEffect(() => {
    loadFeedback();
  }, []);

  function draftFor(row: FeedbackRow) {
    return drafts[row.id] || {
      status: row.status === "new" ? "reviewed" : row.status,
      notes: row.admin_notes || "",
    };
  }

  async function updateFeedback(row: FeedbackRow) {
    const draft = draftFor(row);
    const res = await fetch("/api/v1/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        status: draft.status,
        admin_notes: draft.notes,
      }),
    });
    const json = await res.json();
    setNotice({
      text: json.message || (res.ok ? "Feedback updated." : "Update failed."),
      tone: res.ok ? "success" : "error",
    });
    if (res.ok) loadFeedback();
  }

  if (denied) return <AdminAccessDenied />;

  return (
    <div>
      {notice && <AdminNotice message={notice.text} tone={notice.tone} />}
      <AdminPageHeader
        eyebrow="Member Voice"
        title="Feedback Inbox"
        description="Review member feedback submitted through the floating feedback bubble and record follow-up actions."
      />

      <div className="space-y-4">
        {feedback.length === 0 ? (
          <div className="rounded-3xl border border-[#E5DEC9] bg-white p-10 text-center text-xs text-[#665C4E]">
            No feedback submitted yet.
          </div>
        ) : (
          feedback.map((row) => {
            const draft = draftFor(row);
            return (
              <div
                key={row.id}
                className="rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-serif text-lg font-semibold">
                        {row.subject || row.category || "Member feedback"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle(
                          row.status,
                        )}`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#665C4E]">
                      {row.email || "Anonymous"} • {formatDate(row.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-[#FAF6F0] p-4 text-xs text-[#3D362D]">
                  {row.message || "No message content."}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [row.id]: { ...draft, status: e.target.value },
                      })
                    }
                    className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
                  >
                    <option value="new">New</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                  <input
                    value={draft.notes}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [row.id]: { ...draft, notes: e.target.value },
                      })
                    }
                    placeholder="Admin notes"
                    className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs sm:col-span-2"
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => updateFeedback(row)}
                    className="rounded-full bg-[#14110E] px-5 py-2.5 text-xs font-semibold text-[#DFBE8A]"
                  >
                    Save Feedback Status
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
