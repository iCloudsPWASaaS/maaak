import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { updateUserProfileData } from "@/services/profile-service";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  const sb = createAdminSupabaseClient();
  const [{ data: answers }, { data: profile }] = await Promise.all([
    sb.from("profile_answers").select("*").eq("user_id", user.id),
    sb.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  return apiSuccess("Profile answers retrieved", {
    answers: answers || [],
    profile: profile || null,
  });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return apiError("Unauthorized", 401);

  try {
    const body = await req.json();
    const sb = createAdminSupabaseClient();

    // Supports both structured profile fields object (`profileUpdates`) AND array of `{ question_code, answer_value, custom_text }`
    const profileUpdates: Record<string, unknown> = {
      ...(body.profileUpdates || {}),
    };

    if (Array.isArray(body.answers) && body.answers.length > 0) {
      const { data: questions } = await sb
        .from("profile_questions")
        .select("id, code, profile_column");
      const qMap = new Map((questions || []).map((q) => [q.code, q]));

      const answerRows: Record<string, unknown>[] = [];
      for (const item of body.answers) {
        const q = qMap.get(item.question_code);
        if (!q) continue;
        answerRows.push({
          user_id: user.id,
          question_id: q.id,
          question_code: q.code,
          answer_value: item.answer_value,
          custom_text: item.custom_text || null,
          updated_at: new Date().toISOString(),
        });
        if (q.profile_column) {
          profileUpdates[q.profile_column] = item.answer_value;
        }
      }

      if (answerRows.length > 0) {
        await sb
          .from("profile_answers")
          .upsert(answerRows, { onConflict: "user_id,question_id" });
      }
    }

    if (body.wizard_step !== undefined) {
      profileUpdates.wizard_step = Number(body.wizard_step);
    }

    const result = await updateUserProfileData(
      user.id,
      profileUpdates,
      Boolean(body.publish),
    );

    if (!result.ok) {
      return apiValidationError([
        { field: result.field, message: result.message },
      ]);
    }

    return apiSuccess("Profile answers saved and compatibility recalculated", {
      profile: result.profile,
      completion: result.completion,
    });
  } catch (err) {
    return apiError(`Failed to save answers: ${(err as Error).message}`, 500);
  }
}
