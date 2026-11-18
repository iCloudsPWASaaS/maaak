import type { NextRequest } from "next/server";
import { apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getDynamicBanner } from "@/services/banner-service";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  const banner = await getDynamicBanner(
    query ? { banner: { queries: [query] } } : undefined,
  );

  const response = apiSuccess("Dynamic banner carousel resolved", banner);
  response.headers.set(
    "Cache-Control",
    "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  );
  return response;
}
