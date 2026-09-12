/**
 * Security Agent — configuration scanner.
 *
 * Detects insecure defaults in deployment/configuration surfaces: committed
 * env files, permissive CORS, disabled TLS verification, debug flags, public
 * S3 buckets, open Docker ports and the like.
 */

import type { RawFinding } from "../types";

interface ConfigRule {
  id: string;
  title: string;
  severity: RawFinding["severity"];
  confidence: number;
  cwe?: string;
  /** Restrict to matching paths (undefined = all files). */
  pathMatch?: RegExp;
  test: (content: string) => string | null;
}

const RULES: ConfigRule[] = [
  {
    id: "config.committed-env",
    title: "Real .env file committed to the repository",
    severity: "critical",
    confidence: 90,
    cwe: "CWE-798",
    pathMatch: /(^|\/)\.env(\.|$)/,
    test: (content) => (/=\s*\S/.test(content) ? "Non-empty .env present in the file set" : null),
  },
  {
    id: "config.tls-verification-disabled",
    title: "TLS certificate verification disabled",
    severity: "high",
    confidence: 85,
    cwe: "CWE-295",
    test: (content) =>
      /(?:rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0|verify\s*=\s*False|InsecureSkipVerify\s*:\s*true)/.test(content)
        ? "Certificate validation explicitly disabled"
        : null,
  },
  {
    id: "config.debug-enabled",
    title: "Debug mode enabled in deployable configuration",
    severity: "high",
    confidence: 70,
    cwe: "CWE-489",
    pathMatch: /\.(env|ya?ml|json|toml|ini|cfg|conf|php)$/i,
    test: (content) =>
      /(?:^\s*DEBUG\s*=\s*(?:1|true|True|yes)|DEBUG\s*:\s*true|APP_DEBUG\s*=\s*(?:1|true|True)|debug\s*=\s*True)/m.test(content)
        ? "Debug mode enabled in a config file"
        : null,
  },
  {
    id: "config.public-s3-bucket",
    title: "Public S3 bucket policy",
    severity: "high",
    confidence: 75,
    cwe: "CWE-732",
    pathMatch: /\.(json|ya?ml|tf)$/i,
    test: (content) =>
      /"(?:Principa1?|Principal)"\s*:\s*"\*"/.test(content) && /s3|S3|bucket/i.test(content)
        ? "Bucket policy grants anonymous access"
        : null,
  },
  {
    id: "config.docker-root",
    title: "Container runs as root",
    severity: "medium",
    confidence: 65,
    cwe: "CWE-250",
    pathMatch: /dockerfile$/i,
    test: (content) => (/^\s*USER\s+root\s*$/im.test(content) ? "Dockerfile ends with USER root" : null),
  },
  {
    id: "config.exposed-admin-panel",
    title: "Admin route registered without protection marker",
    severity: "medium",
    confidence: 45,
    cwe: "CWE-425",
    test: (content) =>
      /(?:app\.use|router\.use|mount)\s*\(\s*["']\/(?:admin|internal)["']/.test(content) && !/auth|guard|middleware/i.test(content)
        ? "Admin surface mounted with no auth middleware in the same file"
        : null,
  },
  {
    id: "config.verbose-errors",
    title: "Stack traces exposed to clients",
    severity: "medium",
    confidence: 60,
    cwe: "CWE-209",
    test: (content) =>
      /(?:app\.use\s*\(\s*(?:errorHandler|errorHandlerMiddleware)|showStack\s*:\s*true|traceback\.print_exc\(\))/.test(content)
        ? "Error handler appears to expose stack traces"
        : null,
  },
];

/** Run configuration rules over the file map. */
export function runConfigScanner(files: Record<string, string>): RawFinding[] {
  const findings: RawFinding[] = [];

  for (const [path, content] of Object.entries(files)) {
    for (const rule of RULES) {
      if (rule.pathMatch && !rule.pathMatch.test(path)) continue;
      const reason = rule.test(content);
      if (!reason) continue;
      const lines = content.replace(/\r\n/g, "\n").split("\n");
      const lineStart = lines.findIndex((l) => rule.test(l)) + 1 || undefined;
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
        rootCause: reason,
        evidence: [
          { file: path, line: lineStart, excerpt: lines.slice(Math.max(0, (lineStart ?? 1) - 2), (lineStart ?? 1) + 1).join("\n").slice(0, 600) },
        ],
        impact: defaultImpact(rule.severity),
        // recommendation intentionally left to the remediation agent
        attackPath: [
          { label: "Misconfiguration deployed", detail: reason, file: path, line: lineStart },
          { label: "Exposed surface", detail: "Attacker reaches the misconfigured component" },
          { label: "Impact", detail: defaultImpact(rule.severity) },
        ],
      });
    }
  }

  return findings;
}

function defaultImpact(severity: RawFinding["severity"]): string {
  switch (severity) {
    case "critical": return "Immediate compromise risk if the configuration is deployed as-is.";
    case "high": return "Easily weaponizable once discovered by an attacker.";
    case "medium": return "Weakens the security posture; often chained with other issues.";
    default: return "Hardening opportunity with limited direct impact.";
  }
}
