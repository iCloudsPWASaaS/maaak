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
import type { UserProfileRecord } from "@/types";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const sb = createAdminSupabaseClient();
  const storageClient = createStorageAdminClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "matrimony";

  try {
    const contentType = req.headers.get("content-type") || "";
    let photoUrl = "";
    let storagePath = "";
    let isPrimary = false;
    let mediaType: "photo" | "voice_bio" = "photo";
    let durationSec = 0;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      mediaType =
        (formData.get("mediaType") as "photo" | "voice_bio") || "photo";
      isPrimary = formData.get("isPrimary") === "true";
      durationSec = Number(formData.get("durationSec") || 0);

      if (!file) {
        return apiValidationError([
          { field: "file", message: "A media file is required." },
        ]);
      }

      if (mediaType === "voice_bio" && durationSec > 30) {
        return apiValidationError([
          {
            field: "durationSec",
            message: "Voice bio cannot exceed 30 seconds.",
          },
        ]);
      }

      const ext = file.name.split(".").pop() || (mediaType === "voice_bio" ? "webm" : "jpg");
      storagePath = `${mediaType}s/${user.id}/${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
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

      const { data: pubData } = storageClient.storage
        .from(bucket)
        .getPublicUrl(storagePath);
      photoUrl = pubData.publicUrl;
    } else {
      const body = await req.json();
      mediaType = body.mediaType === "voice_bio" ? "voice_bio" : "photo";
      photoUrl = (body.url || "").trim();
      storagePath = body.storagePath || `uploads/${user.id}/${Date.now()}.jpg`;
      isPrimary = Boolean(body.isPrimary);
      durationSec = Number(body.durationSec || 0);

      if (!photoUrl) {
        return apiValidationError([
          { field: "url", message: "A valid photo or audio URL is required." },
        ]);
      }

      if (mediaType === "voice_bio" && durationSec > 30) {
        return apiValidationError([
          {
            field: "durationSec",
            message: "Voice bio cannot exceed 30 seconds.",
          },
        ]);
      }
    }

    if (mediaType === "voice_bio") {
      const { data: updatedProf, error: vErr } = await sb
        .from("user_profiles")
        .update({
          voice_bio_url: photoUrl,
          voice_bio_duration_sec: Math.min(30, Math.max(1, durationSec || 15)),
        })
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (vErr) return apiError(vErr.message, 400);
      return apiSuccess(
        "Voice bio uploaded successfully",
        {
          voice_bio_url: updatedProf.voice_bio_url,
          voice_bio_duration_sec: updatedProf.voice_bio_duration_sec,
        },
        null,
        201,
      );
    }

    const { data: existingPhotos } = await sb
      .from("profile_photographs")
      .select("id, is_primary, sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    const count = (existingPhotos || []).length;
    if (count >= 6) {
      return apiError("Maximum of 6 profile photographs allowed.", 400);
    }

    const makePrimary = isPrimary || count === 0;
    if (makePrimary && count > 0) {
      await sb
        .from("profile_photographs")
        .update({ is_primary: false })
        .eq("user_id", user.id);
    }

    const { data: createdPhoto, error: insErr } = await sb
      .from("profile_photographs")
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        url: photoUrl,
        is_primary: makePrimary,
        sort_order: count + 1,
        has_clear_face: true,
        no_children_confirmed: true,
        no_contact_details_confirmed: true,
        moderation_status: "approved",
      })
      .select("*")
      .single();

    if (insErr) {
      return apiError(insErr.message, 400);
    }

    // Recompute profile completion percentage
    const { data: profile } = await sb
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const completion = calculateProfileCompletion(
      profile as UserProfileRecord | null,
      count + 1,
    );

    if (profile) {
      await sb
        .from("user_profiles")
        .update({ completion_percentage: completion.percentage })
        .eq("user_id", user.id);
    }

    return apiSuccess(
      "Photograph added successfully",
      {
        photo: createdPhoto,
        totalPhotos: count + 1,
        completion,
      },
      null,
      201,
    );
  } catch (err) {
    return apiError(`Photo upload failed: ${(err as Error).message}`, 500);
  }
}
