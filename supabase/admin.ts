import { createClient } from "@supabase/supabase-js";

const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "matrimony";

/**
 * Server-only Supabase client configured to query the dedicated `matrimony` schema.
 * Never import this file in client components.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "Server Supabase credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) are not configured.",
    );
  }

  return createClient(url, key, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { "X-Client-Info": "maaak-server-api" },
    },
  });
}

export function createStorageAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Server Supabase storage credentials are not configured.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
