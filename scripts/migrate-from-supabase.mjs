import { createClient } from "@supabase/supabase-js";
import { createDirectPgClient, getPgPool } from "../lib/pg-client.ts";
import { uploadMediaFile } from "../lib/storage.ts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const schema =
  process.env.DB_SCHEMA ||
  process.env.NEXT_PUBLIC_SUPABASE_SCHEMA ||
  "matrimony";

if (!supabaseUrl || !supabaseKey || !process.env.DATABASE_URL) {
  console.error(
    "Both source Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) and target DATABASE_URL are required.",
  );
  process.exit(1);
}

const sourceSb = createClient(supabaseUrl, supabaseKey, {
  db: { schema },
  auth: { persistSession: false, autoRefreshToken: false },
});

const targetPg = createDirectPgClient(schema);

// Tables in foreign-key dependency order
const TABLES_IN_ORDER = [
  { name: "admin_roles", conflict: "id" },
  { name: "subscription_plans", conflict: "id" },
  { name: "cms_settings", conflict: "id" },
  { name: "cms_pages", conflict: "id" },
  { name: "question_categories", conflict: "id" },
  { name: "profile_questions", conflict: "id" },
  { name: "question_options", conflict: "id" },
  { name: "users", conflict: "id" },
  { name: "auth_sessions", conflict: "id" },
  { name: "verification_codes", conflict: "id" },
  { name: "user_profiles", conflict: "id" },
  { name: "profile_answers", conflict: "id" },
  { name: "profile_photographs", conflict: "id" },
  { name: "user_preferences", conflict: "id" },
  { name: "user_dealbreakers", conflict: "id" },
  { name: "matching_runs", conflict: "id" },
  { name: "compatibility_scores", conflict: "id" },
  { name: "match_recommendations", conflict: "id" },
  { name: "likes_dislikes", conflict: "id" },
  { name: "introduction_requests", conflict: "id" },
  { name: "conversations", conflict: "id" },
  { name: "conversation_participants", conflict: "id" },
  { name: "messages", conflict: "id" },
  { name: "read_receipts", conflict: "id" },
  { name: "call_records", conflict: "id" },
  { name: "identity_verification_sessions", conflict: "id" },
  { name: "user_subscriptions", conflict: "id" },
  { name: "payments", conflict: "id" },
  { name: "payment_events", conflict: "id" },
  { name: "reports", conflict: "id" },
  { name: "blocked_users", conflict: "id" },
  { name: "notifications", conflict: "id" },
  { name: "feedback", conflict: "id" },
  { name: "audit_logs", conflict: "id" },
];

async function migrateStorageObjectIfNeeded(photoRow) {
  if (!photoRow.url || !photoRow.url.includes(".supabase.co/storage/")) {
    return photoRow;
  }

  try {
    const res = await fetch(photoRow.url);
    if (!res.ok) return photoRow;
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || undefined;
    const saved = await uploadMediaFile(
      photoRow.storage_path,
      Buffer.from(arrayBuffer),
      contentType,
    );
    return {
      ...photoRow,
      url: saved.publicUrl,
    };
  } catch (err) {
    console.warn(
      `Warning: failed to download storage object ${photoRow.storage_path}: ${err.message}`,
    );
    return photoRow;
  }
}

async function ensureSupabaseSchemaExposed() {
  const sql = `
    do $$
    declare
      existing_schemas text;
      updated_schemas text;
    begin
      existing_schemas := coalesce(current_setting('pgrst.db_schemas', true), 'public, storage, graphql_public, luckydraw, justeat, cinewood');
      if position('matrimony' in existing_schemas) = 0 then
        updated_schemas := existing_schemas || ', matrimony';
      else
        updated_schemas := existing_schemas;
      end if;
      begin
        execute format('alter role authenticator set pgrst.db_schemas = %L', updated_schemas);
      exception when others then null;
      end;
      begin
        execute format('alter database postgres set pgrst.db_schemas = %L', updated_schemas);
      exception when others then null;
      end;
    end $$;
    notify pgrst, 'reload config';
    notify pgrst, 'reload schema';
  `;

  try {
    await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql_string: sql }),
    });
    await new Promise((r) => setTimeout(r, 2500));
  } catch {
    // ignore
  }
}

async function runMigration() {
  console.log(
    `Migrating schema "${schema}" from Supabase (${supabaseUrl}) to target PostgreSQL...`,
  );
  await ensureSupabaseSchemaExposed();

  const pool = getPgPool();
  const tableListSql = TABLES_IN_ORDER.map(
    (t) => `"${schema}"."${t.name}"`,
  ).join(", ");
  await pool.query(`TRUNCATE TABLE ${tableListSql} RESTART IDENTITY CASCADE`);
  console.log("Cleared target schema tables for clean 1:1 UUID migration.");

  for (const tbl of TABLES_IN_ORDER) {
    const { data: rows, error } = await sourceSb.from(tbl.name).select("*");
    if (error) {
      console.warn(`Skipping ${tbl.name}: ${error.message}`);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log(`- ${tbl.name}: 0 rows`);
      continue;
    }

    let processedRows = rows;
    if (tbl.name === "profile_photographs") {
      processedRows = [];
      for (const r of rows) {
        processedRows.push(await migrateStorageObjectIfNeeded(r));
      }
    }

    const { error: upsertErr } = await targetPg
      .from(tbl.name)
      .upsert(processedRows, { onConflict: tbl.conflict });

    if (upsertErr) {
      console.error(`Error migrating ${tbl.name}: ${upsertErr.message}`);
    } else {
      console.log(`+ ${tbl.name}: migrated ${processedRows.length} rows`);
    }
  }

  console.log("\nSupabase -> Self-Hosted PostgreSQL + Storage migration complete.");
}

runMigration()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await getPgPool().end();
  });
