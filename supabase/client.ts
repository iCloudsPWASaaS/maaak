import { createClient } from "@supabase/supabase-js";

const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "matrimony";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return createClient(url, key, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
