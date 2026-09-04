import { promises as dns } from "node:dns";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { requireDb } from "../db";
import { optEnv } from "../env";
import { logAudit } from "../audit";

export function dnsInstructions(slug: string, projectId?: string): { type: "CNAME"; name: string; value: string; ttl: string }[] {
  const appBase = optEnv("WEBFORGE_APP_BASE") ?? "webforge.app";
  void projectId;
  return [
    {
      type: "CNAME",
      name: "www",
      value: `${slug}.${appBase}`,
      ttl: "3600",
    },
    {
      type: "CNAME",
      name: "@ (or an A record)",
      value: `${slug}.${appBase}`,
      ttl: "3600",
    },
  ];
}

export async function addDomain(projectId: string, domainRaw: string, actorId: string): Promise<string> {
  const db = requireDb();
  const domain = domainRaw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)) {
    throw new ConflictError("Enter a valid domain like mywebsite.com or www.mywebsite.com", "That doesn't look like a valid domain. Use e.g. mywebsite.com");
  }
  const project = await db.project.findUnique({ where: { id: projectId }, select: { slug: true } });
  if (!project) throw new NotFoundError("Project");
  const existing = await db.customDomain.findUnique({ where: { domain } });
  if (existing) {
    if (existing.projectId === projectId) throw new ConflictError("Domain already added to this project.");
    throw new ConflictError("Domain is already in use by another project.");
  }
  const created = await db.customDomain.create({
    data: { projectId, domain, status: "PENDING", dnsTarget: `${project.slug}.${optEnv("WEBFORGE_APP_BASE") ?? "webforge.app"}` },
  });
  await logAudit({ actorId, projectId, action: "domain.add", entity: "CustomDomain", entityId: created.id, meta: { domain } });
  return created.id;
}

/**
 * Real DNS verification: resolves CNAME records for the domain and compares
 * them with the expected target. Status ACTIVE only when DNS points here.
 */
export async function verifyDomain(domainId: string, actorId: string): Promise<{ status: string; found: string[] }> {
  const db = requireDb();
  const row = await db.customDomain.findUnique({ where: { id: domainId } });
  if (!row) throw new NotFoundError("Domain");
  const target = row.dnsTarget ?? `${row.domain}.webforge.app`;

  let found: string[] = [];
  try {
    const records = await dns.resolveCname(row.domain);
    found = records.map((r) => r.toLowerCase().replace(/\.$/, ""));
  } catch {
    try {
      const recs = await dns.resolve4(row.domain);
      found = recs; // apex A record — treat presence as pointed when provider host matches
    } catch {
      // no records yet — still PENDING
    }
  }

  const matches = found.some((r) => r === target.replace(/\.$/, "") || r.endsWith(`.${target.replace(/^www\./, "")}`));
  const status = matches ? "ACTIVE" : "VERIFYING";
  await db.customDomain.update({ where: { id: domainId }, data: { status, verifiedAt: matches ? new Date() : row.verifiedAt } });
  await logAudit({ actorId, projectId: row.projectId, action: "domain.verify", entity: "CustomDomain", entityId: domainId, meta: { status, found } });
  return { status, found };
}

export async function removeDomain(domainId: string, actorId: string): Promise<void> {
  const db = requireDb();
  const row = await db.customDomain.findUnique({ where: { id: domainId } });
  if (!row) throw new NotFoundError("Domain");
  await db.customDomain.delete({ where: { id: domainId } });
  await logAudit({ actorId, projectId: row.projectId, action: "domain.remove", entity: "CustomDomain", entityId: domainId, meta: { domain: row.domain } });
}

export async function listDomains(projectId: string) {
  const db = requireDb();
  return db.customDomain.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });
}
