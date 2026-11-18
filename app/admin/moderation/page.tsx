"use client";

import React, { useEffect, useState } from "react";
import {
  AdminAccessDenied,
  AdminNotice,
  AdminPageHeader,
  formatDate,
  statusStyle,
} from "@/components/admin/AdminUi";

interface ReportRow {
  id: string;
  status: string;
  report_type: string;
  reason?: string;
  details?: string;
  reporter_user_id?: string;
  reported_user_id?: string;
  reported_profile_id?: string;
  resolution_notes?: string;
  created_at: string;
}

export default function AdminModerationPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, { status: string; notes: string; suspend: boolean }>>({});

  async function loadReports() {
    const res = await fetch("/api/v1/admin/reports");
    if (res.status === 403 || res.status === 401) {
      setDenied(true);
      return;
    }
    if (!res.ok) return;
    const json = await res.json();
    setReports(json.data?.reports || []);
  }

  useEffect(() => {
    loadReports();
  }, []);

  function resolutionFor(report: ReportRow) {
    return (
      resolutions[report.id] || {
        status: report.status === "pending" ? "resolved" : report.status,
        notes: report.resolution_notes || "",
        suspend: false,
      }
    );
  }

  async function resolveReport(report: ReportRow) {
    const resolution = resolutionFor(report);
    const res = await fetch("/api/v1/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: report.id,
        status: resolution.status,
        resolution_notes: resolution.notes,
        suspendReportedUser: resolution.suspend,
      }),
    });
    const json = await res.json();
    setNotice({
      text: json.message || (res.ok ? "Report updated." : "Update failed."),
      tone: res.ok ? "success" : "error",
    });
    if (res.ok) loadReports();
  }

  if (denied) return <AdminAccessDenied />;

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div>
      {notice && <AdminNotice message={notice.text} tone={notice.tone} />}
      <AdminPageHeader
        eyebrow="Trust & Safety"
        title="Reports &amp; Moderation"
        description={`Review member-submitted reports, apply sanctions, and keep an auditable record of every moderation decision. ${pendingCount} report(s) pending.`}
      />

      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="rounded-3xl border border-[#E5DEC9] bg-white p-10 text-center text-xs text-[#665C4E]">
            No moderation reports have been submitted.
          </div>
        ) : (
          reports.map((report) => {
            const resolution = resolutionFor(report);
            return (
              <div
                key={report.id}
                className="rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-serif text-lg font-semibold text-[#1A1612]">
                        {report.report_type}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle(
                          report.status,
                        )}`}
                      >
                        {report.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#665C4E]">
                      Filed {formatDate(report.created_at)} by{" "}
                      {report.reporter_user_id || "unknown"} against{" "}
                      {report.reported_user_id || "unknown member"}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-[#8C6D3F]">
                    {report.id}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-[#FAF6F0] p-4 text-xs text-[#3D362D]">
                  <strong className="font-semibold">Reason:</strong>{" "}
                  {report.reason || report.details || "No additional details provided."}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-[#665C4E]">
                    Resolution Status
                    <select
                      value={resolution.status}
                      onChange={(e) =>
                        setResolutions({
                          ...resolutions,
                          [report.id]: { ...resolution, status: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl bg-[#FAF6F0] px-3 py-2 text-xs font-semibold text-[#665C4E] sm:mt-5">
                    <input
                      type="checkbox"
                      checked={resolution.suspend}
                      onChange={(e) =>
                        setResolutions({
                          ...resolutions,
                          [report.id]: { ...resolution, suspend: e.target.checked },
                        })
                      }
                    />
                    Suspend reported member
                  </label>
                </div>

                <label className="mt-3 block text-xs font-semibold text-[#665C4E]">
                  Reviewer Notes
                  <textarea
                    rows={2}
                    value={resolution.notes}
                    onChange={(e) =>
                      setResolutions({
                        ...resolutions,
                        [report.id]: { ...resolution, notes: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
                  />
                </label>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => resolveReport(report)}
                    className="rounded-full bg-[#14110E] px-5 py-2.5 text-xs font-semibold text-[#DFBE8A]"
                  >
                    Save Moderation Decision
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
