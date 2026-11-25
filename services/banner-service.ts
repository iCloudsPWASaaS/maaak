import { createAdminSupabaseClient } from "@/supabase/admin";

export type BannerImage = {
  imageUrl: string;
  alt: string;
  source: "serpapi" | "cms" | "fallback";
  query: string;
  link?: string;
  title?: string;
};

export type BannerOverlay = {
  show: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonHref: string;
};

export type DynamicBanner = {
  images: BannerImage[];
  autoPlay: boolean;
  intervalMs: number;
  overlay: BannerOverlay;
  settings: {
    queries: string[];
    revalidateSeconds: number;
    useSerpApi: boolean;
  };
};

type BannerSettings = {
  query?: string;
  queries?: string[];
  imageUrl?: string;
  images?: unknown;
  fallbackImage?: string;
  useSerpApi?: boolean;
  revalidateSeconds?: number;
  autoPlay?: boolean;
  intervalMs?: number;
  maxImages?: number;
  alt?: string;
  overlay?: unknown;
};

type SerpImageResult = {
  original?: string;
  link?: string;
  title?: string;
};

const DEFAULT_QUERIES = [
  "muslim matrimonial couple wedding",
  "halal matrimony couple happy",
  "islamic wedding couple portrait",
];
const DEFAULT_FALLBACK = "/images/mock1.png";
const DEFAULT_ALT = "Muslim matrimony banner";
const DEFAULT_OVERLAY: BannerOverlay = {
  show: true,
  eyebrow: "Halal Matrimony",
  title: "Find Your Perfect Match",
  subtitle: "A trusted matrimony community for Muslim single parents.",
  buttonText: "Create Your Profile",
  buttonHref: "/register",
};
const BLOCKED_HOSTS = [
  "instagram.com",
  "facebook.com",
  "pinterest.com",
  "tiktok.com",
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function resolveOverlay(value: unknown): BannerOverlay {
  const record = asRecord(value) || {};
  const text = (key: Exclude<keyof BannerOverlay, "show">): string =>
    typeof record[key] === "string" && (record[key] as string).trim()
      ? (record[key] as string).trim()
      : DEFAULT_OVERLAY[key];

  return {
    show: record.show !== false,
    eyebrow: text("eyebrow"),
    title: text("title"),
    subtitle: text("subtitle"),
    buttonText: text("buttonText"),
    buttonHref: text("buttonHref"),
  };
}

function stringList(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const values = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    if (values.length > 0) return values;
  }
  return fallback;
}

function backendImages(value: unknown, alt: string): BannerImage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) {
      return [
        {
          imageUrl: item.trim(),
          alt,
          source: "cms" as const,
          query: "backend",
        },
      ];
    }

    const record = asRecord(item);
    if (!record || typeof record.imageUrl !== "string" || !record.imageUrl.trim()) {
      return [];
    }

    return [
      {
        imageUrl: record.imageUrl.trim(),
        alt: typeof record.alt === "string" && record.alt.trim() ? record.alt.trim() : alt,
        source: "cms" as const,
        query:
          typeof record.query === "string" && record.query.trim()
            ? record.query.trim()
            : "backend",
      },
    ];
  });
}

function uniqueImages(images: BannerImage[]): BannerImage[] {
  const seen = new Set<string>();
  return images.filter((image) => {
    if (seen.has(image.imageUrl)) return false;
    seen.add(image.imageUrl);
    return true;
  });
}

async function fetchSerpImages(
  query: string,
  apiKey: string,
  revalidateSeconds: number,
  alt: string,
  limit: number,
): Promise<BannerImage[]> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_images");
  url.searchParams.set("q", query);
  url.searchParams.set("tbm", "isch");
  url.searchParams.set("ijn", "0");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), {
    next: { revalidate: revalidateSeconds },
  });
  if (!response.ok) return [];

  const payload = (await response.json()) as {
    images_results?: SerpImageResult[];
  };

  const candidates = (payload.images_results || []).filter((item) => {
    if (
      typeof item.original !== "string" ||
      !/^https:\/\//i.test(item.original)
    ) {
      return false;
    }

    try {
      const host = new URL(item.original).hostname.toLowerCase();
      return !BLOCKED_HOSTS.some((blocked) => host.endsWith(blocked));
    } catch {
      return false;
    }
  });

  candidates.sort((a, b) => {
    const aDirect = /\.(jpe?g|png|webp)(\?|$)/i.test(a.original || "") ? 0 : 1;
    const bDirect = /\.(jpe?g|png|webp)(\?|$)/i.test(b.original || "") ? 0 : 1;
    return aDirect - bDirect;
  });

  return candidates.slice(0, limit).map((item) => ({
    imageUrl: item.original as string,
    alt,
    source: "serpapi" as const,
    query,
    ...(item.link ? { link: item.link } : {}),
    ...(item.title ? { title: item.title } : {}),
  }));
}

export async function getDynamicBanner(
  content?: Record<string, unknown>,
): Promise<DynamicBanner> {
  let resolvedContent = content;

  if (!resolvedContent) {
    const sb = createAdminSupabaseClient();
    const { data } = await sb
      .from("cms_pages")
      .select("content")
      .eq("slug", "home")
      .maybeSingle();
    resolvedContent = asRecord(data?.content) || {};
  }

  const raw = (asRecord(resolvedContent.banner) || {}) as BannerSettings;
  const queries = stringList(
    raw.queries,
    typeof raw.query === "string" && raw.query.trim()
      ? [raw.query.trim()]
      : DEFAULT_QUERIES,
  );
  const fallbackImage =
    typeof raw.fallbackImage === "string" && raw.fallbackImage.trim()
      ? raw.fallbackImage.trim()
      : DEFAULT_FALLBACK;
  const alt =
    typeof raw.alt === "string" && raw.alt.trim() ? raw.alt.trim() : DEFAULT_ALT;
  const useSerpApi = raw.useSerpApi !== false;
  const autoPlay = raw.autoPlay !== false;
  const intervalMs =
    typeof raw.intervalMs === "number" && raw.intervalMs >= 1000
      ? Math.floor(raw.intervalMs)
      : 5000;
  const revalidateSeconds =
    typeof raw.revalidateSeconds === "number" && raw.revalidateSeconds > 0
      ? Math.floor(raw.revalidateSeconds)
      : 3600;
  const maxImages =
    typeof raw.maxImages === "number" && raw.maxImages > 0
      ? Math.min(Math.floor(raw.maxImages), 10)
      : 5;
  const overlay = resolveOverlay(raw.overlay);

  const configuredImages = backendImages(raw.images, alt);
  if (typeof raw.imageUrl === "string" && raw.imageUrl.trim()) {
    configuredImages.unshift({
      imageUrl: raw.imageUrl.trim(),
      alt,
      source: "cms",
      query: "backend",
    });
  }
  const fallbackBanner: BannerImage = {
    imageUrl: fallbackImage,
    alt,
    source: "fallback",
    query: "fallback",
  };
  const settings = { queries, revalidateSeconds, useSerpApi };

  if (!useSerpApi || !process.env.SERPAPI_API_KEY) {
    return {
      images: uniqueImages([...configuredImages, fallbackBanner]).slice(
        0,
        maxImages,
      ),
      autoPlay,
      intervalMs,
      overlay,
      settings,
    };
  }

  const perQueryLimit = Math.max(1, Math.ceil(maxImages / queries.length));
  const results = await Promise.allSettled(
    queries.map((query) =>
      fetchSerpImages(
        query,
        process.env.SERPAPI_API_KEY as string,
        revalidateSeconds,
        alt,
        perQueryLimit,
      ),
    ),
  );
  const serpImages = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  return {
    images: uniqueImages([
      ...serpImages,
      ...configuredImages,
      fallbackBanner,
    ]).slice(0, maxImages),
    autoPlay,
    intervalMs,
    overlay,
    settings,
  };
}
