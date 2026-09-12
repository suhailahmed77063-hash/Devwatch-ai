/**
 * Security Agent — SAST scanner (static application security testing).
 *
 * Line-aware rules for injection, XSS, SSRF, path traversal, insecure
 * deserialization, broken access control, weak crypto and misconfiguration.
 * Produces RawFindings with evidence excerpts + preliminary attack paths.
 */

import type { RawFinding, FindingEvidence, AttackPathStep, Severity } from "../types";

interface SastMatch {
  line: number; // 1-based
  excerpt: string;
}

interface SastRule {
  id: string;
  title: string;
  severity: Severity;
  confidence: number;
  cwe?: string;
  /** Returns a short reason when the file violates this rule. */
  test: (path: string, content: string) => { reason: string } | null;
  /** Build the preliminary attack path steps shown on the finding page. */
  attackPath?: (path: string) => AttackPathStep[];
}

const EXCERPT_RADIUS = 2;

function findMatches(content: string, re: RegExp, need: (m: string) => boolean = () => true): SastMatch[] {
  const out: SastMatch[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length && out.length < 5; i++) {
    const line = lines[i];
    const m = line.match(re);
    if (m && need(m[0])) {
      out.push({ line: i + 1, excerpt: line.trim().slice(0, 200) });
    }
  }
  return out;
}

function evidenceFrom(path: string, matches: SastMatch[], content: string): FindingEvidence[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  return matches.slice(0, 3).map((m) => ({
    file: path,
    line: m.line,
    excerpt: lines.slice(Math.max(0, m.line - 1 - EXCERPT_RADIUS), m.line + EXCERPT_RADIUS).join("\n").slice(0, 600),
  }));
}

export const SAST_RULES: SastRule[] = [
  {
    id: "sast.sql-injection",
    title: "Possible SQL injection via string-concatenated query",
    severity: "critical",
    confidence: 65,
    cwe: "CWE-89",
    test: (_path, content) => {
      const re =
        /(?:SELECT|INSERT|UPDATE|DELETE)[^\n]{0,80}(?:['"`]\s*\+|\+\s*['"`]|`[^`]*\$\{|%s['"]?\s*%|\bformat\s*\()/i;
      const m = findMatches(content, re);
      return m.length ? { reason: `${m.length} query line(s) built with string concatenation` } : null;
    },
    attackPath: (p) => [
      { label: "User input", detail: "External request parameter reaches a query builder", file: p },
      { label: "Query construction", detail: "SQL string is concatenated instead of parameterized", file: p },
      { label: "Database execution", detail: "Attacker-controlled SQL executes against the database" },
      { label: "Impact", detail: "Data exfiltration, modification or destruction" },
    ],
  },
  {
    id: "sast.command-injection",
    title: "Command execution with dynamic input",
    severity: "critical",
    confidence: 60,
    cwe: "CWE-78",
    test: (_path, content) => {
      const re = /\b(?:exec(?:Sync)?|spawn(?:Sync)?)\s*\(/;
      const m = findMatches(content, re, (s) => !/execFile|child_process import/.test(s));
      return m.length ? { reason: "exec/spawn call site found — verify argument provenance" } : null;
    },
  },
  {
    id: "sast.xss-unsafe-html",
    title: "DOM XSS sink — innerHTML without sanitization",
    severity: "high",
    confidence: 70,
    cwe: "CWE-79",
    test: (_path, content) => {
      const re = /\.innerHTML\s*=|\.outerHTML\s*=|document\.write\s*\(/;
      const m = findMatches(content, re);
      const hasSanitize = /escapeHtml|sanitize|DOMPurify|textContent/.test(content);
      return m.length && !hasSanitize ? { reason: "HTML sink set without an escape/sanitize call nearby" } : null;
    },
    attackPath: (p) => [
      { label: "User input", detail: "Untrusted string (URL param, storage, postMessage)" },
      { label: "DOM sink", detail: "Assigned to innerHTML / document.write", file: p },
      { label: "Script execution", detail: "Injected markup executes in the victim's browser" },
      { label: "Impact", detail: "Session theft, credential capture, defacement" },
    ],
  },
  {
    id: "sast.unsafe-deserialization",
    title: "Unsafe deserialization of untrusted data",
    severity: "high",
    confidence: 55,
    cwe: "CWE-502",
    test: (_path, content) => {
      const re = /\b(?:unserialize|pickle\.loads|yaml\.load\s*\((?![^)]*Loader)|eval\s*\(\s*(?:Buffer|atob|req|request|input))\b/;
      const m = findMatches(content, re);
      return m.length ? { reason: "Deserialization/eval of externally influenced data" } : null;
    },
  },
  {
    id: "sast.path-traversal",
    title: "Path traversal — file access built from user input",
    severity: "high",
    confidence: 60,
    cwe: "CWE-22",
    test: (_path, content) => {
      const re = /\b(?:readFile|createReadStream|writeFile|unlink|join)\s*\([^)]*(?:req\.(?:query|params|body)|params\.|query\.)/;
      const m = findMatches(content, re);
      return m.length ? { reason: "Filesystem API receives request-derived path segments" } : null;
    },
  },
  {
    id: "sast.ssrf",
    title: "Potential SSRF — server-side fetch of user-supplied URL",
    severity: "high",
    confidence: 55,
    cwe: "CWE-918",
    test: (_path, content) => {
      const re = /\b(?:fetch|axios(?:\.\w+)?|got|request|urlopen)\s*\(\s*(?:[^,)]*(?:req\.|params\.|query\.|body\.|userInput|targetUrl|webhookUrl))/;
      const m = findMatches(content, re);
      return m.length ? { reason: "Outbound HTTP call receives a request-controlled URL" } : null;
    },
  },
  {
    id: "sast.weak-crypto",
    title: "Weak or broken cryptographic primitive",
    severity: "high",
    confidence: 80,
    cwe: "CWE-327",
    test: (_path, content) => {
      const re = /(?:createHash\s*\(\s*['"](?:md5|sha1)['"]|createCipheriv\s*\(\s*['"]des|Math\.random\s*\(\s*\)[^;\n]*(?:token|secret|password|otp))/;
      const m = findMatches(content, re);
      return m.length ? { reason: "MD5/SHA-1 for security purposes, DES cipher, or Math.random for secrets" } : null;
    },
  },
  {
    id: "sast.hardcoded-secret",
    title: "Hardcoded credential in source",
    severity: "critical",
    confidence: 85,
    cwe: "CWE-798",
    test: (_path, content) => {
      const re = /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b|\bsk-[A-Za-z0-9_-]{20,}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}\b|\bsk_live_[A-Za-z0-9]{16,}\b/;
      const m = findMatches(content, re);
      return m.length ? { reason: "Credential literal matched a known token format" } : null;
    },
  },
  {
    id: "sast.missing-authz",
    title: "API handler without an authentication/authorization guard",
    severity: "high",
    confidence: 50,
    cwe: "CWE-306",
    test: (path, content) => {
      if (!/api\//.test(path)) return null;
      if (!/export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)/.test(content)) return null;
      if (/requireUser|requireAuth|getServerSession|auth\(\)|session|verifyToken|withAuth|assertAccess/.test(content)) return null;
      return { reason: "Handler exports an HTTP method but contains no auth check" };
    },
    attackPath: (p) => [
      { label: "Unauthenticated request", detail: "Attacker calls the endpoint without credentials" },
      { label: "Missing guard", detail: "No auth check before handling", file: p },
      { label: "Business logic executes", detail: "Handler performs its operation as if authorized" },
      { label: "Impact", detail: "Data exposure or state modification by anonymous users" },
    ],
  },
  {
    id: "sast.open-cors",
    title: "Permissive CORS configuration",
    severity: "medium",
    confidence: 60,
    cwe: "CWE-942",
    test: (_path, content) => {
      const re = /(?:Access-Control-Allow-Origin['"]?\s*[,:]\s*['"]\*|cors\(\s*\{?\s*origin\s*:\s*['"]\*['"])/;
      const m = findMatches(content, re);
      return m.length ? { reason: "Access-Control-Allow-Origin: * on credentialed-capable API" } : null;
    },
  },
  {
    id: "sast.insecure-cookie",
    title: "Cookie set without security flags",
    severity: "medium",
    confidence: 65,
    cwe: "CWE-614",
    test: (_path, content) => {
      const re = /(?:setCookie|Set-Cookie|cookies\.set)\s*\((?![^)]*(?:httpOnly|secure|sameSite))/i;
      const m = findMatches(content, re);
      return m.length ? { reason: "Set-cookie call without httpOnly/secure/sameSite" } : null;
    },
  },
  {
    id: "sast.debug-endpoint",
    title: "Debug or inspection endpoint reachable in production code",
    severity: "medium",
    confidence: 55,
    cwe: "CWE-489",
    test: (path, content) => {
      const re = /\b(?:app\.(?:get|use)\s*\(\s*['"]\/(?:debug|internal|_debug)|debugger\b|inspect(?:ionUrl)?\s*:)/;
      const m = findMatches(content, re);
      return m.length && !/\.test\.|spec\./.test(path) ? { reason: "Debug surface committed in non-test code" } : null;
    },
  },
];

export interface SastOptions {
  /** Extra file names to force-scan even when extension is unusual (Dockerfiles, nginx conf…). */
  includePaths?: RegExp;
}

/** Run all SAST rules over the file map. Returns raw findings (pre-AI). */
export function runSast(files: Record<string, string>, opts: SastOptions = {}): RawFinding[] {
  const findings: RawFinding[] = [];

  for (const [path, content] of Object.entries(files)) {
    const isSource =
      /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go|java|php|cs|sql)$/.test(path) ||
      /\.(env|ya?ml|json|toml|ini|conf|cfg)$/i.test(path) ||
      /dockerfile|nginx|\.sh$/i.test(path) ||
      opts.includePaths?.test(path);
    if (!isSource) continue;

    for (const rule of SAST_RULES) {
      const verdict = rule.test(path, content);
      if (!verdict) continue;
      const lines = content.replace(/\r\n/g, "\n").split("\n");
      const reMatch = firstMatchLine(content, rule);
      const lineStart = reMatch ?? undefined;
      findings.push({
        ruleId: rule.id,
        title: rule.title,
        category: "sast",
        severity: rule.severity,
        confidence: rule.confidence,
        cwe: rule.cwe,
        filePath: path,
        lineStart,
        lineEnd: lineStart ? lineStart + 1 : undefined,
        snippet: lineStart ? lines[lineStart - 1]?.trim().slice(0, 300) : undefined,
        rootCause: verdict.reason,
        evidence: evidenceForRule(path, content, rule),
        impact: defaultImpact(rule.severity),
        // recommendation is filled by the remediation agent; scanners stay factual
        attackPath: rule.attackPath?.(path),
      });
    }
  }

  return findings;
}

function firstMatchLine(content: string, rule: SastRule): number | null {
  // Re-run the rule's own matcher line-by-line for a precise primary location.
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const slice = lines.slice(i, i + 3).join("\n");
    if (rule.test("_", slice)) return i + 1;
  }
  return null;
}

function evidenceForRule(path: string, content: string, rule: SastRule): FindingEvidence[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const hits: FindingEvidence[] = [];
  for (let i = 0; i < lines.length && hits.length < 3; i++) {
    const slice = lines.slice(i, i + 3).join("\n");
    if (rule.test("_", slice)) {
      hits.push({
        file: path,
        line: i + 1,
        excerpt: lines.slice(i, Math.min(lines.length, i + 3)).join("\n").slice(0, 600),
      });
    }
  }
  return hits;
}

function defaultImpact(severity: Severity): string {
  switch (severity) {
    case "critical": return "Potential full compromise of confidentiality, integrity or availability.";
    case "high": return "Significant data exposure or privilege escalation potential.";
    case "medium": return "Limited impact, useful as part of a chained attack.";
    default: return "Minor information disclosure or hardening gap.";
  }
}
