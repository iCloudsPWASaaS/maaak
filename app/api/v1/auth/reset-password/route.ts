import type { NextRequest } from "next/server";
import {
  apiError,
  apiOptionsResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { hashPassword } from "@/lib/jwt";
import { createAdminSupabaseClient } from "@/supabase/admin";

export async function OPTIONS() {
  return apiOptionsResponse();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const code = (body.code || "").trim();
    const newPassword = body.newPassword || body.password || "";

    if (!email || !code || newPassword.length < 8) {
      return apiValidationError([
        {
          field: "newPassword",
          message:
            "Email, 6-digit reset code, and a new password (min 8 chars) are required.",
        },
      ]);
    }

    const sb = createAdminSupabaseClient();
    const { data: user } = await sb
      .from("users")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (!user) {
      return apiError("Invalid reset code or email.", 400);
    }

    const { data: otp } = await sb
      .from("verification_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "password_reset")
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp || otp.code !== code || new Date(otp.expires_at) < new Date()) {
      return apiError("Invalid or expired password reset code.", 400);
    }

    await sb
      .from("verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", otp.id);

    await sb
      .from("users")
      .update({
        password_hash: hashPassword(newPassword),
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq("id", user.id);

    return apiSuccess("Password has been reset successfully. You may now log in.", {});
  } catch (err) {
    return apiError(`Reset password failed: ${(err as Error).message}`, 500);
  }
}
