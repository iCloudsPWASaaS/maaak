import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { generateOtpCode } from "@/lib/jwt";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return apiValidationError([
        { field: "email", message: "Email address is required." },
      ]);
    }

    const sb = createAdminSupabaseClient();
    const { data: user } = await sb
      .from("users")
      .select("id, email")
      .ilike("email", email)
      .maybeSingle();

    let resetCodePreview: string | undefined;

    if (user) {
      const code = generateOtpCode(6);
      resetCodePreview = code;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await sb.from("verification_codes").insert({
        user_id: user.id,
        type: "password_reset",
        target: user.email,
        code,
        expires_at: expiresAt,
      });
    }

    return apiSuccess(
      "If an account exists for that email, a 6-digit password reset code has been sent.",
      { resetCodePreview },
    );
  } catch (err) {
    return apiError(`Password reset request failed: ${(err as Error).message}`, 500);
  }
}
