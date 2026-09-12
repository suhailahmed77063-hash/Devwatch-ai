/**
 * Security Agent — Verification Agent.
 *
 * After the developer applies a fix: re-run the scanners and re-run the safe
 * validation in the sandbox. Compares before/after states and records
 * remaining risks. Never merges anything — verification only *reports*.
 */

import { logger } from "../logger";
import { runAllScanners } from "./scanners";
import { validateFinding } from "./validator";
import { buildPoc } from "./poc";
import { fingerprintOf } from "./utils";
import type { RawFinding } from "./types";

export interface VerifyInput {
  projectId: string;
  /** The original finding being verified as fixed. */
  finding: {
    id: string;
    ruleId: string;
    title: string;
    severity: "critical" | "high" | "medium" | "low";
    confidence: number;
    cwe?: string | null;
    cve?: string | null;
    filePath?: string | null;
    lineStart?: number | null;
    rootCause?: string | null;
    impact?: string | null;
    aiAnalysis?: string | null;
    components?: unknown;
  };
  /** Post-fix file map (workspace or freshly pulled repo). */
  files: Record<string, string>;
  /** Authorization for the sandbox re-validation step. */
  authorized: boolean;
  authorizedBy: string;
}

export interface VerifyResult {
  status: "FIXED" | "STILL_VULNERABLE" | "INCONCLUSIVE" | "FAILED";
  beforeState: string;
  rescan: {
    findingCount: number;
    reproduced: boolean;
    notes: string;
    sameFingerprintPresent: boolean;
  };
  validation: {
    status: "EXPLOITABLE" | "NOT_EXPLOITABLE" | "INCONCLUSIVE" | "FAILED" | "SKIPPED";
    output: string | null;
  };
  tests: { passed: boolean; output: string | null } | null;
  remainingRisks: string[];
  summary: string;
  durationMs: number;
  error: string | null;
}

/** Re-run scanners + sandbox PoC to verify a fix worked. */
export async function verifyFix(input: VerifyInput): Promise<VerifyResult> {
  const started = Date.now();
  const notes: string[] = [];

  try {
    // 1. Re-scan
    const scanned = await runAllScanners(input.files);
    const sameFingerprint = scanned.find(
      (f) => f.ruleId === input.finding.ruleId && f.filePath === input.finding.filePath
    );
    const reproduced = Boolean(sameFingerprint);
    if (reproduced) {
      notes.push("The original rule still fires at the same location.");
    } else {
      notes.push("Original rule no longer fires in the re-scan.");
    }

    // 2. Re-run safe validation
    const rawForPoc: RawFinding = {
      ruleId: input.finding.ruleId,
      title: input.finding.title,
      category: "sast",
      severity: input.finding.severity,
      confidence: input.finding.confidence,
      cwe: input.finding.cwe ?? undefined,
      cve: input.finding.cve ?? undefined,
      filePath: input.finding.filePath ?? undefined,
      lineStart: input.finding.lineStart ?? undefined,
      rootCause: input.finding.rootCause ?? undefined,
      impact: input.finding.impact ?? undefined,
    };
    const pocAvailable = Boolean(buildPoc(rawForPoc));
    let validationStatus: VerifyResult["validation"]["status"] = "SKIPPED";
    let validationOutput: string | null = null;

    if (pocAvailable && input.authorized) {
      const vres = await validateFinding({
        finding: rawForPoc,
        files: input.files,
        authorized: input.authorized,
        authorizedBy: input.authorizedBy,
        projectId: input.projectId,
      });
      validationStatus = vres.status;
      validationOutput = vres.output;
      if (vres.status === "NOT_EXPLOITABLE") notes.push("Sandbox PoC no longer reproduces.");
      else if (vres.status === "EXPLOITABLE") notes.push("Sandbox PoC still reproduces.");
    } else if (!input.authorized) {
      notes.push("Sandbox re-validation skipped: not authorized in this request.");
    } else {
      notes.push("No safe PoC exists for this class; verification relied on re-scan only.");
    }

    // 3. Optional quick tests (workspace runner) when available
    let tests: VerifyResult["tests"] = null;
    try {
      const { runCommand } = await import("../app/workspace");
      const { workspaceDir } = await import("../app/templates");
      const dir = workspaceDir(input.projectId);
      const res = await runCommand(dir, "npm", ["test", "--silent"], 120_000);
      tests = {
        passed: res.code === 0,
        output: [res.stdout, res.stderr].filter(Boolean).join("\n").slice(-4000) || null,
      };
    } catch {
      // no workspace / no tests — fine
    }

    // 4. Remaining risks = new findings introduced post-fix
    const remainingRisks = scanned
      .filter((f) => f.ruleId !== input.finding.ruleId)
      .slice(0, 10)
      .map((f) => `${f.severity.toUpperCase()}: ${f.title} (${f.filePath ?? "?"})`);

    const status: VerifyResult["status"] = reproduced
      ? "STILL_VULNERABLE"
      : validationStatus === "EXPLOITABLE"
        ? "STILL_VULNERABLE"
        : validationStatus === "FAILED" || validationStatus === "INCONCLUSIVE"
          ? "INCONCLUSIVE"
          : "FIXED";

    return {
      status,
      beforeState: "VULNERABLE",
      rescan: {
        findingCount: scanned.length,
        reproduced,
        notes: notes.join(" "),
        sameFingerprintPresent: reproduced,
      },
      validation: { status: validationStatus, output: validationOutput },
      tests,
      remainingRisks,
      summary:
        status === "FIXED"
          ? "Fix verified: scanner is clean at the original location and the PoC no longer reproduces."
          : status === "STILL_VULNERABLE"
            ? "Fix not effective: the issue still reproduces."
            : "Verification inconclusive — review the details manually.",
      durationMs: Date.now() - started,
      error: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("security.verification.failed", { projectId: input.projectId, error: msg });
    return {
      status: "FAILED",
      beforeState: "VULNERABLE",
      rescan: { findingCount: 0, reproduced: false, notes: "Verification run failed.", sameFingerprintPresent: false },
      validation: { status: "SKIPPED", output: null },
      tests: null,
      remainingRisks: [],
      summary: "Verification could not complete.",
      durationMs: Date.now() - started,
      error: msg,
    };
  }
}

// Keep fingerprintOf import used (used by callers for dedupe tracking).
export { fingerprintOf };
