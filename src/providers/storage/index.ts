import { promises as fs } from "node:fs";
import path from "node:path";
import { ConfigError } from "@/lib/errors";
import { optEnv } from "@/lib/server/env";
import { logger } from "@/lib/server/logger";

export interface PutOptions {
  key: string; // storage-relative key, e.g. "proj_abc/img.png"
  data: Buffer;
  contentType: string;
}

export interface StorageProvider {
  readonly id: string;
  put(opts: PutOptions): Promise<{ key: string; url: string | null }>;
  remove(key: string): Promise<void>;
}

/* ── Local disk (development / self-hosted) ───────────────────────────────── */

const LOCAL_ROOT = path.join(process.cwd(), "public", "assets");

export class LocalStorageProvider implements StorageProvider {
  readonly id = "local";

  async put(opts: PutOptions): Promise<{ key: string; url: string | null }> {
    const dest = path.join(LOCAL_ROOT, opts.key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, opts.data);
    // public static URL served by Next under /assets
    return { key: opts.key, url: `/assets/${opts.key.split("/").map(encodeURIComponent).join("/")}` };
  }

  async remove(key: string): Promise<void> {
    const dest = path.join(LOCAL_ROOT, key);
    await fs.rm(dest, { force: true }).catch(() => {});
  }
}

/* ── S3-compatible (AWS S3, Cloudflare R2, MinIO…) ────────────────────────── */

export class S3StorageProvider implements StorageProvider {
  readonly id = "s3";
  private client: any = null;

  private s3() {
    if (this.client) return this.client;
    const region = optEnv("S3_REGION") ?? "us-east-1";
    const bucket = optEnv("S3_BUCKET");
    if (!bucket) throw new ConfigError("S3_BUCKET is required for the s3 storage provider.");
    const S3 = require("@aws-sdk/client-s3");
    this.client = new S3.S3Client({
      region,
      endpoint: optEnv("S3_ENDPOINT") || undefined,
      forcePathStyle: Boolean(optEnv("S3_ENDPOINT")),
      credentials: {
        accessKeyId: optEnv("S3_ACCESS_KEY_ID") ?? "",
        secretAccessKey: optEnv("S3_SECRET_ACCESS_KEY") ?? "",
      },
    });
    this.bucket = bucket;
    return this.client;
  }

  private bucket = "";

  async put(opts: PutOptions): Promise<{ key: string; url: string | null }> {
    const client = this.s3();
    const S3 = require("@aws-sdk/client-s3");
    await client.send(
      new S3.PutObjectCommand({
        Bucket: this.bucket,
        Key: opts.key,
        Body: opts.data,
        ContentType: opts.contentType,
      })
    );
    const base = optEnv("S3_PUBLIC_BASE_URL");
    const url = base ? `${base.replace(/\/$/, "")}/${opts.key}` : null;
    return { key: opts.key, url };
  }

  async remove(key: string): Promise<void> {
    const client = this.s3();
    const S3 = require("@aws-sdk/client-s3");
    await client.send(new S3.DeleteObjectCommand({ Bucket: this.bucket, Key: key })).catch((e: unknown) => {
      logger.warn("storage.s3.delete_failed", { key, error: e instanceof Error ? e.message : String(e) });
    });
  }
}

let chosen: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (chosen) return chosen;
  const mode = optEnv("STORAGE_PROVIDER") ?? "local";
  if (mode === "s3") {
    chosen = new S3StorageProvider();
  } else {
    chosen = new LocalStorageProvider();
  }
  return chosen;
}

/** Random key for uploads, namespaced by project so keys never collide. */
export function storageKeyFor(projectId: string, filename: string): string {
  const safe = filename.replace(/[^\w.\-]+/g, "-").slice(-80) || "file";
  return `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
}
