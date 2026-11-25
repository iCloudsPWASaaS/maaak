import { createClient } from "@supabase/supabase-js";
import { createDirectPgClient } from "@/lib/pg-client";
import { deleteMediaFile, uploadMediaFile } from "@/lib/storage";

const schema =
  process.env.DB_SCHEMA ||
  process.env.NEXT_PUBLIC_SUPABASE_SCHEMA ||
  "matrimony";

/**
 * Server-only database client configured to query the dedicated `matrimony` schema.
 * Uses direct PostgreSQL (`DATABASE_URL`) when configured, with fallback to Supabase REST.
 * Never import this file in client components.
 */
export function createAdminSupabaseClient(): ReturnType<
  typeof createDirectPgClient
> {
  if (process.env.DATABASE_URL) {
    return createDirectPgClient(schema);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "Database credentials (DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) are not configured.",
    );
  }

  return createClient(url, key, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { "X-Client-Info": "maaak-server-api" },
    },
  }) as unknown as ReturnType<typeof createDirectPgClient>;
}

export function createStorageAdminClient() {
  let lastPublicUrl = "";
  return {
    storage: {
      from(_bucket: string) {
        return {
          async upload(
            storagePath: string,
            body: Buffer | Uint8Array | ArrayBuffer,
            options?: { contentType?: string; upsert?: boolean },
          ) {
            try {
              const buf = Buffer.isBuffer(body)
                ? body
                : body instanceof Uint8Array
                  ? Buffer.from(body)
                  : Buffer.from(body);
              const res = await uploadMediaFile(
                storagePath,
                buf,
                options?.contentType,
              );
              lastPublicUrl = res.publicUrl;
              return { data: { path: res.storagePath }, error: null };
            } catch (err) {
              return { data: null, error: err as Error };
            }
          },
          getPublicUrl(storagePath: string) {
            const cleanKey = storagePath
              .replace(/^[/\\]+/, "")
              .replace(/\\/g, "/");
            const s3PublicBase = process.env.S3_PUBLIC_URL?.trim();
            const publicUrl =
              lastPublicUrl ||
              (s3PublicBase
                ? `${s3PublicBase.replace(/\/$/, "")}/${cleanKey}`
                : `/api/media/${cleanKey}`);
            return { data: { publicUrl } };
          },
          async remove(paths: string[]) {
            for (const p of paths) {
              await deleteMediaFile(p);
            }
            return { data: paths, error: null };
          },
        };
      },
    },
  };
}
