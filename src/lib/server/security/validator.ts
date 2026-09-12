/**
 * Security Agent — Validator (isolated sandbox).
 *
 * Runs a non-destructive PoC against the finding inside a temporary sandbox:
 *   - isolated temp directory, destroyed afterwards
 *   - strict timeout + output caps
 *   - no outbound network by policy: PoCs are static/local-only (the sandbox
 *     manager is process-isolated; PoC scripts deliberately never dial out)
 *   - evidence = script output (trimmed + redacted) and exit status
 *
 * Authorization: requires explicit user confirmation (authorized=true) and
 * the ADMIN role — enforced again here, independent of the route.
 */

import { ForbiddenError, ValidationError } from "@/lib/errors";
import { logger } from "../logger";
import {
  createSandbox,
  copyFilesToSandbox,
  executeInSandbox,
  destroySandbox,
} from "../sandbox/manager";
import { buildPoc } from "./poc";
import { redactSecrets } from "./utils";
import type { RawFinding } from "./types";

const VALIDATION_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_CHARS = 20_000;

export interface ValidationContext {
  finding: RawFinding;
  /** Full or partial file map to reproduce the vulnerable context. */
  files: Record<string, string>;
  /** User-explicit authorization (the UI confirm dialog sets this). */
  authorized: boolean;
  authorizedBy: string;
  projectId: string;
}

export interface ValidationEvidence {
  label: string;
  output?: string;
  exitCode?: number | null;
  durationMs?: number;
}

export interface ValidationResult {
  status: "EXPLOITABLE" | "NOT_EXPLOITABLE" | "INCONCLUSIVE" | "FAILED";
  exploitReproduced: boolean;
  evidence: ValidationEvidence[];
  pocScript: string | null;
  output: string | null;
  sandboxId: string | null;
  durationMs: number;
  error: string | null;
}

/**
 * Run safe exploit validation. Throws ForbiddenError when authorization is
 * missing — callers must surface "Authorization Required" in the UI.
 */
export async function validateFinding(ctx: ValidationContext): Promise<ValidationResult> {
  if (!ctx.authorized) {
    throw new ForbiddenError(
      "Sandbox validation requires explicit user authorization (Validation Environment: Isolated Sandbox)."
    );
  }

  const started = Date.now();
  const poc = buildPoc(ctx.finding);

  if (!poc) {
    return {
      status: "INCONCLUSIVE",
      exploitReproduced: false,
      evidence: [{ label: "No safe PoC available for this vulnerability class" }],
      pocScript: null,
      output: null,
      sandboxId: null,
      durationMs: Date.now() - started,
      error: null,
    };
  }

  let sandboxId: string | null = null;
  try {
    const sandbox = await createSandbox(`secval-${ctx.projectId}`);
    sandboxId = sandbox.id;

    // Materialize a minimal reproduction context (capped, redacted).
    const repro: Record<string, string> = {};
    for (const [p, c] of Object.entries(ctx.files)) {
      if (ctx.finding.filePath && p === ctx.finding.filePath) repro[p] = c.slice(0, 128_000);
    }
    if (!Object.keys(repro).length && ctx.finding.filePath && ctx.files[ctx.finding.filePath]) {
      repro[ctx.finding.filePath] = ctx.files[ctx.finding.filePath].slice(0, 128_000);
    }
    await copyFilesToSandbox(sandbox.id, repro);

    const filename = poc.language === "bash" ? "poc.sh" : "poc.js";
    await copyFilesToSandbox(sandbox.id, {
      [filename]: poc.script,
      "poc.json": JSON.stringify(
        {
          ruleId: ctx.finding.ruleId,
          authorizedBy: ctx.authorizedBy,
          environment: "isolated-sandbox",
          generatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
    });

    const cmd = poc.language === "bash" ? "bash" : "node";
    const result = await executeInSandbox(sandbox.id, cmd, [filename], {
      timeoutMs: VALIDATION_TIMEOUT_MS,
      maxMemoryMb: 256,
    });

    const output = redactSecrets(
      [result.stdout, result.stderr].filter(Boolean).join("\n").slice(0, MAX_OUTPUT_CHARS)
    );
    const reproduced = result.exitCode === 0 && !result.timedOut;

    const status: ValidationResult["status"] = result.timedOut
      ? "INCONCLUSIVE"
      : reproduced
        ? "EXPLOITABLE"
        : "NOT_EXPLOITABLE";

    return {
      status,
      exploitReproduced: reproduced,
      evidence: [
        {
          label: `${poc.description} (${poc.language})`,
          output: output.slice(0, 4000),
          exitCode: result.exitCode,
          durationMs: result.durationMs,
        },
      ],
      pocScript: poc.script,
      output,
      sandboxId,
      durationMs: Date.now() - started,
      error: result.oomKilled ? "Sandbox process was killed (memory limit)" : null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("security.validation.failed", { projectId: ctx.projectId, error: msg });
    return {
      status: "FAILED",
      exploitReproduced: false,
      evidence: [{ label: "Sandbox execution error", output: redactSecrets(msg).slice(0, 2000) }],
      pocScript: poc?.script ?? null,
      output: null,
      sandboxId,
      durationMs: Date.now() - started,
      error: msg,
    };
  } finally {
    if (sandboxId) {
      await destroySandbox(sandboxId).catch((e) =>
        logger.warn("security.validation.sandbox_cleanup_failed", { sandboxId, error: String(e) })
      );
    }
  }
}

/** Guard used by API routes for request-shape validation. */
export function assertValidationRequestAuthorized(body: { authorized?: boolean; findingId?: string }): void {
  if (!body.findingId) throw new ValidationError("findingId is required");
  if (body.authorized !== true) {
    throw new ForbiddenError("Validation requires the user to accept the isolated-sandbox authorization prompt.");
  }
}
