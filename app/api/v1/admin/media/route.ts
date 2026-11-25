import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { verifyAdminRequest } from "@/lib/auth-guard";
import { recordAuditLog } from "@/services/audit-service";
import { createStorageAdminClient } from "@/supabase/admin";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req, ["admin", "super_admin"]);
  if (!auth.authorized) return apiError("Forbidden", 403);

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiValidationError([
        { field: "file", message: "A banner image file is required." },
      ]);
    }

    const extension = ALLOWED_IMAGE_TYPES[file.type];
    if (!extension) {
      return apiValidationError([
        {
          field: "file",
          message: "Use a JPG, PNG, WebP, or AVIF image.",
        },
      ]);
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return apiValidationError([
        { field: "file", message: "Banner image must be 8 MB or smaller." },
      ]);
    }

    const storagePath = `cms/banners/${Date.now()}_${crypto
      .randomBytes(4)
      .toString("hex")}.${extension}`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "matrimony";
    const storage = createStorageAdminClient().storage.from(bucket);
    const { error } = await storage.upload(
      storagePath,
      Buffer.from(await file.arrayBuffer()),
      { contentType: file.type, upsert: true },
    );

    if (error) {
      return apiError(`Storage upload failed: ${error.message}`, 400);
    }

    const { data } = storage.getPublicUrl(storagePath);

    await recordAuditLog({
      actorId: auth.user?.id || null,
      actorRole: auth.user?.role || "admin",
      category: "admin",
      action: "cms.banner_image_uploaded",
      resourceType: "cms_media",
      resourceId: storagePath,
      details: { storagePath, publicUrl: data.publicUrl },
    });

    return apiSuccess("Banner image uploaded successfully", {
      storagePath,
      publicUrl: data.publicUrl,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Invalid upload", 400);
  }
}
