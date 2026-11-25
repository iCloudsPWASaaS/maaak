import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  webm: "audio/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
}

function getS3Bucket(): string {
  return (
    process.env.S3_BUCKET ||
    process.env.SUPABASE_STORAGE_BUCKET ||
    "matrimony"
  );
}

export function getLocalStorageRoot(): string {
  const dir = process.env.STORAGE_DIR || "./storage";
  return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
}

export function resolveSafeLocalPath(storagePath: string): string {
  const root = getLocalStorageRoot();
  const normalized = storagePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  const resolved = path.resolve(root, normalized);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error("Invalid storage path");
  }
  return resolved;
}

export function getMimeTypeFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_MIME_TYPES[ext] || "application/octet-stream";
}

export async function uploadMediaFile(
  storagePath: string,
  buffer: Buffer,
  contentType?: string,
): Promise<{ storagePath: string; publicUrl: string }> {
  const cleanKey = storagePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  const mime = contentType || getMimeTypeFromPath(cleanKey);

  if (isS3Configured()) {
    const s3 = getS3Client();
    const bucket = getS3Bucket();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: cleanKey,
        Body: buffer,
        ContentType: mime,
      }),
    );

    const s3PublicBase = process.env.S3_PUBLIC_URL?.trim();
    const publicUrl = s3PublicBase
      ? `${s3PublicBase.replace(/\/$/, "")}/${cleanKey}`
      : `/api/media/${cleanKey}`;

    return { storagePath: cleanKey, publicUrl };
  }

  // Local disk / Coolify persistent volume storage
  const destPath = resolveSafeLocalPath(cleanKey);
  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, buffer);

  return {
    storagePath: cleanKey,
    publicUrl: `/api/media/${cleanKey}`,
  };
}

export async function deleteMediaFile(storagePath: string): Promise<void> {
  if (!storagePath) return;
  const cleanKey = storagePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");

  if (isS3Configured()) {
    try {
      const s3 = getS3Client();
      await s3.send(
        new DeleteObjectCommand({
          Bucket: getS3Bucket(),
          Key: cleanKey,
        }),
      );
    } catch {
      // Ignore missing remote object on delete
    }
  }

  try {
    const localPath = resolveSafeLocalPath(cleanKey);
    await rm(localPath, { force: true });
  } catch {
    // Ignore missing local file on delete
  }
}

export async function readMediaFile(
  storagePath: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const cleanKey = storagePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  const contentType = getMimeTypeFromPath(cleanKey);

  // 1. Check local storage directory first
  try {
    const localPath = resolveSafeLocalPath(cleanKey);
    const st = await stat(localPath);
    if (st.isFile()) {
      const buffer = await readFile(localPath);
      return { buffer, contentType };
    }
  } catch {
    // Fall through to S3 if configured
  }

  // 2. Fallback to S3/MinIO if configured
  if (isS3Configured()) {
    try {
      const s3 = getS3Client();
      const res = await s3.send(
        new GetObjectCommand({
          Bucket: getS3Bucket(),
          Key: cleanKey,
        }),
      );
      if (res.Body) {
        const bytes = await res.Body.transformToByteArray();
        return {
          buffer: Buffer.from(bytes),
          contentType: res.ContentType || contentType,
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}
