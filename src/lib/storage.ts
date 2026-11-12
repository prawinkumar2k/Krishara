import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Image storage with two backends, chosen by env:
 *  - S3-compatible (AWS S3, Cloudflare R2, DigitalOcean Spaces…) when S3_BUCKET is set → survives serverless/redeploys
 *  - local disk (public/uploads) otherwise → fine for a single server / development
 *
 *  S3_BUCKET, S3_REGION (use "auto" for R2), S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
 *  S3_ENDPOINT (R2/Spaces only), S3_PUBLIC_URL (public base URL of the bucket/CDN)
 */
export type DetectedImage = { ext: "jpg" | "png" | "webp"; contentType: string };

/** Identify an image by its real file signature — never trust the browser-supplied type or filename. */
export function detectImage(b: Buffer): DetectedImage | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", contentType: "image/jpeg" };
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", contentType: "image/png" };
  if (b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return { ext: "webp", contentType: "image/webp" };
  return null;
}

export const storageBackend = () => (process.env.S3_BUCKET ? "s3" : "local");

let s3: S3Client | undefined;
function client() {
  return (s3 ??= new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: process.env.S3_ACCESS_KEY_ID
      ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" }
      : undefined,
  }));
}

export async function saveImage(bytes: Buffer, img: DetectedImage): Promise<string> {
  const name = `${randomUUID()}.${img.ext}`;
  if (storageBackend() === "s3") {
    const key = `products/${name}`;
    await client().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!, Key: key, Body: bytes, ContentType: img.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    const base = (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
    if (!base) throw new Error("S3_PUBLIC_URL is not set");
    return `${base}/${key}`;
  }
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return `/uploads/${name}`;
}
