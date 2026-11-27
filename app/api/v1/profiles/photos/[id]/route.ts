import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { calculateProfileCompletion } from "@/services/profile-service";
import {
  createAdminSupabaseClient,
  createStorageAdminClient,
} from "@/supabase/admin";
import { deleteMediaFile } from "@/lib/storage";
import type { UserProfileRecord } from "@/types";

export async function OPTIONS() {
  return apiOptionsResponse();
}

async function recomputeCompletion(userId: string) {
  const sb = createAdminSupabaseClient();
  const [{ data: profile }, { data: photos }] = await Promise.all([
    sb.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("profile_photographs").select("id").eq("user_id", userId),
  ]);

  const completion = calculateProfileCompletion(
    profile as UserProfileRecord | null,
    (photos || []).length,
  );

  if (profile) {
    await sb
      .from("user_profiles")
      .update({ completion_percentage: completion.percentage })
      .eq("user_id", userId);
  }

  return completion;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await context.params;
  const sb = createAdminSupabaseClient();

  const { data: photo } = await sb
    .from("profile_photographs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!photo) {
    return apiError("Photograph not found.", 404);
  }

  let uploadedStoragePath = "";
  const updates: Record<string, unknown> = {};

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return apiValidationError([
          { field: "file", message: "A replacement image is required." },
        ]);
      }

      const storageClient = createStorageAdminClient();
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "matrimony";
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `photos/${user.id}/${Date.now()}_${crypto
        .randomBytes(4)
        .toString("hex")}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadErr } = await storageClient.storage
        .from(bucket)
        .upload(storagePath, Buffer.from(arrayBuffer), {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });
      if (uploadErr) {
        return apiError(`Storage upload failed: ${uploadErr.message}`, 400);
      }

      uploadedStoragePath = storagePath;
      const { data: publicData } = storageClient.storage
        .from(bucket)
        .getPublicUrl(storagePath);
      updates.url = publicData.publicUrl;
      updates.storage_path = storagePath;
      if (formData.get("isPrimary") === "true") updates.is_primary = true;
    } else {
      const body = await req.json();
      if (body.isPrimary === true) updates.is_primary = true;

      if (body.sortOrder !== undefined) {
        const { data: allPhotos } = await sb
          .from("profile_photographs")
          .select("id, sort_order")
          .eq("user_id", user.id)
          .order("sort_order", { ascending: true });

        const ordered = allPhotos || [];
        const target = Math.max(
          1,
          Math.min(ordered.length || 1, Number(body.sortOrder) || 1),
        );
        const currentOrder = Number(photo.sort_order || 1);
        const occupant = ordered.find(
          (item) => item.id !== id && Number(item.sort_order) === target,
        );

        if (occupant) {
          await sb
            .from("profile_photographs")
            .update({ sort_order: currentOrder })
            .eq("id", occupant.id)
            .eq("user_id", user.id);
        }
        updates.sort_order = target;
      }
    }

    if (updates.is_primary === true) {
      await sb
        .from("profile_photographs")
        .update({ is_primary: false })
        .eq("user_id", user.id)
        .neq("id", id);
    }

    if (Object.keys(updates).length === 0) {
      return apiValidationError([
        { field: "update", message: "No supported update was provided." },
      ]);
    }

    const { data: updatedPhoto, error: updateErr } = await sb
      .from("profile_photographs")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateErr) {
      return apiError(updateErr.message, 400);
    }

    if (
      uploadedStoragePath &&
      photo.storage_path &&
      !photo.storage_path.startsWith("seed/")
    ) {
      await deleteMediaFile(photo.storage_path);
    }

    const completion = await recomputeCompletion(user.id);
    const { data: remaining } = await sb
      .from("profile_photographs")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    return apiSuccess("Photograph updated successfully", {
      photo: updatedPhoto,
      photos: remaining || [],
      completion,
    });
  } catch (err) {
    if (uploadedStoragePath) {
      await deleteMediaFile(uploadedStoragePath).catch(() => undefined);
    }
    return apiError(`Photo update failed: ${(err as Error).message}`, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await context.params;
  const sb = createAdminSupabaseClient();

  const { data: photo } = await sb
    .from("profile_photographs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!photo) {
    return apiError("Photograph not found.", 404);
  }

  await sb.from("profile_photographs").delete().eq("id", id);

  if (photo.storage_path && !photo.storage_path.startsWith("seed/")) {
    await deleteMediaFile(photo.storage_path);
  }

  const { data: remaining } = await sb
    .from("profile_photographs")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if ((remaining || []).length < 2) {
    await sb
      .from("user_profiles")
      .update({ is_published: false })
      .eq("user_id", user.id);
  }

  const completion = await recomputeCompletion(user.id);

  return apiSuccess("Photograph deleted successfully", {
    remainingPhotos: remaining || [],
    completion,
  });
}
