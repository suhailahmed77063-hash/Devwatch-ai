/**
 * Security Agent — Remediation Agent.
 *
 * Generates a proposed patch for a confirmed/likely finding using the shared
 * AI `structured()` helper. Output is a unified diff + explanation. The patch
 * is NEVER applied automatically — the developer reviews it, runs tests, and
 * merges through their normal GitHub workflow.
 */

import { z } from "zod";
import { getAgentLLM } from "../ai/config";
import { structured } from "../ai/structured";
import { logger } from "../logger";
import { unifiedDiff, redactSecrets } from "./utils";

export const remediationSchema = z.object({
  problem: z.string().max(600),
  rootCause: z.string().max(600),
  fixStrategy: z.string().max(800),
  files: z
    .array(
      z.object({
        path: z.string().max(400),
        oldContent: z.string().max(60_000),
        newContent: z.string().max(60_000),
      })
    )
    .min(1)
    .max(4),
  verificationPlan: z.string().max(1200),
  explanation: z.string().max(2000),
});

export type Remediation = z.infer<typeof remediationSchema>;

function buildRemediationPrompt(finding: {
  ruleId: string;
  title: string;
  severity: string;
  cwe?: string | null;
  cve?: string | null;
  filePath?: string | null;
  lineStart?: number | null;
  rootCause?: string | null;
  impact?: string | null;
  aiAnalysis?: string | null;
  components?: unknown;
}, files: Record<string, string>): string {
  const relevantFiles = finding.filePath ? [finding.filePath] : [];
  for (const p of Object.keys(files)) {
    if (relevantFiles.length >= 3) break;
    // include nearby config when patching deps
    if (finding.ruleId.startsWith("dep.") && (p === "package.json" || p === "requirements.txt")) {
      relevantFiles.push(p);
    }
  }
  const fileBlock = relevantFiles
    .filter((p) => files[p])
    .map((p) => `--- FILE: ${p} ---\n${files[p].slice(0, 12_000)}`)
    .join("\n\n");

  return `You are a senior application security engineer writing a minimal, safe fix for a verified finding. Produce a concrete code change.

## Finding
Rule: ${finding.ruleId}
Title: ${finding.title}
Severity: ${finding.severity}${finding.cwe ? ` · ${finding.cwe}` : ""}${finding.cve ? ` · ${finding.cve}` : ""}
Location: ${finding.filePath ?? "?"}${finding.lineStart ? `:${finding.lineStart}` : ""}
Root cause: ${finding.rootCause ?? "n/a"}
Impact: ${finding.impact ?? "n/a"}
${finding.aiAnalysis ? `AI investigation notes: ${finding.aiAnalysis.slice(0, 1200)}` : ""}
${finding.components ? `Affected dependencies: ${JSON.stringify(finding.components)}` : ""}

## Current source (redacted)
${fileBlock || "(file content unavailable — describe the fix precisely anyway)"}

## Requirements
- Change ONLY what is necessary to remediate the issue; preserve behavior otherwise.
- For dependency findings: raise the package to the fixed version in the manifest.
- For code findings: apply input validation/parameterization/sanitization as appropriate; never weaken functionality silently.
- Return the COMPLETE new content for each changed file (oldContent = exactly what is in the source block above).

Return JSON with: problem, rootCause, fixStrategy, files[{path, oldContent, newContent}], verificationPlan, explanation.`;
}

export interface RemediationInput {
  finding: {
    ruleId: string;
    title: string;
    severity: string;
    cwe?: string | null;
    cve?: string | null;
    filePath?: string | null;
    lineStart?: number | null;
    rootCause?: string | null;
    impact?: string | null;
    aiAnalysis?: string | null;
    components?: unknown;
  };
  files: Record<string, string>;
  projectId: string;
}

export interface RemediationResult {
  summary: string;
  rootCause: string;
  strategy: string;
  diff: string;
  verificationPlan: string;
  explanation: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

/** Generate a proposed patch for the finding. */
export async function generateRemediation(input: RemediationInput): Promise<RemediationResult> {
  const prompt = buildRemediationPrompt(input.finding, input.files);

  const res = await structured(() => getAgentLLM(), {
    label: "security remediation",
    schema: remediationSchema,
    request: {
      system:
        "You are an expert application security engineer. You write minimal, correct, production-quality fixes and return only valid JSON.",
      user: prompt,
      maxTokens: 8192,
      temperature: 0.2,
    },
  });

  const r = res.data;
  const diffs: string[] = [];
  for (const f of r.files) {
    const oldC = input.files[f.path] ?? f.oldContent;
    const d = unifiedDiff(oldC, f.newContent, f.path);
    if (d) diffs.push(d);
  }

  logger.info("security.remediation.generated", {
    projectId: input.projectId,
    finding: input.finding.ruleId,
    files: r.files.length,
    tokens: res.tokensIn + res.tokensOut,
  });

  return {
    summary: r.problem.slice(0, 500),
    rootCause: r.rootCause.slice(0, 500),
    strategy: r.fixStrategy.slice(0, 600),
    diff: diffs.join("\n\n"),
    verificationPlan: r.verificationPlan,
    explanation: redactSecrets(r.explanation),
    model: res.model,
    tokensIn: res.tokensIn,
    tokensOut: res.tokensOut,
  };
}
