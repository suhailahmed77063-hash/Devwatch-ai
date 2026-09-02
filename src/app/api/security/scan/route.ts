import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  repositories,
  securityFindings,
  codeFindings,
  organizations,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { analyzeCodeDiff } from "@/lib/ai";

// Security patterns for scanning actual code
const SECRET_PATTERNS = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][^"']+["']/gi, severity: "high" as const, rule: "hardcoded-api-key", message: "Hardcoded API key detected" },
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']+["']/gi, severity: "critical" as const, rule: "hardcoded-password", message: "Hardcoded password detected" },
  { pattern: /(?:secret|token)\s*[:=]\s*["'][^"']+["']/gi, severity: "high" as const, rule: "hardcoded-secret", message: "Hardcoded secret or token detected" },
  { pattern: /(?:AWS_SECRET|PRIVATE_KEY|SIGNING_KEY)\s*[:=]\s*["']/gi, severity: "critical" as const, rule: "cloud-secret", message: "Cloud/infrastructure secret detected" },
  { pattern: /ghp_[a-zA-Z0-9]{36}/gi, severity: "critical" as const, rule: "github-token", message: "GitHub Personal Access Token exposed" },
  { pattern: /sk-[a-zA-Z0-9]{32,}/gi, severity: "critical" as const, rule: "openai-key", message: "OpenAI API key exposed" },
  { pattern: /sk_live_[a-zA-Z0-9]+/gi, severity: "critical" as const, rule: "stripe-key", message: "Stripe live secret key exposed" },
  { pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, severity: "high" as const, rule: "jwt-token", message: "JWT token found in code" },
];

const VULN_PATTERNS = [
  { pattern: /eval\s*\(/gi, severity: "high" as const, rule: "eval-usage", message: "eval() usage - potential code injection", category: "security" },
  { pattern: /innerHTML\s*=/gi, severity: "high" as const, rule: "xss-innerhtml", message: "innerHTML usage may lead to XSS", category: "security" },
  { pattern: /dangerouslySetInnerHTML/gi, severity: "medium" as const, rule: "dangerouslysethtml", message: "dangerouslySetInnerHTML - review for XSS", category: "security" },
  { pattern: /exec\s*\(\s*["'`]/gi, severity: "high" as const, rule: "command-injection", message: "Potential command injection via exec()", category: "security" },
  { pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\+\s*(?:req|request|params|query)/gi, severity: "critical" as const, rule: "sql-injection", message: "Potential SQL injection vulnerability", category: "security" },
  { pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g, severity: "medium" as const, rule: "empty-catch", message: "Empty catch block - errors silently swallowed", category: "code_quality" },
  { pattern: /console\.(log|debug|info)\s*\(/g, severity: "low" as const, rule: "console-log", message: "Console statement in production code", category: "code_quality" },
  { pattern: /TODO|FIXME|HACK|XXX/gi, severity: "informational" as const, rule: "todo-comment", message: "Unresolved TODO/FIXME comment", category: "code_quality" },
];

const DEPENDENCY_VULNS: Record<string, Array<{ severity: string; title: string; cve: string; fixedIn: string }>> = {
  "lodash": [{ severity: "high", title: "Prototype Pollution", cve: "CVE-2021-23337", fixedIn: "4.17.21" }],
  "express": [{ severity: "medium", title: "Open Redirect", cve: "CVE-2024-29041", fixedIn: "4.19.2" }],
  "axios": [{ severity: "medium", title: "Server-Side Request Forgery", cve: "CVE-2023-45857", fixedIn: "1.6.0" }],
  "minimist": [{ severity: "high", title: "Prototype Pollution", cve: "CVE-2021-44906", fixedIn: "1.2.6" }],
  "node-fetch": [{ severity: "medium", title: "Exposure of Sensitive Information", cve: "CVE-2022-0235", fixedIn: "2.6.7" }],
  "glob-parent": [{ severity: "high", title: "ReDoS", cve: "CVE-2020-28469", fixedIn: "5.1.2" }],
  "json5": [{ severity: "high", title: "Prototype Pollution", cve: "CVE-2022-46175", fixedIn: "1.0.2" }],
  "semver": [{ severity: "medium", title: "ReDoS", cve: "CVE-2022-25883", fixedIn: "5.7.2" }],
};

// POST /api/security/scan - Scan repos for security issues
export async function POST(request: NextRequest) {
  try {
    const { githubToken, repoId } = await request.json();

    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token is required" }, { status: 400 });
    }

    // Get repos to scan
    let reposToScan;
    if (repoId) {
      reposToScan = await db.select().from(repositories).where(eq(repositories.id, repoId));
    } else {
      reposToScan = await db.select().from(repositories).where(eq(repositories.isActive, true));
    }

    if (reposToScan.length === 0) {
      return NextResponse.json({ error: "No repositories to scan" }, { status: 400 });
    }

    let totalSecFindings = 0;
    let totalCodeFindings = 0;
    let totalVulns = 0;
    const scanResults = [];

    for (const repo of reposToScan) {
      try {
        // 1. Fetch code files from GitHub
        const filesRes = await fetch(
          `https://api.github.com/repos/${repo.fullName}/git/trees/${repo.defaultBranch || "main"}?recursive=1`,
          {
            headers: {
              Authorization: `token ${githubToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (!filesRes.ok) continue;
        const tree = await filesRes.json();

        if (!tree.tree) continue;

        // Filter code files
        const codeFiles = tree.tree.filter((f: { type: string; path: string; size?: number }) =>
          f.type === "blob" &&
          /\.(ts|tsx|js|jsx|py|go|java|rb|php|cs|rs|vue|svelte)$/.test(f.path) &&
          (f.size || 0) < 500000
        );

        // Scan first 30 files
        const filesToScan = codeFiles.slice(0, 30);
        const findingsForRepo = [];

        for (const file of filesToScan) {
          try {
            const contentRes = await fetch(
              `https://api.github.com/repos/${repo.fullName}/contents/${file.path}?ref=${repo.defaultBranch || "main"}`,
              {
                headers: {
                  Authorization: `token ${githubToken}`,
                  Accept: "application/vnd.github.v3+json",
                },
              }
            );

            if (!contentRes.ok) continue;
            const contentData = await contentRes.json();

            if (!contentData.content) continue;
            const content = Buffer.from(contentData.content, "base64").toString("utf-8");
            const lines = content.split("\n");

            // Scan for secrets
            for (const pattern of SECRET_PATTERNS) {
              let match;
              pattern.pattern.lastIndex = 0;
              while ((match = pattern.pattern.exec(content)) !== null) {
                const lineNum = content.substring(0, match.index).split("\n").length;
                const lineContent = lines[lineNum - 1]?.trim() || "";

                // Skip test files and example files
                if (file.path.includes("test") || file.path.includes("example") || file.path.includes(".env.example")) continue;
                // Skip minified files
                if (lineContent.length > 200) continue;

                try {
                  await db.insert(securityFindings).values({
                    repoId: repo.id,
                    severity: pattern.severity,
                    category: "secret",
                    file: file.path,
                    line: lineNum,
                    description: `${pattern.message}: ${lineContent.substring(0, 100)}`,
                    recommendation: "Move this secret to environment variables or a secrets manager",
                    source: "sast-scanner",
                  });
                  totalSecFindings++;
                  findingsForRepo.push({ file: file.path, rule: pattern.rule, severity: pattern.severity });
                } catch {
                  // Skip duplicate
                }
              }
            }

            // Scan for vulnerabilities
            for (const pattern of VULN_PATTERNS) {
              let match;
              pattern.pattern.lastIndex = 0;
              while ((match = pattern.pattern.exec(content)) !== null) {
                const lineNum = content.substring(0, match.index).split("\n").length;
                const lineContent = lines[lineNum - 1]?.trim() || "";

                if (lineContent.length > 200) continue;

                try {
                  await db.insert(codeFindings).values({
                    repoId: repo.id,
                    type: pattern.category as "security" | "code_quality" | "performance" | "dependency" | "vulnerability",
                    severity: pattern.severity,
                    file: file.path,
                    line: lineNum,
                    rule: pattern.rule,
                    message: pattern.message,
                    explanation: `Found: ${lineContent.substring(0, 150)}`,
                    confidence: 75,
                    source: "sast-scanner",
                  });
                  totalCodeFindings++;
                  findingsForRepo.push({ file: file.path, rule: pattern.rule, severity: pattern.severity });
                } catch {
                  // Skip duplicate
                }
              }
            }
          } catch {
            // Skip file errors
          }
        }

        // 2. Check dependencies for known vulnerabilities
        try {
          const pkgRes = await fetch(
            `https://api.github.com/repos/${repo.fullName}/contents/package.json?ref=${repo.defaultBranch || "main"}`,
            {
              headers: {
                Authorization: `token ${githubToken}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          );

          if (pkgRes.ok) {
            const pkgData = await pkgRes.json();
            if (pkgData.content) {
              const pkgContent = JSON.parse(Buffer.from(pkgData.content, "base64").toString("utf-8"));
              const allDeps = {
                ...pkgData.dependencies,
                ...pkgData.devDependencies,
              };

              for (const [pkg, version] of Object.entries(allDeps || {})) {
                const vulns = DEPENDENCY_VULNS[pkg];
                if (vulns) {
                  for (const vuln of vulns) {
                    try {
                      await db.insert(securityFindings).values({
                        repoId: repo.id,
                        severity: vuln.severity as "critical" | "high" | "medium" | "low" | "informational",
                        category: "dependency",
                        file: "package.json",
                        description: `${pkg}@${version}: ${vuln.title} (${vuln.cve}). Update to ${vuln.fixedIn}`,
                        recommendation: `Update ${pkg} to version ${vuln.fixedIn} or later`,
                        cweId: vuln.cve,
                        source: "sca-scanner",
                      });
                      totalSecFindings++;
                    } catch {
                      // Skip duplicate
                    }
                  }
                }
              }
            }
          }
        } catch {
          // Skip package.json errors
        }

        scanResults.push({
          repo: repo.name,
          filesScanned: filesToScan.length,
          findings: findingsForRepo.length,
        });

      } catch {
        // Skip repo errors
      }
    }

    return NextResponse.json({
      success: true,
      message: `Scan complete! Found ${totalSecFindings} security findings, ${totalCodeFindings} code issues`,
      stats: {
        reposScanned: reposToScan.length,
        securityFindings: totalSecFindings,
        codeFindings: totalCodeFindings,
      },
      results: scanResults,
    });
  } catch (error) {
    console.error("Security scan error:", error);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
