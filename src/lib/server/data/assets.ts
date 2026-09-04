import type { AssetKind } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";
import { requireDb } from "../db";
import { getStorageProvider } from "@/providers/storage";
import { storageKeyFor } from "@/providers/storage";

export async function listAssets(projectId: string) {
  const db = requireDb();
  return db.asset.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });
}

export interface CreateAssetInput {
  projectId: string;
  ownerId: string;
  name: string;
  data?: Buffer;
  mimeType?: string;
  kind?: AssetKind;
  width?: number | null;
  height?: number | null;
  externalUrl?: string; // when data is not provided (e.g. AI generated URL)
  aiGenerated?: boolean;
}

export async function createAsset(input: CreateAssetInput): Promise<string> {
  const db = requireDb();
  const kind = input.kind ?? "IMAGE";
  const isImage = kind === "IMAGE";
  const ext = input.mimeType ? (input.mimeType.includes("png") ? "png" : input.mimeType.includes("webp") ? "webp" : input.mimeType.includes("svg") ? "svg" : input.mimeType.includes("gif") ? "gif" : input.mimeType.includes("jpeg") || input.mimeType.includes("jpg") ? "jpg" : "bin") : "bin";
  const filename = `${Date.now()}.${ext}`;

  let storageKey: string;
  let url: string | null;
  if (input.data) {
    const provider = getStorageProvider();
    const key = storageKeyFor(input.projectId, input.name ? `${input.name}.${ext}` : filename);
    const put = await provider.put({ key, data: input.data, contentType: input.mimeType ?? "application/octet-stream" });
    storageKey = put.key;
    url = put.url;
  } else {
    storageKey = input.externalUrl ?? "";
    url = input.externalUrl ?? null;
  }

  const asset = await db.asset.create({
    data: {
      projectId: input.projectId,
      ownerId: input.ownerId,
      kind,
      name: (input.name || "Untitled").slice(0, 200),
      filename,
      mimeType: input.mimeType ?? null,
      size: input.data?.length ?? 0,
      width: input.width ?? null,
      height: input.height ?? null,
      storageKey,
      url,
      isAiGenerated: input.aiGenerated ?? false,
    },
  });
  void isImage;
  return asset.id;
}

export async function renameAsset(projectId: string, assetId: string, name: string): Promise<void> {
  const db = requireDb();
  const asset = await db.asset.findFirst({ where: { id: assetId, projectId } });
  if (!asset) throw new NotFoundError("Asset");
  await db.asset.update({ where: { id: assetId }, data: { name: name.slice(0, 200) } });
}

export async function deleteAsset(projectId: string, assetId: string): Promise<void> {
  const db = requireDb();
  const asset = await db.asset.findFirst({ where: { id: assetId, projectId } });
  if (!asset) throw new NotFoundError("Asset");
  // Remove the object from storage when we manage it (skip pure external URLs).
  if (asset.storageKey && asset.storageKey !== asset.url && !asset.storageKey.startsWith("http")) {
    const provider = getStorageProvider();
    await provider.remove(asset.storageKey).catch(() => {});
  }
  await db.asset.delete({ where: { id: assetId } });
}
