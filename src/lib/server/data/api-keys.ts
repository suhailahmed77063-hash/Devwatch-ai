import crypto from "node:crypto";
import { NotFoundError } from "@/lib/errors";
import { requireDb } from "../db";

const PREFIX = "wf_";

export function generateApiKey(): { plain: string; prefix: string; hash: string } {
  const plain = `${PREFIX}${crypto.randomBytes(24).toString("base64url")}`;
  return { plain, prefix: plain.slice(0, 10), hash: hashKey(plain) };
}

export function hashKey(plain: string): string {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

export async function createApiKey(input: { userId: string; name: string }): Promise<{ id: string; plain: string; prefix: string }> {
  const db = requireDb();
  const { plain, prefix, hash } = generateApiKey();
  const key = await db.apiKey.create({
    data: { userId: input.userId, name: input.name.slice(0, 60), prefix, keyHash: hash },
  });
  return { id: key.id, plain, prefix };
}

export async function listApiKeys(userId: string) {
  const db = requireDb();
  return db.apiKey.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, prefix: true, status: true, lastUsedAt: true, createdAt: true } });
}

export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const db = requireDb();
  const key = await db.apiKey.findFirst({ where: { id: keyId, userId } });
  if (!key) throw new NotFoundError("API key");
  await db.apiKey.update({ where: { id: keyId }, data: { status: "REVOKED" } });
}

/** Verify a bearer token against stored hashes (used by REST clients). */
export async function verifyApiKey(token: string): Promise<{ userId: string } | null> {
  if (!token.startsWith(PREFIX)) return null;
  const db = requireDb();
  const hash = hashKey(token);
  const key = await db.apiKey.findUnique({ where: { keyHash: hash } });
  if (!key || key.status !== "ACTIVE") return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { userId: key.userId };
}
