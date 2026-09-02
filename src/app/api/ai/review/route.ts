import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  repositories,
  pullRequests,
  codeFindings,
  aiAnalysis,
  organizations,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Security patterns to scan for
const SECURITY_PATTERNS = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][^"']+["']/gi, severity: "high" as const, rule: "hardcoded-api-key", message: "Hardcoded API key detected", fix: "Move to environment variables: process.env.API_KEY" },
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']+["']/gi, severity: "critical" as const, rule: "hardcoded-password", message: "Hardcoded password detected", fix: "Use environment variable or secrets manager" },
  { pattern: /(?:secret|token)\s*[:=]\s*["'][^"']+["']/gi, severity: "high" as const, rule: "hardcoded-secret", message: "Hardcoded secret/token detected", fix: "Move to environment variables" },
  { pattern: /eval\s*\(/gi, severity: "high" as const, rule: "eval-usage", message: "eval() usage - potential code injection", fix: "Use JSON.parse() or safer alternatives" },
  { pattern: /innerHTML\s*=/gi, severity: "high" as const, rule: "xss-innerhtml", message: "innerHTML - potential XSS vulnerability", fix: "Sanitize with DOMPurify or use textContent" },
  { pattern: /dangerouslySetInnerHTML/gi, severity: "medium" as const, rule: "dangerouslysethtml", message: "dangerouslySetInnerHTML - review for XSS", fix: "Sanitize HTML content before rendering" },
  { pattern: /exec\s*\(\s*["'`]/gi, severity: "high" as const, rule: "command-injection", message: "Potential command injection", fix: "Use parameterized APIs, validate inputs" },
  { pattern: /console\.(log|debug|info)\s*\(/g, severity: "low" as const, rule: "console-log", message: "Console statement in code", fix: "Remove or use a logging library" },
  { pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g, severity: "medium" as const, rule: "empty-catch", message: "Empty catch block - errors silently swallowed", fix: "Add error handling or logging" },
  { pattern: /TODO|FIXME|HACK|XXX/gi, severity: "informational" as const, rule: "todo-comment", message: "Unresolved TODO/FIXME comment", fix: "Address the TODO or create a tracking issue" },
  { pattern: /any(?:\s|;|,|\))/g, severity: "low" as const, rule: "any-type", message: "TypeScript 'any' type usage", fix: "Define proper types instead of 'any'" },
  { pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\+\s*(?:req|request|params|query)/gi, severity: "critical" as const, rule: "sql-injection", message: "Potential SQL injection", fix: "Use parameterized queries or ORM" },
];

export async function POST(request: NextRequest) {
  try {
    const { githubToken: requestToken, repoId, prNumber, prId, mode } = await request.json();

    const githubToken = requestToken || process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return NextResponse.json(
        { error: "GitHub token required. Set GITHUB_TOKEN or provide in request." },
        { status: 400 }
      );
    }

    let repo;
    let pr;

    // Get repo and PR info
    if (repoId && prNumber) {
      const repoResult = await db.select().from(repositories).where(eq(repositories.id, repoId)).limit(1);
      repo = repoResult[0];
      if (repo) {
        const prResult = await db.select().from(pullRequests).where(eq(pullRequests.number, prNumber)).limit(1);
        pr = prResult[0];
      }
    } else if (prId) {
      const prResult = await db.select().from(pullRequests).where(eq(pullRequests.id, prId)).limit(1);
      pr = prResult[0];
      if (pr) {
        const repoResult = await db.select().from(repositories).where(eq(repositories.id, pr.repoId)).limit(1);
        repo = repoResult[0];
      }
    } else if (repoId) {
      // Full repo review (not PR-specific)
      const repoResult = await db.select().from(repositories).where(eq(repositories.id, repoId)).limit(1);
      repo = repoResult[0];
    }

    if (!repo) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    const startTime = Date.now();
    const allFindings: Array<{
      file: string;
      line: number;
      severity: string;
      rule: string;
      message: string;
      fix: string;
      code: string;
    }> = [];

    // 1. Fetch repository file tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${repo.fullName}/git/trees/${repo.defaultBranch || "main"}?recursive=1`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!treeRes.ok) {
      return NextResponse.json({ error: "Failed to fetch repository from GitHub" }, { status: 500 });
    }

    const tree = await treeRes.json();

    // Filter code files only
    const codeFiles = (tree.tree || []).filter((f: { type: string; path: string; size?: number }) =>
      f.type === "blob" &&
      /\.(ts|tsx|js|jsx|py|go|java|rb|php|cs|rs|vue|svelte|css|scss|html|json|yaml|yml|md)$/.test(f.path) &&
      (f.size || 0) < 300000 &&
      !f.path.includes("node_modules") &&
      !f.path.includes("dist") &&
      !f.path.includes(".next") &&
      !f.path.includes("build") &&
      !f.path.includes("package-lock") &&
      !f.path.includes("yarn.lock")
    );

    const filesToScan = codeFiles.slice(0, 50); // Scan up to 50 files
    let filesScanned = 0;

    // 2. Fetch and analyze each file
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
        filesScanned++;

        // Scan each line for issues
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          const line = lines[lineNum];

          // Skip empty lines, comments, and very long lines
          if (!line.trim() || line.trim().startsWith("//") || line.trim().startsWith("*") || line.length > 300) continue;

          for (const pattern of SECURITY_PATTERNS) {
            pattern.pattern.lastIndex = 0;
            if (pattern.pattern.test(line)) {
              // Get context (2 lines before and after)
              const startLine = Math.max(0, lineNum - 1);
              const endLine = Math.min(lines.length - 1, lineNum + 1);
              const context = lines.slice(startLine, endLine + 1).join("\n");

              allFindings.push({
                file: file.path,
                line: lineNum + 1,
                severity: pattern.severity,
                rule: pattern.rule,
                message: pattern.message,
                fix: pattern.fix,
                code: context.substring(0, 200),
              });

              // Save to database
              try {
                await db.insert(codeFindings).values({
                  repoId: repo.id,
                  prId: pr?.id || null,
                  type: pattern.severity === "low" || pattern.severity === "informational" ? "code_quality" : "security",
                  severity: pattern.severity,
                  file: file.path,
                  line: lineNum + 1,
                  rule: pattern.rule,
                  message: pattern.message,
                  explanation: `Found in ${file.path}:${lineNum + 1}`,
                  suggestedFix: pattern.fix,
                  confidence: 80,
                  source: "ai-review",
                });
              } catch {
                // Skip duplicates
              }
            }
          }
        }
      } catch {
        // Skip file errors
      }
    }

    // 3. Check for dependency vulnerabilities
    let dependencyIssues: string[] = [];
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
          const pkg = JSON.parse(Buffer.from(pkgData.content, "base64").toString("utf-8"));
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };

          // Check for known vulnerable packages
          const vulnerablePkgs: Record<string, string> = {
            "lodash": "< 4.17.21 - Prototype Pollution (CVE-2021-23337)",
            "express": "< 4.19.2 - Open Redirect (CVE-2024-29041)",
            "axios": "< 1.6.0 - SSRF (CVE-2023-45857)",
            "minimist": "< 1.2.6 - Prototype Pollution (CVE-2021-44906)",
            "node-fetch": "< 2.6.7 - Info Exposure (CVE-2022-0235)",
            "react": "< 18.2.0 - XSS (CVE-2022-39349)",
            "next": "< 13.4.20 - Authorization bypass (CVE-2023-46298)",
          };

          for (const [pkgName, vulnInfo] of Object.entries(vulnerablePkgs)) {
            if (deps[pkgName]) {
              dependencyIssues.push(`${pkgName}@${deps[pkgName]}: ${vulnInfo}`);
            }
          }
        }
      }
    } catch {
      // Skip package.json errors
    }

    // 4. Build review summary
    const criticalCount = allFindings.filter((f) => f.severity === "critical").length;
    const highCount = allFindings.filter((f) => f.severity === "high").length;
    const mediumCount = allFindings.filter((f) => f.severity === "medium").length;
    const lowCount = allFindings.filter((f) => f.severity === "low").length;

    const duration = Math.round((Date.now() - startTime) / 1000);

    // 5. Save analysis to database
    const org = await db.select().from(organizations).limit(1);
    if (org[0]) {
      try {
        await db.insert(aiAnalysis).values({
          entityType: pr ? "pull_request" : "repository",
          entityId: pr?.id || repo.id,
          repoId: repo.id,
          analysisType: "code-review",
          result: {
            filesScanned,
            totalFindings: allFindings.length,
            critical: criticalCount,
            high: highCount,
            medium: mediumCount,
            low: lowCount,
            dependencyIssues: dependencyIssues.length,
            duration,
          },
          summary: `Reviewed ${filesScanned} files in ${repo.name}. Found ${allFindings.length} issues (${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low).`,
          modelUsed: process.env.AI_MODEL || "pattern-scanner",
        });
      } catch {
        // Skip
      }
    }

    // 6. Build review response
    const review = buildReviewReport(repo, pr || null, allFindings, dependencyIssues, filesScanned, duration);

    return NextResponse.json({
      review,
      stats: {
        filesScanned,
        totalFindings: allFindings.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        dependencyIssues: dependencyIssues.length,
        duration: `${duration}s`,
      },
      findings: allFindings.slice(0, 20),
      dependencyIssues,
    });
  } catch (error) {
    console.error("Code review error:", error);
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }
}

function buildReviewReport(
  repo: { name: string; fullName: string },
  pr: { number: number; title: string } | null,
  findings: Array<{ file: string; line: number; severity: string; rule: string; message: string; fix: string; code: string }>,
  dependencyIssues: string[],
  filesScanned: number,
  duration: number
): string {
  const lines: string[] = [];

  if (pr) {
    lines.push(`## Code Review: PR #${pr.number} — ${pr.title}`);
  } else {
    lines.push(`## Repository Review: ${repo.name}`);
  }
  lines.push(`**Repository:** ${repo.fullName}`);
  lines.push(`**Files Scanned:** ${filesScanned}`);
  lines.push(`**Scan Duration:** ${duration}s`);
  lines.push("");

  // Summary
  const critical = findings.filter((f) => f.severity === "critical");
  const high = findings.filter((f) => f.severity === "high");
  const medium = findings.filter((f) => f.severity === "medium");
  const low = findings.filter((f) => f.severity === "low");

  lines.push("### Summary");
  lines.push(`- 🔴 Critical: ${critical.length}`);
  lines.push(`- 🟠 High: ${high.length}`);
  lines.push(`- 🟡 Medium: ${medium.length}`);
  lines.push(`- 🔵 Low: ${low.length}`);
  lines.push("");

  // Overall assessment
  if (critical.length > 0) {
    lines.push("### ❌ NOT SAFE TO DEPLOY");
    lines.push("Critical security issues found that must be resolved first.");
  } else if (high.length > 0) {
    lines.push("### ⚠️ DEPLOY WITH CAUTION");
    lines.push("High severity issues found. Review before deploying.");
  } else if (findings.length === 0) {
    lines.push("### ✅ LOOKS GOOD");
    lines.push("No significant issues found in the scanned files.");
  } else {
    lines.push("### ✅ GENERALLY SAFE");
    lines.push("Minor issues found. Consider addressing them.");
  }
  lines.push("");

  // Critical & High findings
  const importantFindings = [...critical, ...high];
  if (importantFindings.length > 0) {
    lines.push("### Critical & High Issues");
    for (const f of importantFindings.slice(0, 10)) {
      lines.push("");
      lines.push(`**${f.severity.toUpperCase()}** — ${f.message}`);
      lines.push(`- 📍 File: \`${f.file}:${f.line}\``);
      lines.push(`- 💻 Code: \`${f.code.substring(0, 100)}\``);
      lines.push(`- 🔧 Fix: ${f.fix}`);
    }
    lines.push("");
  }

  // Medium findings
  if (medium.length > 0) {
    lines.push("### Medium Issues");
    for (const f of medium.slice(0, 5)) {
      lines.push(`- \`${f.file}:${f.line}\` — ${f.message}`);
    }
    lines.push("");
  }

  // Dependency vulnerabilities
  if (dependencyIssues.length > 0) {
    lines.push("### Dependency Vulnerabilities");
    for (const issue of dependencyIssues) {
      lines.push(`- 🔴 ${issue}`);
    }
    lines.push("");
  }

  // Files scanned list
  const uniqueFiles = [...new Set(findings.map((f) => f.file))];
  if (uniqueFiles.length > 0) {
    lines.push("### Files with Issues");
    for (const file of uniqueFiles.slice(0, 10)) {
      const fileFindings = findings.filter((f) => f.file === file);
      lines.push(`- \`${file}\` — ${fileFindings.length} issue(s)`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("*This review was generated by DevWatch AI's static analysis engine. For full security audit, consider additional tools.*");

  return lines.join("\n");
}
