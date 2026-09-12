/**
 * AI Security Agent — scanners (SAST, secrets, dependencies, configuration).
 * Each scanner is independently callable and produces RawFinding objects.
 */

import type { RawFinding, FindingEvidence, Severity, DependencyRef } from "./types";
import { inRange } from "./utils";

// ═════════════════════════════════════════════════════════════════════════
// SAST
// ═════════════════════════════════════════════════════════════════════════

interface SastRule {
  id: string;
  title: string;
  severity: Severity;
  confidence: number;
  cwe?: string;
  re: RegExp;
  attackPath?: (file: string) => NonNullable<RawFinding["attackPath"]>;
}

const SAST_RULES: SastRule[] = [
  {
    id: "sast.sql-injection",
    title: "Possible SQL injection via string-concatenated query",
    severity: "critical",
    confidence: 65,
    cwe: "CWE-89",
    re: /(?:SELECT|INSERT|UPDATE|DELETE)[^\n]{0,80}(?:['"`]\s*\+|\+\s*['"`]|`[^`]*\$\{)/i,
    attackPath: (f) => [
      { label: "User input", detail: "External request parameter reaches a query builder", file: f },
      { label: "Query construction", detail: "SQL string is concatenated instead of parameterized", file: f },
      { label: "Database execution", detail: "Attacker-controlled SQL executes" },
      { label: "Impact", detail: "Data exfiltration, modification or destruction" },
    ],
  },
  {
    id: "sast.xss-unsafe-html",
    title: "DOM XSS sink — innerHTML without sanitization",
    severity: "high",
    confidence: 70,
    cwe: "CWE-79",
    re: /\.innerHTML\s*=|\.outerHTML\s*=|document\.write\s*\(/,
    attackPath: (f) => [
      { label: "User input", detail: "Untrusted string reaches the DOM" },
      { label: "DOM sink", detail: "Assigned to innerHTML / document.write", file: f },
      { label: "Script execution", detail: "Injected markup executes in victim's browser" },
      { label: "Impact", detail: "Session theft, credential capture" },
    ],
  },
  {
    id: "sast.command-injection",
    title: "Command execution with dynamic input",
    severity: "critical",
    confidence: 60,
    cwe: "CWE-78",
    re: /\b(?:exec|execSync|spawn|spawnSync)\s*\(/,
  },
  {
    id: "sast.path-traversal",
    title: "Path traversal — file access built from user input",
    severity: "high",
    confidence: 60,
    cwe: "CWE-22",
    re: /\b(?:readFile|createReadStream|writeFile|unlink)\s*\([^)]*(?:req\.(?:query|params|body)|params\.|query\.)/,
  },
  {
    id: "sast.ssrf",
    title: "Potential SSRF — server-side fetch of user-supplied URL",
    severity: "high",
    confidence: 55,
    cwe: "CWE-918",
    re: /\b(?:fetch|axios|got|request|urlopen)\s*\(\s*[^,)]*(?:req\.|params\.|query\.|body\.|targetUrl|webhookUrl)/,
  },
  {
    id: "sast.unsafe-deserialization",
    title: "Unsafe deserialization of untrusted data",
    severity: "high",
    confidence: 55,
    cwe: "CWE-502",
    re: /\b(?:unserialize|pickle\.loads|eval\s*\(\s*(?:Buffer|atob|req|request|input))\b/,
  },
  {
    id: "sast.weak-crypto",
    title: "Weak or broken cryptographic primitive",
    severity: "high",
    confidence: 80,
    cwe: "CWE-327",
    re: /(?:createHash\s*\(\s*['"](?:md5|sha1)['"]|createCipheriv\s*\(\s*['"]des|Math\.random\s*\(\s*\)[^;\n]*(?:token|secret|password|otp))/,
  },
  {
    id: "sast.hardcoded-secret",
    title: "Hardcoded credential in source",
    severity: "critical",
    confidence: 85,
    cwe: "CWE-798",
    re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b|\bsk-[A-Za-z0-9_-]{20,}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bsk_live_[A-Za-z0-9]{16,}\b/,
  },
  {
    id: "sast.missing-authz",
    title: "API handler without an authentication guard",
    severity: "high",
    confidence: 50,
    cwe: "CWE-306",
    re: /export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)/,
  },
  {
    id: "sast.open-cors",
    title: "Permissive CORS configuration",
    severity: "medium",
    confidence: 60,
    cwe: "CWE-942",
    re: /(?:Access-Control-Allow-Origin['"]?\s*[,:]\s*['"]\*|cors\(\s*\{?\s*origin\s*:\s*['"]\*['"])/,
  },
  {
    id: "sast.insecure-cookie",
    title: "Cookie set without security flags",
    severity: "medium",
    confidence: 65,
    cwe: "CWE-614",
    re: /(?:setCookie|Set-Cookie|cookies\.set)\s*\((?![^)]*(?:httpOnly|secure|sameSite))/i,
  },
];

// ═════════════════════════════════════════════════════════════════════════
// Secrets
// ═════════════════════════════════════════════════════════════════════════

const SECRET_PATTERNS: Array<{ label: string; re: RegExp; cwe: string }> = [
  { label: "AWS access key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, cwe: "CWE-798" },
  { label: "OpenAI-style API key", re: /\bsk-[A-Za-z0-9_-]{20,}\b/, cwe: "CWE-798" },
  { label: "Stripe secret key", re: /\bsk_live_[A-Za-z0-9]{16,}\b/, cwe: "CWE-798" },
  { label: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/, cwe: "CWE-798" },
  { label: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, cwe: "CWE-798" },
  { label: "npm token", re: /\bnpm_[A-Za-z0-9]{30,}\b/, cwe: "CWE-798" },
  { label: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, cwe: "CWE-321" },
];

// ═════════════════════════════════════════════════════════════════════════
// Configuration
// ═════════════════════════════════════════════════════════════════════════

const CONFIG_RULES: Array<{
  id: string;
  title: string;
  severity: Severity;
  confidence: number;
  cwe?: string;
  pathMatch?: RegExp;
  re: RegExp;
}> = [
  {
    id: "config.tls-verification-disabled",
    title: "TLS certificate verification disabled",
    severity: "high",
    confidence: 85,
    cwe: "CWE-295",
    re: /(?:rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0|verify\s*=\s*False|InsecureSkipVerify\s*:\s*true)/,
  },
  {
    id: "config.debug-enabled",
    title: "Debug mode enabled in deployable configuration",
    severity: "high",
    confidence: 70,
    cwe: "CWE-489",
    pathMatch: /\.(env|ya?ml|json|toml|ini|cfg|conf)$/i,
    re: /(?:^\s*DEBUG\s*=\s*(?:1|true|True|yes)|DEBUG\s*:\s*true|APP_DEBUG\s*=\s*(?:1|true|True))/m,
  },
  {
    id: "config.docker-root",
    title: "Container runs as root",
    severity: "medium",
    confidence: 65,
    cwe: "CWE-250",
    pathMatch: /dockerfile$/i,
    re: /^\s*USER\s+root\s*$/im,
  },
  {
    id: "config.verbose-errors",
    title: "Stack traces exposed to clients",
    severity: "medium",
    confidence: 60,
    cwe: "CWE-209",
    re: /(?:showStack\s*:\s*true|traceback\.print_exc\(\))/,
  },
];

// ═════════════════════════════════════════════════════════════════════════
// Dependency advisories (offline set; OSV used when reachable)
// ═════════════════════════════════════════════════════════════════════════

const KNOWN_ADVISORIES: Record<string, Array<{
  id: string;
  cve?: string;
  summary: string;
  severity: Severity;
  fixed?: string;
  range: string;
  cwe?: string;
}>> = {
  lodash: [{ id: "GHSA-p6mc-mrg8-x3x2", cve: "CVE-2020-8203", summary: "Prototype pollution in zipObjectDeep", severity: "high", fixed: "4.17.19", range: ">=4.0.0 <4.17.19", cwe: "CWE-1321" }],
  "node-fetch": [{ id: "GHSA-r683-j2x4-v87g", cve: "CVE-2022-0235", summary: "Exposure of sensitive information", severity: "medium", fixed: "2.6.7", range: ">=2.0.0 <2.6.7", cwe: "CWE-200" }],
  minimist: [{ id: "GHSA-v2x2-ae82-vwgx", cve: "CVE-2021-44906", summary: "Prototype pollution via constructor args", severity: "critical", fixed: "1.2.6", range: "<1.2.6", cwe: "CWE-1321" }],
  axios: [{ id: "GHSA-42xw-5xwc-wj2c", cve: "CVE-2023-45857", summary: "XSRF token disclosure", severity: "high", fixed: "1.6.0", range: ">=0.8.1 <1.6.0", cwe: "CWE-200" }],
  semver: [{ id: "GHSA-29wx-vh33-7x7r", cve: "CVE-2022-25883", summary: "ReDoS in semver", severity: "medium", fixed: "5.7.2", range: ">=5.0.0 <5.7.2", cwe: "CWE-1333" }],
  "glob-parent": [{ id: "GHSA-ww39-953v-wcq6", cve: "CVE-2020-28469", summary: "ReDoS in glob-parent", severity: "high", fixed: "5.1.2", range: ">=3.0.2 <5.1.2", cwe: "CWE-1333" }],
};

// ═════════════════════════════════════════════════════════════════════════
// Scanner implementations
// ═════════════════════════════════════════════════════════════════════════

function excerptAround(content: string, line: number, radius = 2): FindingEvidence {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  return {
    file: "",
    line,
    excerpt: lines.slice(Math.max(0, line - 1 - radius), line + radius).join("\n").slice(0, 600),
  };
}

function lineOf(content: string, re: RegExp): number | null {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return i + 1;
  }
  return null;
}

/** Run SAST + secret + config scanners (sync). */
export function runStaticScanners(files: Record<string, string>): RawFinding[] {
  const findings: RawFinding[] = [];

  for (const [path, content] of Object.entries(files)) {
    const isSource = /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go|java|php|cs|sql|env|ya?ml|json|toml|sh)$/i.test(path) || /dockerfile|nginx/i.test(path);
    if (!isSource) continue;
    const isTest = /\.(test|spec)\.[a-z]+$|(^|\/)tests?\//i.test(path);
    const isExample = /\.(example|sample|template)$/i.test(path);
    if (isTest || isExample) continue;

    const lines = content.replace(/\r\n/g, "\n").split("\n");

    // SAST
    for (const rule of SAST_RULES) {
      if (!rule.re.test(content)) continue;
      const lineStart = lineOf(content, rule.re) ?? undefined;
      // Auth-guard rule: skip when guard present
      if (rule.id === "sast.missing-authz") {
        if (!/api\//.test(path)) continue;
        if (/requireUser|requireAuth|getServerSession|auth\(\)|session|verifyToken|assertAccess|withAuth/.test(content)) continue;
      }
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
        rootCause: `${rule.title} — pattern matched in ${path}${lineStart ? `:${lineStart}` : ""}`,
        impact: defaultImpact(rule.severity),
        evidence: lineStart ? [{ ...excerptAround(content, lineStart), file: path }] : undefined,
        attackPath: rule.attackPath?.(path),
      });
    }

    // Secrets
    for (const pattern of SECRET_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (!pattern.re.test(lines[i])) continue;
        findings.push({
          ruleId: "secret.committed-credential",
          title: `Committed credential: ${pattern.label}`,
          category: "secret",
          severity: "critical",
          confidence: 90,
          cwe: pattern.cwe,
          filePath: path,
          lineStart: i + 1,
          lineEnd: i + 1,
          snippet: lines[i].trim().slice(0, 300),
          rootCause: `${pattern.label} committed in ${path}:${i + 1}`,
          impact: "Anyone with repository access (or anyone, if public) can reuse this credential.",
          evidence: [{ file: path, line: i + 1, excerpt: lines.slice(Math.max(0, i - 1), i + 2).join("\n").slice(0, 600) }],
          attackPath: [
            { label: "Credential committed", detail: "Secret value stored in version control", file: path, line: i + 1 },
            { label: "Repository access", detail: "Cloned by devs, CI, or scraped from a public repo" },
            { label: "Credential replay", detail: "Attacker authenticates as the service" },
            { label: "Impact", detail: "Full access to the upstream system the key protects" },
          ],
        });
        break;
      }
    }

    // Config
    for (const rule of CONFIG_RULES) {
      if (rule.pathMatch && !rule.pathMatch.test(path)) continue;
      if (!rule.re.test(content)) continue;
      const lineStart = lineOf(content, rule.re) ?? undefined;
      findings.push({
        ruleId: rule.id,
        title: rule.title,
        category: "config",
        severity: rule.severity,
        confidence: rule.confidence,
        cwe: rule.cwe,
        filePath: path,
        lineStart,
        snippet: lineStart ? lines[lineStart - 1]?.trim().slice(0, 300) : undefined,
        rootCause: `${rule.title} — pattern matched in ${path}`,
        impact: defaultImpact(rule.severity),
        evidence: lineStart ? [{ ...excerptAround(content, lineStart), file: path }] : undefined,
      });
    }
  }

  return findings;
}

// ── Dependency scanner (async: OSV when reachable) ─────────────────────────

interface Pkg { name: string; version: string; ecosystem: string; manifestPath: string }

export function parseDependencies(files: Record<string, string>): Pkg[] {
  const pkgs: Pkg[] = [];
  const pkgJson = files["package.json"];
  if (pkgJson) {
    try {
      const parsed = JSON.parse(pkgJson) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      const add = (deps: Record<string, string> | undefined, section: string) => {
        for (const [name, range] of Object.entries(deps ?? {})) {
          const installed = stripRange(range);
          pkgs.push({ name, version: installed, ecosystem: "npm", manifestPath: `package.json#${section}` });
        }
      };
      add(parsed.dependencies, "dependencies");
      add(parsed.devDependencies, "devDependencies");
    } catch {
      // malformed manifest
    }
  }
  const reqs = files["requirements.txt"];
  if (reqs) {
    for (const line of reqs.split("\n")) {
      const m = line.match(/^([A-Za-z0-9_.-]+)(?:[=<>!~]+)([A-Za-z0-9_.-]+)/);
      if (m) pkgs.push({ name: m[1], version: m[2], ecosystem: "pypi", manifestPath: "requirements.txt" });
    }
  }
  return pkgs;
}

function stripRange(range: string): string {
  return range.replace(/^[~^>=<*\s]+/, "") || "0.0.0";
}

/** Dependency scan: OSV API first, offline advisories as fallback. */
export async function runDependencyScanner(files: Record<string, string>): Promise<RawFinding[]> {
  const pkgs = parseDependencies(files);
  if (!pkgs.length) return [];

  const findings: RawFinding[] = [];
  const byName = new Map<string, Pkg[]>();
  for (const p of pkgs) {
    const list = byName.get(p.name) ?? [];
    list.push(p);
    byName.set(p.name, list);
  }

  for (const [name, instances] of byName) {
    const pkg = instances[0];
    const advisories = await queryOsv(pkg) ?? KNOWN_ADVISORIES[name] ?? [];

    for (const adv of advisories) {
      const inst = instances.find((i) => inRange(i.version, adv.range));
      if (!inst) continue;
      const ref: DependencyRef = {
        name,
        version: inst.version,
        ecosystem: inst.ecosystem,
        cve: adv.cve,
        ghsa: adv.id.startsWith("GHSA-") ? adv.id : undefined,
        summary: adv.summary,
        fixedVersion: adv.fixed,
      };
      findings.push({
        ruleId: `dep.vulnerable-${name}`,
        title: `Vulnerable dependency: ${name}@${inst.version}`,
        category: "dependency",
        severity: adv.severity,
        confidence: 95,
        cwe: adv.cwe,
        cve: adv.cve,
        filePath: inst.manifestPath.split("#")[0],
        rootCause: `${name} ${inst.version} is inside the affected range ${adv.range}`,
        impact: adv.summary,
        evidence: [{
          file: inst.manifestPath.split("#")[0],
          excerpt: `${name}: "${inst.version}" — affected ${adv.range}${adv.fixed ? `, fixed in ${adv.fixed}` : ""}`,
        }],
        components: [ref],
        attackPath: [
          { label: "Dependency resolved", detail: `${name}@${inst.version} installed via ${inst.manifestPath}` },
          { label: "Vulnerable code path", detail: adv.summary },
          { label: "Exploit vector", detail: "Depends on how the app invokes the vulnerable API" },
          { label: "Impact", detail: `Known issue ${adv.id}${adv.cve ? ` (${adv.cve})` : ""}` },
        ],
      });
    }
  }

  return findings;
}

async function queryOsv(pkg: Pkg): Promise<Array<{ id: string; cve?: string; summary: string; severity: Severity; fixed?: string; range: string; cwe?: string }> | null> {
  if (process.env.SECURITY_DISABLE_OSV === "1") return null;
  try {
    const res = await fetch("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: pkg.version, package: { name: pkg.name, ecosystem: pkg.ecosystem } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      vulns?: Array<{
        id: string;
        aliases?: string[];
        summary?: string;
        severity?: Array<{ type: string; score: string }>;
        affected?: Array<{ ranges?: Array<{ events: Array<{ introduced?: string; fixed?: string }> }> }>;
      }>;
    };
    return (data.vulns ?? []).slice(0, 5).map((v) => {
      let range = "";
      let fixed: string | undefined;
      for (const a of v.affected ?? []) {
        for (const r of a.ranges ?? []) {
          const introduced = r.events.find((e) => e.introduced)?.introduced ?? "0";
          fixed = r.events.find((e) => e.fixed)?.fixed ?? fixed;
          range += fixed ? `${range ? " " : ""}>=${introduced} <${fixed}` : `${range ? " " : ""}>=${introduced}`;
        }
      }
      const cvss = v.severity?.find((s) => s.type === "CVSS_V3")?.score;
      const base = cvss ? parseFloat(cvss) : NaN;
      return {
        id: v.id,
        cve: v.aliases?.find((a) => a.startsWith("CVE-")),
        summary: v.summary ?? "Known vulnerability",
        severity: !Number.isNaN(base) ? (base >= 9 ? "critical" : base >= 7 ? "high" : base >= 4 ? "medium" : "low") : ("medium" as Severity),
        fixed,
        range: range || ">=0",
        cwe: v.aliases?.find((a) => a.startsWith("CWE-")),
      };
    });
  } catch {
    return null;
  }
}

/** Run every scanner (static + dependency). */
export async function runAllScanners(files: Record<string, string>): Promise<RawFinding[]> {
  const [staticFindings, depFindings] = await Promise.all([
    Promise.resolve(runStaticScanners(files)),
    runDependencyScanner(files),
  ]);
  return [...staticFindings, ...depFindings];
}

function defaultImpact(severity: Severity): string {
  switch (severity) {
    case "critical": return "Potential full compromise of confidentiality, integrity or availability.";
    case "high": return "Significant data exposure or privilege escalation potential.";
    case "medium": return "Limited impact, useful as part of a chained attack.";
    default: return "Minor information disclosure or hardening gap.";
  }
}
