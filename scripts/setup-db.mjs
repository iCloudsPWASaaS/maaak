import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const storageKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  serviceKey;
const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "matrimony";
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "matrimony";

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with: npm run setup:db",
  );
  process.exit(1);
}

async function execSql(sql) {
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql_string: sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL failed (${res.status}): ${text}`);
  }
}

async function runMigrations() {
  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = await readFile(path.join(dir, file), "utf8");
    process.stdout.write(`Applying ${file} ... `);
    await execSql(sql);
    console.log("ok");
  }
}

async function ensureBucket() {
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: storageKey,
      Authorization: `Bearer ${storageKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
      file_size_limit: 52428800,
      allowed_mime_types: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "audio/webm",
        "audio/mpeg",
        "audio/mp4",
        "audio/wav",
        "audio/ogg",
      ],
    }),
  });

  if (res.ok) {
    console.log(`Storage bucket "${bucket}" created.`);
    return;
  }

  const text = await res.text();
  if (
    res.status === 409 ||
    /already exists/i.test(text) ||
    /duplicate/i.test(text)
  ) {
    console.log(`Storage bucket "${bucket}" already exists.`);
    return;
  }
  throw new Error(`Bucket setup failed (${res.status}): ${text}`);
}

async function verifySchema() {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const res = await fetch(
      `${url}/rest/v1/subscription_plans?select=slug,name,price_monthly&order=sort_order.asc`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Accept-Profile": schema,
        },
      },
    );
    const text = await res.text();
    if (res.ok) {
      console.log(`Verified "${schema}" schema. Subscription plans: ${text}`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(
    `Schema "${schema}" verification failed after multiple attempts.`,
  );
}

try {
  await runMigrations();
  await execSql("notify pgrst, 'reload schema'; notify pgrst, 'reload config';");
  await ensureBucket();
  await verifySchema();
  console.log("\nDatabase setup complete. Next run: npm run seed:admin");
} catch (err) {
  console.error(`\nSetup failed: ${err.message}`);
  process.exit(1);
}
