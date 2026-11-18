import { createAdminSupabaseClient } from "@/supabase/admin";

type ContentRecord = Record<string, unknown>;

function isContent(value: unknown): value is ContentRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function getSection<T extends object>(
  content: ContentRecord,
  key: string,
  fallback: T,
): T {
  const value = content[key];
  if (!isContent(value)) return fallback;
  return { ...fallback, ...(value as Partial<T>) };
}

export function getList<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export async function getPublicContent<T extends object>(
  slug: string,
  fallback: T,
): Promise<T> {
  const sb = createAdminSupabaseClient();
  const { data } = await sb
    .from("cms_pages")
    .select("title,subtitle,content")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  const stored = data?.content;
  if (isContent(stored) && Object.keys(stored).length > 0) {
    return { ...fallback, ...(stored as Partial<T>) } as T;
  }

  const fallbackRecord = fallback as ContentRecord;
  const title =
    typeof fallbackRecord.title === "string"
      ? fallbackRecord.title
      : data?.title || slug;
  const subtitle =
    typeof fallbackRecord.subtitle === "string"
      ? fallbackRecord.subtitle
      : data?.subtitle;

  if (data) {
    await sb
      .from("cms_pages")
      .update({ content: fallback })
      .eq("slug", slug);
  } else {
    await sb.from("cms_pages").insert({
      slug,
      title,
      subtitle: subtitle ?? null,
      page_type: "page",
      content: fallback,
      meta_title: title,
      meta_description: subtitle ?? null,
      is_published: true,
    });
  }

  return fallback;
}
