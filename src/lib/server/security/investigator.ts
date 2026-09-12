/**
 * Security Agent — Investigator.
 *
 * Investigator branch: Repository Context → Code Path Analysis → Dependency
 * Context → Exploitability Analysis → Verdict. Uses the shared AI
 * `structured()` helper with Zod-validated output. The LLM receives only
 * redacted excerpts, never secrets or full file dumps.
 */

import { z } from "zod";
import { getAgentLLM } from "../ai/config";
import { structured } from "../ai/structured";
import { logger } from "../logger";
import type { RawFinding, AttackPathStep, FindingEvidence } from "./types";
import { redactSecrets } from "./utils";

// ── Zod schemas for AI output ───────────────────────────────────────────────

export const investigationSchema = z.object({
  reachability: z.enum(["REACHABLE", "CONDITIONAL", "UNREACHABLE", "UNKNOWN"]),
  verdict: z.enum(["CONFIRMED", "LIKELY", "POTENTIAL", "FALSE_POSITIVE"]),
  confidence: z.number().min(0).max(100),
  rootCause: z.string().max(600),
  triggerPath: z.string().max(600),
  affectedComponents: z.array(z.string().max(120)).max(12),
  existingControls: z.array(z.string().max(200)).max(8),
  evidence: z
    .array(z.object({ file: z.string().max(400), line: z.number().int().optional(), excerpt: z.string().max(600) }))
    .max(6),
  attackPath: z
    .array(z.object({ label: z.string().max(120), detail: z.string().max(300), file: z.string().max(400).optional(), line: z.number().int().optional() }))
    .min(2)
    .max(8),
  impact: z.string().max(600),
  analysis: z.string().max(2000),
  exploitabilityNotes: z.string().max(600),
});

export type Investigation = z.infer<typeof investigationSchema>;

// ── Context collection (Investigator sub-module: Repository Context) ────────

const MAX_CONTEXT_FILES = 8;
const MAX_CONTEXT_CHARS = 40_000;

/**
 * Collect related code for the finding: the vulnerable file, imports of that
 * file, files importing it, route handlers in the same directory, and config
 * files. Deterministic heuristics — no LLM needed for collection itself.
 */
export function collectContext(files: Record<string, string>, finding: RawFinding): { path: string; content: string }[] {
  const paths = Object.keys(files);
  if (!finding.filePath) return paths.slice(0, 3).map((p) => ({ path: p, content: files[p] }));

  const target = finding.filePath;
  const dir = target.split("/").slice(0, -1).join("/");
  const base = target.split("/").pop() ?? target;
  const stem = base.replace(/\.[^.]+$/, "");

  const related: string[] = [];
  const push = (p: string) => {
    if (p !== target && !related.includes(p) && related.length < MAX_CONTEXT_FILES - 1) related.push(p);
  };

  for (const p of paths) {
    if (p === target) continue;
    // Files in the same directory
    if (p.startsWith(dir ? `${dir}/` : "") && p !== target) push(p);
  }
  // Files that import the vulnerable module
  for (const p of paths) {
    const content = files[p];
    if (content.length > 60_000) continue;
    if (new RegExp(`from ["'][^"']*/?${stem}["']|require\\(["'][^"']*/?${stem}["']\\)`).test(content)) push(p);
  }
  // Always include config files when they exist
  for (const cfg of ["package.json", "next.config.ts", "vite.config.ts", ".env.example"]) {
    if (files[cfg]) push(cfg);
  }

  const chosen = [target, ...related].slice(0, MAX_CONTEXT_FILES);
  let budget = MAX_CONTEXT_CHARS;
  const out: { path: string; content: string }[] = [];
  for (const p of chosen) {
    const content = files[p] ?? "";
    if (!content) continue;
    const slice = content.slice(0, budget);
    budget -= slice.length;
    out.push({ path: p, content: slice });
    if (budget <= 0) break;
  }
  return out;
}

// ── AI investigation ────────────────────────────────────────────────────────

function buildInvestigationPrompt(finding: RawFinding, context: { path: string; content: string }[]): string {
  const contextBlock = context
    .map((c) => `--- FILE: ${c.path} ---\n${c.content.slice(0, 6000)}`)
    .join("\n\n")
    .slice(0, MAX_CONTEXT_CHARS);

  return `You are a senior application security engineer performing an authorized investigation of a finding produced by static analysis. Determine whether the issue is genuinely reachable and how severe it really is.

## Finding (from static scanner)
Rule: ${finding.ruleId}
Title: ${finding.title}
Category: ${finding.category}
Severity (static): ${finding.severity}
CWE: ${finding.cwe ?? "unknown"}
File: ${finding.filePath ?? "unknown"}${finding.lineStart ? `:${finding.lineStart}` : ""}
Scanner evidence: ${finding.rootCause ?? "n/a"}
${finding.components ? `Components: ${JSON.stringify(finding.components)}` : ""}

## Related source (redacted excerpts)
${contextBlock || "(no additional context)"}

## Your task
Answer strictly in JSON:
- reachability: can attacker-controlled input actually reach the vulnerable sink through this codebase?
- verdict: CONFIRMED (proof in code), LIKELY (strong indicators, minor gaps), POTENTIAL (plausible but unproven), FALSE_POSITIVE (scanner error / controls neutralize it).
- Be conservative: do NOT claim exploitability without code evidence. FALSE_POSITIVE is a valid, valuable answer.
- evidence: quote real lines from the files above (with file + line). Never invent code.
- attackPath: 2-8 steps from user input to impact, each with file/line when known. Use "n/a" steps only if genuinely unknown.`;
}

export interface InvestigateInput {
  finding: RawFinding;
  files: Record<string, string>;
  /** Redacted project context for audit. */
  projectId: string;
  actorId?: string;
}

/** Investigate one raw finding with the AI investigator. */
export async function investigateFinding(input: InvestigateInput): Promise<Investigation> {
  const context = collectContext(input.files, input.finding);
  const prompt = buildInvestigationPrompt(input.finding, context);

  const res = await structured(() => getAgentLLM(), {
    label: "security investigation",
    schema: investigationSchema,
    request: {
      system:
        "You are an application security expert. You reason carefully about reachability and never fabricate evidence. Return only valid JSON matching the requested shape.",
      user: prompt,
      maxTokens: 4096,
      temperature: 0.2,
    },
  });

  // Redact any accidental secret material the model echoed back.
  const inv = {
    ...res.data,
    evidence: res.data.evidence.map((e) => ({ ...e, excerpt: redactSecrets(e.excerpt) })),
    analysis: redactSecrets(res.data.analysis),
    exploitabilityNotes: redactSecrets(res.data.exploitabilityNotes),
  };

  logger.info("security.investigation.completed", {
    projectId: input.projectId,
    finding: input.finding.ruleId,
    verdict: inv.verdict,
    tokens: res.tokensIn + res.tokensOut,
  });

  return inv;
}

/**
 * Merge an AI investigation into a raw finding → the persisted shape.
 * Verdict drives the status transition:
 *   CONFIRMED/LIKELY → VALIDATION_REQUIRED
 *   POTENTIAL → VALIDATION_REQUIRED (with lower confidence)
 *   FALSE_POSITIVE → FALSE_POSITIVE (terminal unless re-investigated)
 */
export function applyInvestigation(raw: RawFinding, inv: Investigation): {
  rootCause: string;
  evidence: FindingEvidence[];
  attackPath: AttackPathStep[];
  impact: string;
  aiAnalysis: string;
  verdict: Investigation["verdict"];
  confidence: number;
  status: "VALIDATION_REQUIRED" | "FALSE_POSITIVE";
} {
  return {
    rootCause: inv.rootCause || raw.rootCause || "Root cause not determined",
    evidence: inv.evidence.length ? inv.evidence : raw.evidence ?? [],
    attackPath: inv.attackPath.length ? inv.attackPath : raw.attackPath ?? [],
    impact: inv.impact || raw.impact || "",
    aiAnalysis: [
      inv.analysis,
      `Reachability: ${inv.reachability}. Trigger: ${inv.triggerPath}`,
      inv.existingControls.length ? `Existing controls: ${inv.existingControls.join("; ")}` : "",
      inv.exploitabilityNotes,
    ]
      .filter(Boolean)
      .join("\n\n"),
    verdict: inv.verdict,
    confidence: Math.round((raw.confidence + inv.confidence) / 2),
    status: inv.verdict === "FALSE_POSITIVE" ? "FALSE_POSITIVE" : "VALIDATION_REQUIRED",
  };
}

/** Count of findings worth investigating (skip obvious FPs early). */
export function shouldInvestigate(raw: RawFinding): boolean {
  return raw.confidence >= 40;
}
