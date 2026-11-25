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

type HeroSlide = {
  imageUrl: string;
  alt: string;
  query?: string;
};

type HeroForm = {
  eyebrow: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonHref: string;
  showOverlay: boolean;
  autoPlay: boolean;
  intervalMs: string;
  maxImages: string;
  useSerpApi: boolean;
  queries: string;
  fallbackImage: string;
  alt: string;
  slides: HeroSlide[];
};

const DEFAULT_HERO_FORM: HeroForm = {
  eyebrow: "Halal Matrimony",
  title: "A Love Story Built on Faith",
  subtitle:
    "Meet verified, like-minded Muslim singles who value family, faith, and forever.",
  buttonText: "Find Your Match",
  buttonHref: "/register",
  showOverlay: true,
  autoPlay: true,
  intervalMs: "6000",
  maxImages: "3",
  useSerpApi: false,
  queries:
    "elegant muslim wedding couple portrait\nhalal matrimony couple happy\nislamic nikah couple portrait",
  fallbackImage: "/images/mock1.png",
  alt: "Elegant Muslim wedding couple",
  slides: [],
};

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function textValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function heroFormFromPages(pages: CmsPage[]): HeroForm {
  const home = pages.find((page) => page.slug === "home");
  const content = asObject(home?.content);
  const banner = asObject(content.banner);
  const overlay = asObject(banner.overlay);
  const rawSlides = Array.isArray(banner.images) ? banner.images : [];
  const defaultAlt = textValue(banner.alt, DEFAULT_HERO_FORM.alt);

  const slides: HeroSlide[] = rawSlides.flatMap((item) => {
    if (typeof item === "string" && item.trim()) {
      return [{ imageUrl: item.trim(), alt: defaultAlt }];
    }

    const record = asObject(item);
    const imageUrl = textValue(record.imageUrl, "");
    if (!imageUrl) return [];

    return [
      {
        imageUrl,
        alt: textValue(record.alt, defaultAlt),
        query: textValue(record.query, ""),
      },
    ];
  });

  const singleImage = textValue(banner.imageUrl, "");
  if (slides.length === 0 && singleImage) {
    slides.push({ imageUrl: singleImage, alt: defaultAlt });
  }

  const queries = Array.isArray(banner.queries)
    ? banner.queries
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return {
    eyebrow: textValue(overlay.eyebrow, DEFAULT_HERO_FORM.eyebrow),
    title: textValue(overlay.title, DEFAULT_HERO_FORM.title),
    subtitle: textValue(overlay.subtitle, DEFAULT_HERO_FORM.subtitle),
    buttonText: textValue(overlay.buttonText, DEFAULT_HERO_FORM.buttonText),
    buttonHref: textValue(overlay.buttonHref, DEFAULT_HERO_FORM.buttonHref),
    showOverlay: booleanValue(overlay.show, DEFAULT_HERO_FORM.showOverlay),
    autoPlay: booleanValue(banner.autoPlay, DEFAULT_HERO_FORM.autoPlay),
    intervalMs: String(numberValue(banner.intervalMs, 6000)),
    maxImages: String(numberValue(banner.maxImages, 3)),
    useSerpApi: booleanValue(banner.useSerpApi, DEFAULT_HERO_FORM.useSerpApi),
    queries: queries.length > 0 ? queries.join("\n") : DEFAULT_HERO_FORM.queries,
    fallbackImage: textValue(
      banner.fallbackImage,
      DEFAULT_HERO_FORM.fallbackImage,
    ),
    alt: defaultAlt,
    slides,
  };
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
  const [heroForm, setHeroForm] = useState<HeroForm>(DEFAULT_HERO_FORM);
  const [heroUploading, setHeroUploading] = useState(false);
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
    const pageList: CmsPage[] = json.data?.pages || [];
    setSettings(json.data?.settings || []);
    setPages(pageList);
    setHeroForm(heroFormFromPages(pageList));
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

  async function uploadHeroImage(file?: File | null) {
    if (!file) return;

    setHeroUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/v1/admin/media", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();

    if (res.ok && json.data?.publicUrl) {
      setHeroForm((current) => ({
        ...current,
        slides: [
          ...current.slides,
          {
            imageUrl: json.data.publicUrl as string,
            alt: current.alt || DEFAULT_HERO_FORM.alt,
          },
        ],
      }));
      setNotice({
        text: "Banner image uploaded. Save the hero banner to publish it.",
        tone: "success",
      });
    } else {
      setNotice({
        text: json.message || "Banner upload failed.",
        tone: "error",
      });
    }

    setHeroUploading(false);
  }

  async function saveHero(e: React.FormEvent) {
    e.preventDefault();

    const home = pages.find((page) => page.slug === "home");
    const content = asObject(home?.content);
    const banner = asObject(content.banner);
    const slides = heroForm.slides
      .map((slide) => ({
        imageUrl: slide.imageUrl.trim(),
        alt: slide.alt.trim() || heroForm.alt,
        ...(slide.query?.trim() ? { query: slide.query.trim() } : {}),
      }))
      .filter((slide) => slide.imageUrl);

    const updatedContent = {
      ...content,
      banner: {
        ...banner,
        queries: heroForm.queries
          .split("\n")
          .map((query) => query.trim())
          .filter(Boolean),
        useSerpApi: heroForm.useSerpApi,
        autoPlay: heroForm.autoPlay,
        intervalMs: Math.max(1000, Number(heroForm.intervalMs) || 6000),
        maxImages: Math.min(
          10,
          Math.max(1, Number(heroForm.maxImages) || 3),
        ),
        fallbackImage: heroForm.fallbackImage.trim() || DEFAULT_HERO_FORM.fallbackImage,
        alt: heroForm.alt.trim() || DEFAULT_HERO_FORM.alt,
        revalidateSeconds: numberValue(banner.revalidateSeconds, 3600),
        images: slides,
        overlay: {
          show: heroForm.showOverlay,
          eyebrow: heroForm.eyebrow.trim(),
          title: heroForm.title.trim(),
          subtitle: heroForm.subtitle.trim(),
          buttonText: heroForm.buttonText.trim(),
          buttonHref: heroForm.buttonHref.trim() || "/register",
        },
      },
    };

    const res = await fetch("/api/v1/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: "home",
        title: home?.title || "Home",
        subtitle: home?.subtitle || "",
        page_type: home?.page_type || "page",
        content: updatedContent,
        meta_title: home?.meta_title || home?.title || "Home",
        meta_description: home?.meta_description || "",
        is_published: home?.is_published ?? true,
      }),
    });
    const json = await res.json();
    setNotice({
      text: json.message || (res.ok ? "Hero banner saved." : "Save failed."),
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
        description="Manage the public home hero banner, marketing pages, plan messaging, matching configuration, legal copy, and every CMS-controlled platform setting without code changes."
      />

      <div className="rounded-3xl border border-[#E5DEC9] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#1A1612]">
              Home Hero Banner
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#665C4E]">
              Upload a new image or paste an image URL, edit the overlay copy,
              then save. Changes appear on the public home page immediately.
            </p>
          </div>
          <label
            className={`rounded-full px-5 py-2.5 text-xs font-semibold ${
              heroUploading
                ? "bg-[#E5DEC9] text-[#665C4E]"
                : "cursor-pointer bg-[#14110E] text-[#DFBE8A]"
            }`}
          >
            {heroUploading ? "Uploading..." : "Upload Banner Image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => uploadHeroImage(e.target.files?.[0])}
            />
          </label>
        </div>

        <form onSubmit={saveHero} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={heroForm.eyebrow}
              onChange={(e) =>
                setHeroForm({ ...heroForm, eyebrow: e.target.value })
              }
              placeholder="Eyebrow"
              className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
            <input
              required
              value={heroForm.title}
              onChange={(e) =>
                setHeroForm({ ...heroForm, title: e.target.value })
              }
              placeholder="Hero title"
              className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
          </div>

          <textarea
            rows={2}
            value={heroForm.subtitle}
            onChange={(e) =>
              setHeroForm({ ...heroForm, subtitle: e.target.value })
            }
            placeholder="Hero subtitle"
            className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={heroForm.buttonText}
              onChange={(e) =>
                setHeroForm({ ...heroForm, buttonText: e.target.value })
              }
              placeholder="Button text"
              className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
            <input
              value={heroForm.buttonHref}
              onChange={(e) =>
                setHeroForm({ ...heroForm, buttonHref: e.target.value })
              }
              placeholder="Button link"
              className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[#1A1612]">
                Banner Images ({heroForm.slides.length})
              </p>
              <button
                type="button"
                onClick={() =>
                  setHeroForm((current) => ({
                    ...current,
                    slides: [
                      ...current.slides,
                      { imageUrl: "", alt: current.alt },
                    ],
                  }))
                }
                className="rounded-full border border-[#E5DEC9] px-4 py-1.5 text-[11px] font-semibold text-[#665C4E]"
              >
                Add Image URL
              </button>
            </div>

            {heroForm.slides.map((slide, index) => (
              <div
                key={`${slide.imageUrl}-${index}`}
                className="grid gap-3 rounded-2xl border border-[#E5DEC9] bg-[#FAF6F0] p-3 sm:grid-cols-[7rem_1fr_1fr_auto]"
              >
                <div
                  className="h-20 rounded-xl bg-cover bg-center"
                  style={{ backgroundImage: `url("${slide.imageUrl}")` }}
                  aria-hidden="true"
                />
                <input
                  value={slide.imageUrl}
                  onChange={(e) =>
                    setHeroForm((current) => ({
                      ...current,
                      slides: current.slides.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, imageUrl: e.target.value }
                          : item,
                      ),
                    }))
                  }
                  placeholder="https://... banner image URL"
                  className="self-center rounded-xl border border-[#E5DEC9] bg-white px-3 py-2 text-[11px]"
                />
                <input
                  value={slide.alt}
                  onChange={(e) =>
                    setHeroForm((current) => ({
                      ...current,
                      slides: current.slides.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, alt: e.target.value }
                          : item,
                      ),
                    }))
                  }
                  placeholder="Image alt text"
                  className="self-center rounded-xl border border-[#E5DEC9] bg-white px-3 py-2 text-[11px]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setHeroForm((current) => ({
                      ...current,
                      slides: current.slides.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    }))
                  }
                  className="self-center rounded-full border border-[#E5DEC9] px-3 py-1.5 text-[11px] font-semibold text-[#8A3B3B]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={heroForm.alt}
              onChange={(e) =>
                setHeroForm({ ...heroForm, alt: e.target.value })
              }
              placeholder="Default image alt text"
              className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
            <input
              value={heroForm.fallbackImage}
              onChange={(e) =>
                setHeroForm({ ...heroForm, fallbackImage: e.target.value })
              }
              placeholder="Fallback image URL"
              className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min={1000}
              value={heroForm.intervalMs}
              onChange={(e) =>
                setHeroForm({ ...heroForm, intervalMs: e.target.value })
              }
              placeholder="Slide interval (ms)"
              className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
            <input
              type="number"
              min={1}
              max={10}
              value={heroForm.maxImages}
              onChange={(e) =>
                setHeroForm({ ...heroForm, maxImages: e.target.value })
              }
              placeholder="Maximum images"
              className="rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 text-xs"
            />
          </div>

          <textarea
            rows={3}
            value={heroForm.queries}
            onChange={(e) =>
              setHeroForm({ ...heroForm, queries: e.target.value })
            }
            placeholder="SerpAPI search queries, one per line"
            className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF6F0] px-3 py-2 font-mono text-[11px]"
          />

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#665C4E]">
              <input
                type="checkbox"
                checked={heroForm.showOverlay}
                onChange={(e) =>
                  setHeroForm({ ...heroForm, showOverlay: e.target.checked })
                }
              />
              Show overlay text
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#665C4E]">
              <input
                type="checkbox"
                checked={heroForm.autoPlay}
                onChange={(e) =>
                  setHeroForm({ ...heroForm, autoPlay: e.target.checked })
                }
              />
              Auto-play carousel
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#665C4E]">
              <input
                type="checkbox"
                checked={heroForm.useSerpApi}
                onChange={(e) =>
                  setHeroForm({ ...heroForm, useSerpApi: e.target.checked })
                }
              />
              Also fetch live SerpAPI images
            </label>
          </div>

          <button
            type="submit"
            className="rounded-full bg-[#14110E] px-5 py-2.5 text-xs font-semibold text-[#DFBE8A]"
          >
            Save Hero Banner
          </button>
        </form>
      </div>

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
