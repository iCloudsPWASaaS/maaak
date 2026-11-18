"use client";

import React, { useEffect, useState } from "react";
import {
  AdminAccessDenied,
  AdminNotice,
  AdminPageHeader,
  formatDate,
} from "@/components/admin/AdminUi";

interface CmsSetting {
  id?: string;
  setting_key: string;
  setting_group: string;
  setting_value: unknown;
  description?: string;
  updated_at?: string;
}

interface CmsPage {
  id?: string;
  slug: string;
  title: string;
  subtitle?: string;
  page_type?: string;
  content: unknown;
  meta_title?: string;
  meta_description?: string;
  is_published?: boolean;
  updated_at?: string;
}

export default function AdminCmsPage() {
  const [settings, setSettings] = useState<CmsSetting[]>([]);
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [settingForm, setSettingForm] = useState({
    settingKey: "",
    settingGroup: "general",
    settingValueText: "{}",
    description: "",
  });
  const [pageForm, setPageForm] = useState({
    slug: "",
    title: "",
    subtitle: "",
    pageType: "page",
    contentText: "{}",
    metaTitle: "",
    metaDescription: "",
    isPublished: true,
  });
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(null);

  async function loadCms() {
    const res = await fetch("/api/v1/admin/cms");
    if (res.status === 403 || res.status === 401) {
      setDenied(true);
      return;
    }
    if (!res.ok) return;
    const json = await res.json();
    setSettings(json.data?.settings || []);
    setPages(json.data?.pages || []);
  }

  useEffect(() => {
    loadCms();
  }, []);

  function selectSetting(setting: CmsSetting) {
    setSettingForm({
      settingKey: setting.setting_key,
      settingGroup: setting.setting_group,
      settingValueText: JSON.stringify(setting.setting_value, null, 2),
      description: setting.description || "",
    });
  }

  function selectPage(page: CmsPage) {
    setPageForm({
      slug: page.slug,
      title: page.title,
      subtitle: page.subtitle || "",
      pageType: page.page_type || "page",
      contentText: JSON.stringify(page.content || {}, null, 2),
      metaTitle: page.meta_title || page.title,
      metaDescription: page.meta_description || "",
      isPublished: page.is_published !== false,
    });
  }

  async function saveSetting(e: React.FormEvent) {
    e.preventDefault();
    let settingValue: unknown;
    try {
      settingValue = JSON.parse(settingForm.settingValueText);
    } catch {
      setNotice({ text: "Setting value must be valid JSON.", tone: "error" });
      return;
    }

    const res = await fetch("/api/v1/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settingKey: settingForm.settingKey,
        settingGroup: settingForm.settingGroup,
        settingValue,
        description: settingForm.description,
      }),
    });
    const json = await res.json();
    setNotice({
      text: json.message || (res.ok ? "Setting saved." : "Save failed."),
      tone: res.ok ? "success" : "error",
    });
    if (res.ok) loadCms();
  }

  async function savePage(e: React.FormEvent) {
    e.preventDefault();
    let content: unknown;
    try {
      content = JSON.parse(pageForm.contentText);
    } catch {
      setNotice({ text: "Page content must be valid JSON.", tone: "error" });
      return;
    }

    const res = await fetch("/api/v1/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: pageForm.slug,
        title: pageForm.title,
        subtitle: pageForm.subtitle,
        page_type: pageForm.pageType,
        content,
        meta_title: pageForm.metaTitle,
        meta_description: pageForm.metaDescription,
        is_published: pageForm.isPublished,
      }),
    });
    const json = await res.json();
    setNotice({
      text: json.message || (res.ok ? "Page saved." : "Save failed."),
      tone: res.ok ? "success" : "error",
    });
    if (res.ok) loadCms();
  }

  if (denied) return <AdminAccessDenied />;

  return (
    <div>
      {notice && <AdminNotice message={notice.text} tone={notice.tone} />}
      <AdminPageHeader
        eyebrow="Content Management"
        title="CMS Pages &amp; Platform Settings"
        description="Manage public marketing pages, plan messaging, matching configuration, legal copy, and every CMS-controlled platform setting without code changes."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6">
          <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
            Platform Settings ({settings.length})
          </h2>
          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {settings.map((setting) => (
              <button
                type="button"
                key={setting.setting_key}
                onClick={() => selectSetting(setting)}
                className={`w-full rounded-xl px-3.5 py-2.5 text-left text-xs ${
                  settingForm.settingKey === setting.setting_key
                    ? "bg-[#14110E] text-[#DFBE8A]"
                    : "bg-[#FAF6F0] text-[#3D362D]"
                }`}
              >
                <div className="font-semibold">{setting.setting_key}</div>
                <div className="text-[11px] opacity-75">
                  {setting.setting_group} • updated{" "}
                  {formatDate(setting.updated_at)}
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={saveSetting} className="mt-5 space-y-3">
            <input
              required
              value={settingForm.settingKey}
              onChange={(e) =>
                setSettingForm({ ...settingForm, settingKey: e.target.value })
              }
              placeholder="setting_key"
              className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
            <input
              value={settingForm.settingGroup}
              onChange={(e) =>
                setSettingForm({ ...settingForm, settingGroup: e.target.value })
              }
              placeholder="setting group"
              className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
            <textarea
              rows={8}
              value={settingForm.settingValueText}
              onChange={(e) =>
                setSettingForm({ ...settingForm, settingValueText: e.target.value })
              }
              className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 font-mono text-[11px]"
            />
            <input
              value={settingForm.description}
              onChange={(e) =>
                setSettingForm({ ...settingForm, description: e.target.value })
              }
              placeholder="Description"
              className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="rounded-full bg-[#14110E] px-5 py-2.5 text-xs font-semibold text-[#DFBE8A]"
            >
              Save CMS Setting
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6">
          <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
            Public Pages ({pages.length})
          </h2>
          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {pages.map((page) => (
              <button
                type="button"
                key={page.slug}
                onClick={() => selectPage(page)}
                className={`w-full rounded-xl px-3.5 py-2.5 text-left text-xs ${
                  pageForm.slug === page.slug
                    ? "bg-[#14110E] text-[#DFBE8A]"
                    : "bg-[#FAF6F0] text-[#3D362D]"
                }`}
              >
                <div className="font-semibold">{page.title}</div>
                <div className="text-[11px] opacity-75">/{page.slug}</div>
              </button>
            ))}
          </div>

          <form onSubmit={savePage} className="mt-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                value={pageForm.slug}
                onChange={(e) =>
                  setPageForm({ ...pageForm, slug: e.target.value })
                }
                placeholder="slug"
                className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
              />
              <input
                required
                value={pageForm.title}
                onChange={(e) =>
                  setPageForm({ ...pageForm, title: e.target.value })
                }
                placeholder="Title"
                className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
              />
            </div>
            <input
              value={pageForm.subtitle}
              onChange={(e) =>
                setPageForm({ ...pageForm, subtitle: e.target.value })
              }
              placeholder="Subtitle"
              className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
            <textarea
              rows={6}
              value={pageForm.contentText}
              onChange={(e) =>
                setPageForm({ ...pageForm, contentText: e.target.value })
              }
              className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 font-mono text-[11px]"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={pageForm.metaTitle}
                onChange={(e) =>
                  setPageForm({ ...pageForm, metaTitle: e.target.value })
                }
                placeholder="Meta title"
                className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
              />
              <input
                value={pageForm.metaDescription}
                onChange={(e) =>
                  setPageForm({ ...pageForm, metaDescription: e.target.value })
                }
                placeholder="Meta description"
                className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#665C4E]">
              <input
                type="checkbox"
                checked={pageForm.isPublished}
                onChange={(e) =>
                  setPageForm({ ...pageForm, isPublished: e.target.checked })
                }
              />
              Published
            </label>
            <button
              type="submit"
              className="rounded-full bg-[#14110E] px-5 py-2.5 text-xs font-semibold text-[#DFBE8A]"
            >
              Save CMS Page
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
