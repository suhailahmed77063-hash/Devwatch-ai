import { db } from "@/lib/db";
import { securityFindings, vulnerabilities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ── Secret Scanning Patterns ───────────────────────────────────────────────

const SECRET_PATTERNS = [
  { name: "AWS Access Key", pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g, severity: "critical" as const, cwe: "CWE-798" },
  { name: "AWS Secret Key", pattern: /aws[_\-]?secret[_\-]?access[_\-]?key\s*[:=]\s*["']?[A-Za-z0-9\/+=]{40}/gi, severity: "critical" as const, cwe: "CWE-798" },
  { name: "GitHub Token", pattern: /ghp_[A-Za-z0-9]{36}|gho_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}/g, severity: "critical" as const, cwe: "CWE-798" },
  { name: "Slack Token", pattern: /xox[baprs]-[A-Za-z0-9\-]+/g, severity: "high" as const, cwe: "CWE-798" },
  { name: "Private Key", pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, severity: "critical" as const, cwe: "CWE-321" },
  { name: "JWT Token", pattern: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/=]+/g, severity: "medium" as const, cwe: "CWE-798" },
  { name: "Generic Secret", pattern: /(?:secret|api[_\-]?key|apikey|auth[_\-]?token|access[_\-]?token|client[_\-]?secret)\s*[:=]\s*["'][A-Za-z0-9\-_.]{20,}["']/gi, severity: "high" as const, cwe: "CWE-798" },
  { name: "Password in URL", pattern: /:\/\/[^:]+:[^@]+@/g, severity: "high" as const, cwe: "CWE-259" },
  { name: "Connection String", pattern: /(?:mongodb|postgres|mysql|redis|amqp):\/\/[^\s]+/gi, severity: "high" as const, cwe: "CWE-259" },
];

// ── Vulnerable Package Patterns ────────────────────────────────────────────

const KNOWN_VULNERABILITIES: Record<string, Array<{ version: string; severity: string; title: string; advisory: string }>> = {
  lodash: [
    { version: "<4.17.21", severity: "high", title: "Prototype Pollution in lodash", advisory: "GHSA-35jh-r3h4-6jhm" },
  ],
  axios: [
    { version: "<0.21.1", severity: "high", title: "Server-Side Request Forgery", advisory: "GHSA-4w2v-q235-vp99" },
  ],
  express: [
    { version: "<4.18.2", severity: "medium", title: "Open Redirect vulnerability", advisory: "GHSA-rv95-896h-c2v1" },
  ],
  next: [
    { version: "<13.4.2", severity: "high", title: "Server-Side Request Forgery", advisory: "GHSA-f829-jj3p-2fp2" },
  ],
};

// ── Security Scanning Functions ────────────────────────────────────────────

export function scanForSecrets(
  content: string,
  filename: string,
  repoId: string,
  commitId?: string,
  prId?: string
): Array<{
  severity: string;
  category: string;
  file: string;
  description: string;
  recommendation: string;
  cweId: string;
}> {
  const findings: Array<{
    severity: string;
    category: string;
    file: string;
    description: string;
    recommendation: string;
    cweId: string;
  }> = [];

  for (const secret of SECRET_PATTERNS) {
    const matches = content.match(secret.pattern);
    if (matches) {
      for (const match of matches) {
        findings.push({
          severity: secret.severity,
          category: "secret_detection",
          file: filename,
          description: `${secret.name} detected: ${match.substring(0, 20)}...`,
          recommendation: `Remove the ${secret.name} from source code. Use environment variables or a secrets manager.`,
          cweId: secret.cwe,
        });
      }
    }
  }

  return findings;
}

export function scanDependencies(
  packageJson: string,
  repoId: string
): Array<{
  package: string;
  version: string;
  severity: string;
  title: string;
  advisoryUrl: string;
}> {
  const vulns: Array<{
    package: string;
    version: string;
    severity: string;
    title: string;
    advisoryUrl: string;
  }> = [];

  try {
    const pkg = JSON.parse(packageJson);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    for (const [name, version] of Object.entries(allDeps)) {
      const known = KNOWN_VULNERABILITIES[name];
      if (known) {
        for (const vuln of known) {
          vulns.push({
            package: name,
            version: version as string,
            severity: vuln.severity,
            title: vuln.title,
            advisoryUrl: `https://github.com/advisories/${vuln.advisory}`,
          });
        }
      }
    }
  } catch {
    // Invalid package.json
  }

  return vulns;
}

export async function calculateVulnerabilityStats(repoId: string) {
  const vulns = await db
    .select()
    .from(vulnerabilities)
    .where(eq(vulnerabilities.repoId, repoId));

  return {
    total: vulns.length,
    critical: vulns.filter((v) => v.severity === "critical").length,
    high: vulns.filter((v) => v.severity === "high").length,
    medium: vulns.filter((v) => v.severity === "medium").length,
    low: vulns.filter((v) => v.severity === "low").length,
  };
}
