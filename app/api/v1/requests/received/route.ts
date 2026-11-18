import type { NextRequest } from "next/server";
import { apiError, apiOptionsResponse, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { calculateAgeFromDob } from "@/services/auth-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const sb = createAdminSupabaseClient();
  const { data: requests } = await sb
    .from("introduction_requests")
    .select("*")
    .eq("receiver_id", user.id)
    .order("created_at", { ascending: false });

  const senderIds = (requests || []).map((r) => r.sender_id);
  const [{ data: users }, { data: profiles }, { data: photos }] =
    await Promise.all([
      senderIds.length
        ? sb
            .from("users")
            .select("id, first_name, username, id_verified")
            .in("id", senderIds)
        : Promise.resolve({ data: [] }),
      senderIds.length
        ? sb
            .from("user_profiles")
            .select("user_id, dob, city, postcode_area, profession, relationship_status")
            .in("user_id", senderIds)
        : Promise.resolve({ data: [] }),
      senderIds.length
        ? sb
            .from("profile_photographs")
            .select("user_id, url, is_primary")
            .in("user_id", senderIds)
        : Promise.resolve({ data: [] }),
    ]);

  const uMap = new Map((users || []).map((u) => [u.id, u]));
  const pMap = new Map((profiles || []).map((p) => [p.user_id, p]));
  const phMap = new Map<string, string>();
  for (const ph of photos || []) {
    if (ph.is_primary || !phMap.has(ph.user_id)) phMap.set(ph.user_id, ph.url);
  }

  const enriched = (requests || []).map((r) => {
    const u = uMap.get(r.sender_id);
    const p = pMap.get(r.sender_id);
    return {
      ...r,
      sender: u
        ? {
            id: u.id,
            first_name: u.first_name,
            username: u.username,
            id_verified: u.id_verified,
            age: p?.dob ? calculateAgeFromDob(p.dob) : null,
            city: p?.city || null,
            postcode_area: p?.postcode_area || null,
            profession: p?.profession || null,
            photo_url: phMap.get(u.id) || null,
          }
        : null,
    };
  });

  return apiSuccess("Received introduction requests retrieved", {
    requests: enriched,
  });
}
