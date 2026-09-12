/**
 * AI Security Agent — Investigator.
 *
 * Takes a raw scanner finding plus repository context and produces a strict,
 * evidence-backed investigation: why it's vulnerable, what triggers it,
 * whether the vulnerable code path is actually reachable, what controls
 * already exist, and a preliminary attack path. Every output is validated
 * and clamped — the LLM cannot invent severities or force a verdict.
 */

import type { Investigation, RawFinding, FindingEvidence, AttackPathStep, Verdict } from "./types";
import { chatJson, aiConfigured } from "./llm";
import { redactSecrets } from "./utils";

const VALID_VERDICTS: Verdict[] = ["confirmed", "likely", "potential", "false_positive"];
const VALID_REACH: Investigation["reachability"][] = ["REACHABLE", "CONDITIONAL", "UNREACHABLE", "UNKNOWN"];

const SYSTEM = `You are the investigation stage of an application-security agent.
You receive one raw scanner finding plus repository context and must analyze it like a senior security engineer.

Rules:
- Base every claim ONLY on the provided code and context. Never invent files, functions, or CVEs.
- verdict meanings: confirmed = exploit path fully evident in code; likely = strong evidence, some conditions unverified; potential = pattern present but reachability unclear; false_positive = controls or context invalidate the finding.
- Never mark confirmed without a concrete trigger path in the provided code.
- "evidence" must quote real lines from the provided snippets/files.
- Redact any secret-looking strings in your output.
- Respond with JSON only, exactly this shape:
{
  "reachability": "REACHABLE" | "CONDITIONAL" | "UNREACHABLE" | "UNKNOWN",
  "verdict": "confirmed" | "likely" | "potential" | "false_positive",
  "confidence": 0-100,
  "rootCause": string,
  "triggerPath": string,
  "affectedComponents": string[],
  "existingControls": string[],
  "evidence": [{ "file": string, "line": number|null, "excerpt": string }],
  "attackPath": [{ "label": string, "detail": string, "file": string|null, "line": number|null }],
  "impact": string,
  "analysis": string,
  "exploitabilityNotes": string
}`;

function relatedFiles(files: Record<string, string>, focus: string): Array<{ path: string; snippet: string }> {
  const base = focus.split("/").pop() ?? focus;
  const moduleName = base.replace(/\.[^.]+$/, "");
  const picks: Array<{ path: string; snippet: string }> = [];
  const focusLines = files[focus]?.replace(/\r\n/g, "\n") ?? "";
  if (focusLines) picks.push({ path: focus, snippet: focusLines.slice(0, 4000) });

  for (const [path, content] of Object.entries(files)) {
    if (path === focus || picks.length >= 6) continue;
    if (typeof content !== "string" || !content) continue;
    const lower = content.toLowerCase();
    if (lower.includes(moduleName.toLowerCase())) {
      picks.push({ path, snippet: content.slice(0, 2500) });
    }
  }
  return picks.slice(0, 6);
}

/** Clamp/validate the model output; anything invalid falls back to safe values. */
function sanitize(raw: Partial<Investigation>, fallbackVerdict: Verdict): Investigation {
  const evidence: FindingEvidence[] = Array.isArray(raw.evidence)
    ? raw.evidence
        .filter((e) => e && typeof e.excerpt === "string")
        .slice(0, 6)
        .map((e) => ({
          file: typeof e.file === "string" ? e.file : "",
          line: typeof e.line === "number" ? e.line : undefined,
          excerpt: redactSecrets(String(e.excerpt).slice(0, 600)),
        }))
    : [];

  const attackPath: AttackPathStep[] = Array.isArray(raw.attackPath)
    ? raw.attackPath
        .filter((s) => s && typeof s.label === "string")
        .slice(0, 8)
        .map((s) => ({
          label: String(s.label).slice(0, 120),
          detail: typeof s.detail === "string" ? s.detail.slice(0, 400) : "",
          file: typeof s.file === "string" && s.file ? s.file : undefined,
          line: typeof s.line === "number" ? s.line : undefined,
        }))
    : [];

  return {
    reachability: VALID_REACH.includes(raw.reachability as Investigation["reachability"])
      ? (raw.reachability as Investigation["reachability"])
      : "UNKNOWN",
    verdict: VALID_VERDICTS.includes(raw.verdict as Verdict) ? (raw.verdict as Verdict) : fallbackVerdict,
    confidence: Math.max(0, Math.min(100, Math.round(Number(raw.confidence) || 0))),
    rootCause: redactSecrets(String(raw.rootCause ?? "").slice(0, 1200)),
    triggerPath: redactSecrets(String(raw.triggerPath ?? "").slice(0, 800)),
    affectedComponents: Array.isArray(raw.affectedComponents)
      ? raw.affectedComponents.slice(0, 10).map(String)
      : [],
    existingControls: Array.isArray(raw.existingControls)
      ? raw.existingControls.slice(0, 10).map(String)
      : [],
    evidence,
    attackPath,
    impact: redactSecrets(String(raw.impact ?? "").slice(0, 800)),
    analysis: redactSecrets(String(raw.analysis ?? "").slice(0, 4000)),
    exploitabilityNotes: redactSecrets(String(raw.exploitabilityNotes ?? "").slice(0, 1200)),
  };
}

/** Deterministic fallback used when no AI provider is configured/unavailable. */
export function fallbackInvestigation(finding: RawFinding): Investigation {
  const sevRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const confidence = finding.confidence ?? 50;
  // High-signal scanner rules with high confidence upgrade to "likely".
  const verdict: Verdict =
    finding.category === "dependency" || finding.category === "secret"
      ? "likely"
      : confidence >= 80 && sevRank[finding.severity] >= 3
        ? "likely"
        : "potential";

  return {
    reachability: "UNKNOWN",
    verdict,
    confidence,
    rootCause: finding.rootCause ?? finding.title,
    triggerPath: finding.attackPath?.map((s) => s.label).join(" → ") ?? "Static pattern match — trigger path not established.",
    affectedComponents: finding.components?.map((c) => `${c.name}@${c.version ?? "?"}`) ?? (finding.filePath ? [finding.filePath] : []),
    existingControls: [],
    evidence: finding.evidence ?? [],
    attackPath:
      finding.attackPath ??
      (finding.filePath
        ? [{ label: "Suspected location", detail: finding.rootCause ?? finding.title, file: finding.filePath, line: finding.lineStart }]
        : []),
    impact: finding.impact ?? "Impact not yet assessed.",
    analysis:
      `Deterministic analysis (AI provider unavailable): scanner rule ${finding.ruleId} matched with ${confidence}% confidence. ` +
      (finding.cwe ? `Associated weakness ${finding.cwe}. ` : "") +
      "No code-path reasoning beyond the static match was performed.",
    exploitabilityNotes:
      finding.category === "dependency"
        ? `Version is inside the affected range${finding.components?.[0]?.fixedVersion ? `; fixed in ${finding.components[0].fixedVersion}` : ""}.`
        : "Exploitability unverified without dynamic validation.",
  };
}

/** Investigate one finding: AI analysis when available, deterministic fallback otherwise. */
export async function investigateFinding(opts: {
  finding: RawFinding;
  files: Record<string, string>;
  repoLabel: string;
}): Promise<Investigation> {
  if (!aiConfigured()) return fallbackInvestigation(opts.finding);

  const context = relatedFiles(opts.files, opts.finding.filePath ?? "");
  const user = [
    `Repository: ${opts.repoLabel}`,
    `Finding: ${opts.finding.ruleId} — ${opts.finding.title}`,
    opts.finding.cwe ? `CWE: ${opts.finding.cwe}` : "",
    opts.finding.cve ? `CVE: ${opts.finding.cve}` : "",
    `Severity (scanner): ${opts.finding.severity} (confidence ${opts.finding.confidence}%)`,
    opts.finding.filePath ? `Location: ${opts.finding.filePath}:${opts.finding.lineStart ?? "?"}` : "",
    "",
    "Relevant code:",
    ...context.map(
      (f) => `--- FILE ${f.path} ---\n${redactSecrets(f.snippet)}`
    ),
    "",
    opts.finding.snippet ? `Matched line: ${opts.finding.snippet}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await chatJson<Partial<Investigation>>({ system: SYSTEM, user, maxTokens: 1800 });
    return sanitize(raw, fallbackInvestigation(opts.finding).verdict);
  } catch {
    // AI unavailable → deterministic result, never block the pipeline.
    return fallbackInvestigation(opts.finding);
  }
}
