/**
 * Security Agent — secret scanner. Detects committed credentials with
 * line-level evidence. This is the "Secret Scanner" module of the Scanner
 * branch in the agent architecture.
 */

import type { RawFinding, Severity } from "../types";

interface SecretPattern {
  label: string;
  re: RegExp;
  cwe: string;
}

const PATTERNS: SecretPattern[] = [
  { label: "AWS access key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, cwe: "CWE-798" },
  { label: "OpenAI-style API key", re: /\bsk-[A-Za-z0-9_-]{20,}\b/, cwe: "CWE-798" },
  { label: "Stripe secret key", re: /\bsk_live_[A-Za-z0-9]{16,}\b/, cwe: "CWE-798" },
  { label: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/, cwe: "CWE-798" },
  { label: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, cwe: "CWE-798" },
  { label: "npm token", re: /\bnpm_[A-Za-z0-9]{30,}\b/, cwe: "CWE-798" },
  { label: "GitLab personal access token", re: /\bglpat-[A-Za-z0-9_-]{15,}\b/, cwe: "CWE-798" },
  { label: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, cwe: "CWE-321" },
  {
    label: "High-entropy assignment (suspected secret)",
    re: /\b(?:password|passwd|secret|api_?key|access_?key|auth_?token)\b\s*[:=]\s*["'][A-Za-z0-9+/_-]{20,}["']/i,
    cwe: "CWE-798",
  },
];

const ALLOWLIST = /\.(?:example|sample|template)$/; // .env.example etc.
const TEST_PATH = /\.(?:test|spec)\.[a-z]+$|(^|\/)tests?\//i;

/** Scan the file map for committed credentials. */
export function runSecretScanner(files: Record<string, string>): RawFinding[] {
  const findings: RawFinding[] = [];

  for (const [path, content] of Object.entries(files)) {
    if (ALLOWLIST.test(path) || TEST_PATH.test(path)) continue;
    const lines = content.replace(/\r\n/g, "\n").split("\n");

    for (const pattern of PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (!pattern.re.test(lines[i])) continue;
        findings.push({
          ruleId: "secret.committed-credential",
          title: `Committed credential: ${pattern.label}`,
          category: "secret",
          severity: "critical" as Severity,
          confidence: pattern.label.includes("entropy") ? 55 : 90,
          cwe: pattern.cwe,
          filePath: path,
          lineStart: i + 1,
          lineEnd: i + 1,
          snippet: lines[i].trim().slice(0, 300),
          rootCause: `${pattern.label} committed in ${path}:${i + 1}`,
          evidence: [
            {
              file: path,
              line: i + 1,
              excerpt: lines.slice(Math.max(0, i - 1), i + 2).join("\n").slice(0, 600),
            },
          ],
          impact:
            "Anyone with repository access (or anyone, if the repo is public) can reuse this credential. Rotate immediately.",
          // recommendation intentionally left to the remediation agent
          attackPath: [
            { label: "Credential committed", detail: "Secret value stored in version control", file: path, line: i + 1 },
            { label: "Repository access", detail: "Cloned by developers, CI, or scraped from a public repo" },
            { label: "Credential replay", detail: "Attacker authenticates as the service" },
            { label: "Impact", detail: "Full access to the upstream system the key protects" },
          ],
        });
        break; // one finding per pattern per file
      }
    }
  }

  return findings;
}
