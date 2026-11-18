import type { NextRequest } from "next/server";
import { apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const sb = createAdminSupabaseClient();

  if (slug) {
    const { data: page } = await sb
      .from("cms_pages")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    return apiSuccess("CMS page retrieved", { page: page || null });
  }

  const [{ data: pages }, { data: plans }, { data: contactSetting }] =
    await Promise.all([
      sb
        .from("cms_pages")
        .select("*")
        .eq("is_published", true)
        .order("slug", { ascending: true }),
      sb
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      sb
        .from("cms_settings")
        .select("*")
        .eq("setting_key", "contact_settings")
        .maybeSingle(),
    ]);

  return apiSuccess("CMS content retrieved", {
    pages: pages || [],
    plans: plans || [],
    contact: contactSetting?.setting_value || {
      support_email: "info@maaak.co.uk",
    },
  });
}
