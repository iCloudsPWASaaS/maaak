import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { verifyAdminRequest } from "@/lib/auth-guard";
import { recordAuditLog } from "@/services/audit-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return apiError("Forbidden", 403);

  const sb = createAdminSupabaseClient();
  const [{ data: pages }, { data: settings }] = await Promise.all([
    sb.from("cms_pages").select("*").order("slug", { ascending: true }),
    sb.from("cms_settings").select("*").order("setting_key", { ascending: true }),
  ]);

  return apiSuccess("Admin CMS pages and settings retrieved", {
    pages: pages || [],
    settings: settings || [],
  });
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminRequest(req, ["admin", "super_admin"]);
  if (!auth.authorized) return apiError("Forbidden", 403);

  const body = await req.json();
  const sb = createAdminSupabaseClient();

  if (body.settingKey) {
    const { data: savedSetting, error } = await sb
      .from("cms_settings")
      .upsert(
        {
          setting_key: body.settingKey,
          setting_group: body.settingGroup || "general",
          setting_value: body.settingValue,
          description: body.description || null,
          updated_by: auth.user?.id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" },
      )
      .select("*")
      .single();

    if (error) return apiError(error.message, 400);

    await recordAuditLog({
      actorId: auth.user?.id || null,
      actorRole: auth.user?.role || "admin",
      category: "admin",
      action: "cms.setting_updated",
      resourceType: "cms_setting",
      resourceId: savedSetting.id,
      details: { settingKey: body.settingKey },
    });

    return apiSuccess("CMS setting updated successfully", {
      setting: savedSetting,
    });
  }

  if (body.slug && body.title) {
    const { data: savedPage, error } = await sb
      .from("cms_pages")
      .upsert(
        {
          slug: body.slug.trim().toLowerCase(),
          title: body.title.trim(),
          subtitle: body.subtitle || null,
          page_type: body.page_type || "page",
          content: body.content || {},
          meta_title: body.meta_title || body.title,
          meta_description: body.meta_description || body.subtitle || null,
          is_published: body.is_published ?? true,
          updated_by: auth.user?.id || null,
        },
        { onConflict: "slug" },
      )
      .select("*")
      .single();

    if (error) return apiError(error.message, 400);

    await recordAuditLog({
      actorId: auth.user?.id || null,
      actorRole: auth.user?.role || "admin",
      category: "admin",
      action: "cms.page_updated",
      resourceType: "cms_page",
      resourceId: savedPage.id,
      details: { slug: savedPage.slug },
    });

    return apiSuccess("CMS page saved successfully", { page: savedPage });
  }

  return apiError("Invalid CMS update payload.", 422);
}
