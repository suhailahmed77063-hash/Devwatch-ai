/**
 * AI Security Agent — Verification Agent.
 *
 * After a developer applies a fix, re-fetches the repository source and
 * re-runs every scanner. A finding is FIXED when its fingerprint no longer
 * appears in the fresh scan; STILL_VULNERABLE when it does. Remaining risks
 * (other open findings) are reported alongside.
 */

import type { RawFinding } from "./types";
import { runAllScanners } from "./scanners";
import { loadRepoSource } from "./source";
import { fingerprintOf } from "./utils";

export interface VerificationOutcome {
  status: "fixed" | "still_vulnerable" | "inconclusive" | "failed";
  beforeState: "present" | "unknown";
  rescanFileCount: number;
  stillDetected: boolean;
  remainingFindings: Array<{ ruleId: string; title: string; severity: string; filePath?: string }>;
  summary: string;
  error?: string;
}

export async function verifyFix(opts: {
  owner: string;
  repo: string;
  branch?: string;
  token?: string;
  target: Pick<RawFinding, "ruleId" | "filePath" | "lineStart"> & { extra?: string | null };
  fixedAt: Date;
}): Promise<VerificationOutcome> {
  try {
    const source = await loadRepoSource({ owner: opts.owner, repo: opts.repo, branch: opts.branch, token: opts.token });
    const freshFindings = await runAllScanners(source.files);

    const targetFp = fingerprintOf({
      ruleId: opts.target.ruleId,
      filePath: opts.target.filePath,
      lineStart: opts.target.lineStart,
      extra: opts.target.extra ?? null,
    });

    const stillDetected = freshFindings.some(
      (f) =>
        fingerprintOf({ ruleId: f.ruleId, filePath: f.filePath, lineStart: f.lineStart, extra: null }) === targetFp ||
        (f.ruleId === opts.target.ruleId && f.filePath === opts.target.filePath)
    );

    const remainingFindings = freshFindings
      .filter((f) => f.ruleId !== opts.target.ruleId)
      .slice(0, 20)
      .map((f) => ({ ruleId: f.ruleId, title: f.title, severity: f.severity, filePath: f.filePath }));

    const status: VerificationOutcome["status"] = stillDetected ? "still_vulnerable" : "fixed";

    return {
      status,
      beforeState: "present",
      rescanFileCount: source.fileCount,
      stillDetected,
      remainingFindings,
      summary: stillDetected
        ? `After Fix: 🔴 Vulnerability still detected in the fresh scan of ${opts.owner}/${opts.repo}@${source.branch} (${source.fileCount} files). The fix has not taken effect on this branch yet.`
        : `After Fix: 🟢 Vulnerability no longer reproduced. Fresh scan of ${opts.owner}/${opts.repo}@${source.branch} (${source.fileCount} files, re-scanned after ${opts.fixedAt.toISOString()}) found no instance of ${opts.target.ruleId}.`,
    };
  } catch (err) {
    return {
      status: "failed",
      beforeState: "unknown",
      rescanFileCount: 0,
      stillDetected: false,
      remainingFindings: [],
      summary: "Verification could not re-scan the repository.",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
