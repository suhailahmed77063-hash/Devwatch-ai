/**
 * POST /api/security/agent/validate
 *
 * Run safe exploit validation for a finding inside the isolated sandbox.
 * Body: { findingId, authorized: true } — `authorized: true` is the explicit
 * user consent captured by the UI confirm dialog; re-checked server-side.
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { NotFoundError } from "@/lib/errors";
import { jsonOk, jsonError } from "@/lib/server/http";
import { requireDb } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/rate-limit";
import { assertToolAllowed } from "@/lib/server/security/permissions";
import { validateFinding } from "@/lib/server/security/validator";
import { recordSecurityAction } from "@/lib/server/security/orchestrator";
import type { RawFinding } from "@/lib/server/security/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  findingId: z.string().min(1),
  authorized: z.literal(true), // must be explicitly true — never defaulted
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const user = await requireUserOrThrow();
    const db = requireDb();

    const finding = await db.securityFinding.findUnique({
      where: { id: body.findingId },
      include: { run: { select: { repoUrl: true } } },
    });
    if (!finding) throw new NotFoundError("Security finding");

    const { role, projectId } = await assertAccess(finding.projectId, user.id, "ADMIN");
    await rateLimit({ key: `security-validate:${projectId}`, limit: 10, windowSec: 300 });

    // Tool permission: ADMIN + explicit authorization, enforced again here.
    assertToolAllowed({ tool: "RUN_SANDBOX_TEST", role, explicitAuth: true });

    // Rebuild the raw finding shape for the validator/PoC builder.
    const raw: RawFinding = {
      ruleId: finding.ruleId,
      title: finding.title,
      category: (finding.category as RawFinding["category"]) || "sast",
      severity: finding.severity.toLowerCase() as RawFinding["severity"],
      confidence: finding.confidence,
      cwe: finding.cwe ?? undefined,
      cve: finding.cve ?? undefined,
      filePath: finding.filePath ?? undefined,
      lineStart: finding.lineStart ?? undefined,
      rootCause: finding.rootCause ?? undefined,
      impact: finding.impact ?? undefined,
      components: (finding.components as unknown as RawFinding["components"]) ?? undefined,
    };

    // Prefer the workspace snapshot as the reproducible surface; fall back to
    // the linked repo when the workspace is empty.
    const { readAppFiles } = await import("@/lib/server/app/data");
    let files: Record<string, string> = await readAppFiles(projectId).catch(() => ({}));
    if (!Object.keys(files).length && finding.run.repoUrl) {
      const cfg = ((await db.project.findUnique({ where: { id: projectId }, select: { aiConfig: true } }))?.aiConfig ?? {}) as
        | { githubToken?: string }
        | Record<string, never>;
      const stored = (cfg as { githubToken?: string }).githubToken;
      const token = stored
        ? (await import("@/lib/server/crypto")).decryptSecret(stored)
        : process.env.GITHUB_TOKEN;
      if (token) {
        const { loadSecuritySource } = await import("@/lib/server/security/source");
        const src = await loadSecuritySource({ projectId, repoLink: null, project: { aiConfig: cfg }, ghConfig: { token } });
        files = src.files;
      }
    }

    const result = await validateFinding({
      finding: raw,
      files,
      authorized: true,
      authorizedBy: user.id,
      projectId,
    });

    // Persist the validation row.
    const validation = await db.securityValidation.create({
      data: {
        findingId: finding.id,
        projectId,
        status: result.status,
        environment: "isolated-sandbox",
        authorized: true,
        authorizedById: user.id,
        pocScript: result.pocScript ?? null,
        evidence: result.evidence as unknown as Prisma.InputJsonValue[],
        output: result.output ?? null,
        exploitReproduced: result.exploitReproduced,
        durationMs: result.durationMs,
        sandboxId: result.sandboxId ?? null,
        error: result.error ?? null,
        finishedAt: new Date(),
      },
    });

    // Update finding status from the validation outcome.
    const nextStatus =
      result.status === "EXPLOITABLE" ? "CONFIRMED" : result.status === "NOT_EXPLOITABLE" ? "VALIDATION_REQUIRED" : finding.status;
    await db.securityFinding.update({ where: { id: finding.id }, data: { status: nextStatus } });

    await recordSecurityAction({
      projectId,
      findingId: finding.id,
      actorId: user.id,
      tool: "RUN_SANDBOX_TEST",
      action: `sandbox validation → ${result.status}`,
      authScope: "EXPLICIT",
      authorized: true,
      environment: "isolated-sandbox",
      input: { ruleId: finding.ruleId, poc: result.pocScript ? "generated" : "none" },
      result: { status: result.status, exploitReproduced: result.exploitReproduced, durationMs: result.durationMs },
      error: result.error,
      durationMs: result.durationMs,
    });

    return jsonOk({
      validation: {
        id: validation.id,
        status: validation.status,
        exploitReproduced: validation.exploitReproduced,
        environment: validation.environment,
        output: validation.output,
        evidence: validation.evidence,
        durationMs: validation.durationMs,
        finishedAt: validation.finishedAt,
      },
      findingStatus: nextStatus,
    });
  } catch (e) {
    return jsonError(e);
  }
}
