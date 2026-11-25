import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const rawDbUrl = process.env.DATABASE_URL;
const schema =
  process.env.DB_SCHEMA ||
  process.env.NEXT_PUBLIC_SUPABASE_SCHEMA ||
  "matrimony";
const storageDir = process.env.STORAGE_DIR || "./storage";

if (!rawDbUrl) {
  console.error(
    "Missing DATABASE_URL. Configure DATABASE_URL in .env.local and run: npm run setup:db",
  );
  process.exit(1);
}

function buildClientConfig(rawUrl, useSsl) {
  const u = new URL(rawUrl);
  u.searchParams.delete("sslmode");
  u.searchParams.delete("ssl");
  return {
    connectionString: u.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  };
}

async function connectPgClient() {
  const urlHasSsl = /sslmode=(require|verify-ca|verify-full|no-verify)/i.test(
    rawDbUrl,
  );
  const attempts = urlHasSsl ? [true, false] : [false, true];
  let lastErr;

  for (const useSsl of attempts) {
    const client = new Client(buildClientConfig(rawDbUrl, useSsl));
    try {
      await client.connect();
      console.log(
        `Connected to PostgreSQL (ssl=${useSsl ? "enabled" : "disabled"}).`,
      );
      return client;
    } catch (err) {
      lastErr = err;
      try {
        await client.end();
      } catch {
        // ignore
      }
    }
  }

  throw lastErr;
}

async function ensureRoles(client) {
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END
    $$;
  `);
}

async function runMigrations(client) {
  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = await readFile(path.join(dir, file), "utf8");
    process.stdout.write(`Applying ${file} ... `);
    await client.query(sql);
    console.log("ok");
  }
}

async function ensureStorageDirectory() {
  const resolved = path.isAbsolute(storageDir)
    ? storageDir
    : path.resolve(process.cwd(), storageDir);
  await mkdir(path.join(resolved, "photos"), { recursive: true });
  await mkdir(path.join(resolved, "voice_bios"), { recursive: true });
  console.log(`Local storage directory ready at: ${resolved}`);

  if (
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  ) {
    const bucket = process.env.S3_BUCKET || "matrimony";
    const s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });

    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      console.log(`S3/MinIO bucket "${bucket}" already exists.`);
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`Created S3/MinIO bucket "${bucket}" on ${process.env.S3_ENDPOINT}.`);
    }

    const publicReadPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadGetObject",
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    };

    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify(publicReadPolicy),
      }),
    );
    console.log(`Configured public read policy on S3/MinIO bucket "${bucket}".`);
  }
}

async function verifySchema(client) {
  const res = await client.query(
    `SELECT slug, name, price_monthly FROM "${schema}"."subscription_plans" ORDER BY sort_order ASC`,
  );
  console.log(
    `Verified "${schema}" schema. Subscription plans:`,
    JSON.stringify(res.rows),
  );
}

let client;
try {
  client = await connectPgClient();
  await ensureRoles(client);
  await runMigrations(client);
  await ensureStorageDirectory();
  await verifySchema(client);
  console.log("\nDatabase setup complete. Next run: npm run seed:admin");
} catch (err) {
  console.error(`\nSetup failed: ${err.message}`);
  process.exit(1);
} finally {
  if (client) {
    await client.end();
  }
}
