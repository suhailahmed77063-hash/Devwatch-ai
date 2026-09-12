/**
 * POST /api/security/agent/validate
 *
 * Safe exploit validation inside the isolated sandbox. Requires explicit
 * user authorization (`authorized: true` — set by the confirm dialog) and
 * an admin/super_admin role. Non-destructive PoC only; evidence is redacted
 * and stored minimally.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { agentValidations, agentActions, securityFindings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSecurityActor, loadFindingForActor, assertCanValidate } from "@/lib/security-agent/auth";
import { agentErrorResponse } from "@/lib/security-agent/api";
import { assertToolAllowed } from "@/lib/security-agent/permissions";
import { runSandboxValidation } from "@/lib/security-agent/validator";
import { SANDBOX_TIMEOUT_MS } from "@/lib/security-agent/validator";

export const maxDuration = 120;

const bodySchema = z.object({
  findingId: z.string().uuid(),
  authorized: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await getSecurityActor();
    const body = bodySchema.parse(await request.json());

    if (!body.authorized) {
      return NextResponse.json(
        { error: "Explicit authorization is required to run sandbox validation" },
        { status: 403 }
      );
    }

    assertCanValidate(actor.role);
    const finding = await loadFindingForActor(body.findingId, actor);

    // Least-privilege tool check (admin role + explicit auth).
    const { environment } = assertToolAllowed({
      tool: "RUN_SANDBOX_TEST",
      role: actor.role,
      explicitAuth: body.authorized,
    });

    const findingShape = {
      ruleId: finding.ruleId ?? "unknown",
      title: finding.description,
      category: (finding.category as "sast" | "dependency" | "secret" | "config" | "authz") ?? "sast",
      severity: finding.severity === "informational" ? "low" : finding.severity,
      confidence: finding.confidence ?? 50,
      cwe: finding.cweId ?? undefined,
      filePath: finding.file ?? undefined,
      lineStart: finding.line ?? undefined,
      snippet: finding.snippet ?? undefined,
    };

    await db.insert(agentActions).values({
      orgId: actor.orgId,
      findingId: finding.id,
      actorId: actor.userId,
      tool: "RUN_SANDBOX_TEST",
      action: "validation_started",
      authScope: "explicit",
      authorized: true,
      environment,
      input: JSON.stringify({ ruleId: finding.ruleId, file: finding.file }),
    });

    const exec = await runSandboxValidation(findingShape, SANDBOX_TIMEOUT_MS);

    const [validation] = await db
      .insert(agentValidations)
      .values({
        findingId: finding.id,
        orgId: actor.orgId,
        status: exec.result?.status ?? "inconclusive",
        environment,
        authorized: true,
        authorizedById: actor.userId,
        pocScript: exec.plan?.description ?? null,
        evidence: exec.result
          ? { output: exec.result.output.slice(0, 8000), description: exec.plan?.description }
          : { note: "No safe PoC exists for this finding class" },
        output: exec.result?.output?.slice(0, 8000) ?? null,
        exploitReproduced: exec.result?.status === "exploitable",
        durationMs: exec.result?.durationMs ?? null,
        error: exec.result?.error ?? null,
        finishedAt: new Date(),
      })
      .returning();

    // Update finding status from the validation outcome.
    const nextStatus =
      exec.result?.status === "exploitable"
        ? ("confirmed" as const)
        : exec.result?.status === "not_exploitable"
          ? ("false_positive" as const)
          : ("validation_required" as const);
    await db
      .update(securityFindings)
      .set({ agentStatus: nextStatus })
      .where(eq(securityFindings.id, finding.id));

    await db.insert(agentActions).values({
      orgId: actor.orgId,
      findingId: finding.id,
      actorId: actor.userId,
      tool: "RUN_SANDBOX_TEST",
      action: "validation_completed",
      authScope: "explicit",
      authorized: true,
      environment,
      result: JSON.stringify({ status: exec.result?.status, durationMs: exec.result?.durationMs }),
    });

    return NextResponse.json({
      validation: {
        id: validation.id,
        status: validation.status,
        exploitReproduced: validation.exploitReproduced,
        output: validation.output,
        evidence: validation.evidence,
        durationMs: validation.durationMs,
        error: validation.error,
      },
      description: exec.plan?.description ?? null,
    });
  } catch (err) {
    return agentErrorResponse(err);
  }
}
