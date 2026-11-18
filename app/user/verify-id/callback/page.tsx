import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth-guard";
import { createAdminSupabaseClient } from "@/supabase/admin";

type DiditCallbackSearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

function asSingleParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export default async function DiditCallbackPage({
  searchParams,
}: {
  searchParams: DiditCallbackSearchParams;
}) {
  const params = await searchParams;
  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF6F0] px-6">
        <div className="max-w-lg rounded-3xl border border-[#E5DEC9] bg-white p-10 text-center shadow-sm">
          <h1 className="font-serif text-3xl text-[#1A1612]">
            Sign in to continue
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#665C4E]">
            Please sign in to view your identity verification status.
          </p>
          <Link
            href="/login?next=/user/verify-id/callback"
            className="mt-7 inline-flex rounded-full bg-[#14110E] px-6 py-3 text-xs font-semibold text-[#DFBE8A]"
          >
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  const sb = createAdminSupabaseClient();
  const sessionId = asSingleParam(params.session_id);
  let latestSession: Record<string, unknown> | null = null;

  if (sessionId) {
    const { data } = await sb
      .from("identity_verification_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    latestSession = (data as Record<string, unknown> | null) || null;
  }

  if (!latestSession) {
    const { data } = await sb
      .from("identity_verification_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    latestSession = (data?.[0] as Record<string, unknown> | null) || null;
  }

  const providerStatus =
    asSingleParam(params.status) || asSingleParam(params.decision) || "pending";
  const dbStatus = String(latestSession?.status || providerStatus).toLowerCase();
  const sessionReference = latestSession?.id
    ? String(latestSession.id)
    : null;
  const isVerified = Boolean(user.id_verified);
  const needsAttention = [
    "declined",
    "rejected",
    "failed",
    "cancelled",
    "abandoned",
  ].includes(dbStatus);
  const isAwaitingWebhook = [
    "approved",
    "verified",
    "completed",
    "success",
  ].includes(dbStatus);

  const title = isVerified
    ? "Identity verified"
    : needsAttention
      ? "Verification needs attention"
      : isAwaitingWebhook
        ? "Verification received"
        : "Verification in progress";

  const description = isVerified
    ? "Your identity verification is complete. Your account now displays the verified badge."
    : needsAttention
      ? "Didit could not approve this verification attempt. You can review the details and try again."
      : isAwaitingWebhook
        ? "Didit has returned a successful result. Your status becomes final once the signed webhook is processed."
        : "Your verification session is still being reviewed by Didit. You can check again shortly.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF6F0] px-6">
      <div className="w-full max-w-2xl rounded-3xl border border-[#E5DEC9] bg-white p-10 shadow-sm">
        <div className="text-center">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#9C743C] uppercase">
            MAAAK Identity Check
          </p>
          <h1 className="mt-3 font-serif text-4xl text-[#1A1612]">{title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#665C4E]">
            {description}
          </p>
        </div>

        <dl className="mt-9 grid gap-3 rounded-2xl bg-[#FAF6F0] p-6 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-[#1A1612]">Account status</dt>
            <dd className="mt-1 text-[#665C4E]">
              {isVerified ? "ID verified" : "Not yet verified"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[#1A1612]">Provider status</dt>
            <dd className="mt-1 text-[#665C4E]">{dbStatus}</dd>
          </div>
          {sessionReference && (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-[#1A1612]">Session reference</dt>
              <dd className="mt-1 break-all text-[#665C4E]">
                {sessionReference}
              </dd>
            </div>
          )}
        </dl>

        <p className="mt-6 text-center text-[11px] leading-6 text-[#8A7B69]">
          Verification status is determined only by server-side validation of
          the signed Didit webhook. This confirmation page does not change your
          account status.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/verification"
            className="rounded-full bg-[#14110E] px-6 py-3 text-xs font-semibold text-[#DFBE8A]"
          >
            View verification page
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-[#E5DEC9] px-6 py-3 text-xs font-semibold text-[#1A1612]"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
