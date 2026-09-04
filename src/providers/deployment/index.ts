import { promises as fs } from "node:fs";
import { ConfigError } from "@/lib/errors";
import { optEnv } from "@/lib/server/env";
import type { Prisma } from "@prisma/client";

export interface DeployFiles {
  [path: string]: string | Buffer;
}

export interface DeployContext {
  projectId: string;
  deploymentId: string;
  slug: string;
  files: DeployFiles;
}

export interface DeploymentProvider {
  readonly id: string;
  /** Upload/store the built artifact. Returns the canonical public URL. */
  deploy(ctx: DeployContext): Promise<{ url: string }>;
}

/**
 * Default provider: WebForge hosts the published static site itself. Files
 * are stored on the Deployment row (`artifact`) and served at /s/:slug —
 * this works on any deployment without extra credentials.
 */
export class WebForgeProvider implements DeploymentProvider {
  readonly id = "webforge";

  async deploy(ctx: DeployContext): Promise<{ url: string }> {
    const artifact: Record<string, string> = {};
    for (const [path, content] of Object.entries(ctx.files)) {
      if (typeof content === "string") artifact[path] = content;
    }
    const db = await import("@/lib/server/db");
    const prisma = db.requireDb();
    await prisma.deployment.update({
      where: { id: ctx.deploymentId },
      data: { artifact: artifact as unknown as Prisma.InputJsonValue },
    });
    const base = optEnv("WEBFORGE_APP_BASE") ?? "webforge.app";
    return { url: `https://${ctx.slug}.${base}` };
  }
}

/** S3-compatible static hosting (CloudFront/R2 public bucket in front). */
export class S3DeploymentProvider implements DeploymentProvider {
  readonly id = "s3";

  async deploy(ctx: DeployContext): Promise<{ url: string }> {
    const bucket = optEnv("S3_BUCKET");
    if (!bucket) throw new ConfigError("S3_BUCKET is required for the s3 deployment provider.");
    const S3 = require("@aws-sdk/client-s3");
    const client = new S3.S3Client({
      region: optEnv("S3_REGION") ?? "us-east-1",
      endpoint: optEnv("S3_ENDPOINT") || undefined,
      forcePathStyle: Boolean(optEnv("S3_ENDPOINT")),
      credentials: {
        accessKeyId: optEnv("S3_ACCESS_KEY_ID") ?? "",
        secretAccessKey: optEnv("S3_SECRET_ACCESS_KEY") ?? "",
      },
    });
    const prefix = `sites/${ctx.projectId}/${ctx.deploymentId}`;
    for (const [path, content] of Object.entries(ctx.files)) {
      const body = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
      await client.send(
        new S3.PutObjectCommand({
          Bucket: bucket,
          Key: `${prefix}/${path}`,
          Body: body,
          ContentType: path.endsWith(".html") ? "text/html; charset=utf-8" : path.endsWith(".xml") ? "application/xml" : path.endsWith(".txt") ? "text/plain" : "application/json",
          CacheControl: path === "index.html" ? "no-cache" : "public, max-age=300",
        })
      );
    }
    const base = optEnv("S3_PUBLIC_BASE_URL");
    if (!base) throw new ConfigError("S3_PUBLIC_BASE_URL must point at the public site origin for s3 deployments.");
    return { url: base };
  }
}

/** Local "write to disk" provider — useful for self-hosted static hosting. */
export class LocalDiskDeploymentProvider implements DeploymentProvider {
  readonly id = "disk";
  async deploy(ctx: DeployContext): Promise<{ url: string }> {
    const root = optEnv("DEPLOY_OUTPUT_DIR") ?? `${process.cwd()}/storage/sites`;
    for (const [path, content] of Object.entries(ctx.files)) {
      const dest = `${root}/${ctx.slug}/${path}`;
      await fs.mkdir(dest.replace(/\/[^/]+$/, ""), { recursive: true });
      await fs.writeFile(dest, content);
    }
    return { url: `${optEnv("WEBFORGE_SITE_BASE_URL") ?? "https://example.com"}/${ctx.slug}` };
  }
}

let chosen: DeploymentProvider | null = null;

export function getDeploymentProvider(): DeploymentProvider {
  if (chosen) return chosen;
  const mode = optEnv("DEPLOYMENT_PROVIDER") ?? "webforge";
  switch (mode) {
    case "s3":
      chosen = new S3DeploymentProvider();
      break;
    case "disk":
      chosen = new LocalDiskDeploymentProvider();
      break;
    case "webforge":
    default:
      chosen = new WebForgeProvider();
      break;
  }
  return chosen;
}
