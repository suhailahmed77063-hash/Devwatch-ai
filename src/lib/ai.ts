import { db } from "@/lib/db";
import {
  codeFindings,
  aiAnalysis,
  commits,
  pullRequests,
  repositories,
  projects,
  tasks,
  securityFindings,
  ciRuns,
  alerts,
  activityEvents,
  developers,
} from "@/lib/db/schema";
import { eq, and, gte, desc, sql, count } from "drizzle-orm";

// ── AI Code Analysis ───────────────────────────────────────────────────────

const SECURITY_PATTERNS = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][^"']+["']/gi, type: "security", severity: "high" as const, rule: "hardcoded-api-key", message: "Hardcoded API key detected" },
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']+["']/gi, type: "security", severity: "critical" as const, rule: "hardcoded-password", message: "Hardcoded password detected" },
  { pattern: /(?:secret|token)\s*[:=]\s*["'][^"']+["']/gi, type: "security", severity: "high" as const, rule: "hardcoded-secret", message: "Hardcoded secret or token detected" },
  { pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\+\s*(?:req|request|params|query)/gi, type: "security", severity: "critical" as const, rule: "sql-injection", message: "Potential SQL injection vulnerability" },
  { pattern: /innerHTML\s*=/gi, type: "security", severity: "high" as const, rule: "xss-innerhtml", message: "innerHTML usage may lead to XSS" },
  { pattern: /eval\s*\(/gi, type: "security", severity: "high" as const, rule: "eval-usage", message: "eval() usage detected - potential code injection" },
  { pattern: /exec\s*\(\s*["'`]/gi, type: "security", severity: "high" as const, rule: "command-injection", message: "Potential command injection via exec()" },
  { pattern: /dangerouslySetInnerHTML/gi, type: "security", severity: "medium" as const, rule: "dangerouslysethtml", message: "dangerouslySetInnerHTML usage - review for XSS" },
  { pattern: /(?:AWS_SECRET|PRIVATE_KEY|SIGNING_KEY)\s*[:=]\s*["']/gi, type: "security", severity: "critical" as const, rule: "cloud-secret", message: "Cloud/infrastructure secret detected" },
];

const QUALITY_PATTERNS = [
  { pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g, type: "code_quality", severity: "medium" as const, rule: "empty-catch", message: "Empty catch block - errors silently swallowed" },
  { pattern: /console\.(log|debug|info)\s*\(/g, type: "code_quality", severity: "low" as const, rule: "console-log", message: "Console statement in production code" },
  { pattern: /TODO|FIXME|HACK|XXX/gi, type: "code_quality", severity: "informational" as const, rule: "todo-comment", message: "Unresolved TODO/FIXME comment" },
  { pattern: /(?:function|=>)\s*\{[^}]{500,}/g, type: "code_quality", severity: "medium" as const, rule: "complex-function", message: "Very long function - consider refactoring" },
  { pattern: /any(?:\s|;|,|\))/g, type: "code_quality", severity: "low" as const, rule: "any-type", message: "TypeScript 'any' type usage weakens type safety" },
];

export interface AnalysisResult {
  findings: Array<{
    type: string;
    severity: string;
    file: string;
    line?: number;
    rule: string;
    message: string;
    explanation: string;
    suggestedFix: string;
    confidence: number;
  }>;
  summary: string;
}

export function analyzeCodeDiff(
  files: Array<{ filename: string; patch?: string }>
): AnalysisResult {
  const findings: AnalysisResult["findings"] = [];

  for (const file of files) {
    if (!file.patch) continue;
    const lines = file.patch.split("\n");
    let lineNum = 0;

    for (const line of lines) {
      if (line.startsWith("@@")) {
        const match = line.match(/\+(\d+)/);
        if (match) lineNum = parseInt(match[1]);
        continue;
      }
      if (line.startsWith("-")) continue;
      lineNum++;

      const codeLine = line.startsWith("+") ? line.substring(1) : line;

      for (const check of SECURITY_PATTERNS) {
        if (check.pattern.test(codeLine)) {
          findings.push({
            type: check.type,
            severity: check.severity,
            file: file.filename,
            line: lineNum,
            rule: check.rule,
            message: check.message,
            explanation: `Found potential security issue: ${check.rule}. This should be reviewed and remediated before merging.`,
            suggestedFix: getSuggestedFix(check.rule),
            confidence: 0.75,
          });
        }
      }

      for (const check of QUALITY_PATTERNS) {
        if (check.pattern.test(codeLine)) {
          findings.push({
            type: check.type,
            severity: check.severity,
            file: file.filename,
            line: lineNum,
            rule: check.rule,
            message: check.message,
            explanation: `Code quality finding: ${check.rule}. Consider addressing this.`,
            suggestedFix: getSuggestedFix(check.rule),
            confidence: 0.7,
          });
        }
      }
    }
  }

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const summary = findings.length === 0
    ? "No issues found in the analyzed code."
    : `Found ${findings.length} issue(s): ${criticalCount} critical, ${highCount} high severity. Review the findings below.`;

  return { findings, summary };
}

function getSuggestedFix(rule: string): string {
  const fixes: Record<string, string> = {
    "hardcoded-api-key": "Move the API key to an environment variable and reference it via process.env",
    "hardcoded-password": "Never hardcode passwords. Use environment variables or a secrets manager",
    "hardcoded-secret": "Use a secrets manager or environment variables for all secrets",
    "sql-injection": "Use parameterized queries or an ORM to prevent SQL injection",
    "xss-innerhtml": "Use a sanitization library (e.g., DOMPurify) before setting innerHTML",
    "eval-usage": "Avoid eval(). Use safer alternatives like JSON.parse() or Function constructor",
    "command-injection": "Use parameterized APIs or validate inputs before passing to exec()",
    "dangerouslysethtml": "Sanitize HTML content before rendering with dangerouslySetInnerHTML",
    "cloud-secret": "Use a cloud secrets manager (e.g., AWS Secrets Manager, Vault)",
    "empty-catch": "Add error handling, logging, or re-throw in catch blocks",
    "console-log": "Remove console statements or use a proper logging library",
    "todo-comment": "Address the TODO/FIXME before merging or create a tracking issue",
    "complex-function": "Break this function into smaller, more focused functions",
    "any-type": "Define proper types instead of using 'any'",
  };
  return fixes[rule] || "Review and address this finding";
}

// ── Risk Score Calculation ──────────────────────────────────────────────────

export async function calculatePRRiskScore(prId: string): Promise<number> {
  const prResult = await db.select().from(pullRequests).where(eq(pullRequests.id, prId)).limit(1);
  const pr = prResult[0];
  if (!pr) return 0;

  let score = 0;

  score += Math.min((pr.changedFiles || 0) * 2, 20);

  const totalLines = (pr.additions || 0) + (pr.deletions || 0);
  score += Math.min(totalLines / 50, 15);

  const secFindingsResult = await db
    .select({ count: count() })
    .from(securityFindings)
    .where(eq(securityFindings.prId, prId));
  score += Math.min((secFindingsResult[0]?.count || 0) * 15, 30);

  const codeIssuesResult = await db
    .select({ count: count() })
    .from(codeFindings)
    .where(eq(codeFindings.prId, prId));
  score += Math.min((codeIssuesResult[0]?.count || 0) * 5, 15);

  if (pr.ciStatus === "failure") score += 20;
  else if (pr.ciStatus === "pending") score += 5;

  const criticalFindings = await db
    .select()
    .from(codeFindings)
    .where(
      and(
        eq(codeFindings.prId, prId),
        eq(codeFindings.severity, "critical")
      )
    );
  score += criticalFindings.length * 10;

  return Math.min(score, 100);
}

export function getRiskLevel(score: number): { label: string; color: string; emoji: string } {
  if (score <= 30) return { label: "Low Risk", color: "green", emoji: "🟢" };
  if (score <= 60) return { label: "Medium Risk", color: "yellow", emoji: "🟡" };
  if (score <= 80) return { label: "High Risk", color: "orange", emoji: "🟠" };
  return { label: "Critical Risk", color: "red", emoji: "🔴" };
}

// ── AI Chat / Engineering Manager ───────────────────────────────────────────

export interface ChatContext {
  repositories: any[];
  recentCommits: any[];
  openPRs: any[];
  securityFindings: any[];
  projects: any[];
  recentAlerts: any[];
  ciStatus: any[];
}

export async function gatherChatContext(orgId: string): Promise<ChatContext> {
  const repos = await db.select().from(repositories).where(eq(repositories.orgId, orgId));
  const recentCommits = await db.select().from(commits).orderBy(desc(commits.committedAt)).limit(20);
  const openPRs = await db.select().from(pullRequests).where(eq(pullRequests.state, "open")).orderBy(desc(pullRequests.createdAt)).limit(15);
  const secFindings = await db.select().from(securityFindings).orderBy(desc(securityFindings.createdAt)).limit(20);
  const projectList = await db.select().from(projects).where(eq(projects.orgId, orgId));
  const recentAlertList = await db.select().from(alerts).where(eq(alerts.orgId, orgId)).orderBy(desc(alerts.createdAt)).limit(20);
  const recentCI = await db.select().from(ciRuns).orderBy(desc(ciRuns.createdAt)).limit(15);

  return {
    repositories: repos,
    recentCommits,
    openPRs,
    securityFindings: secFindings,
    projects: projectList,
    recentAlerts: recentAlertList,
    ciStatus: recentCI,
  };
}

export function buildSystemPrompt(context: ChatContext): string {
  const repoNames = context.repositories.map((r) => r.name).join(", ") || "none";
  const openPRCount = context.openPRs.length;
  const criticalFindings = context.securityFindings.filter(
    (f) => f.severity === "critical"
  ).length;
  const projectInfo = context.projects
    .map((p) => `${p.name} (${p.progress}% complete)`)
    .join("; ") || "none";

  return `You are an AI Engineering Manager assistant for DevWatch AI.
You have access to the following real project data:

Connected Repositories: ${repoNames}
Open Pull Requests: ${openPRCount}
Critical Security Findings: ${criticalFindings}
Active Projects: ${projectInfo}

Recent Commits:
${context.recentCommits.map((c) => `- ${c.message?.substring(0, 80) || "No message"} (${c.branch || "unknown"} branch)`).join("\n") || "No recent commits"}

Open PRs:
${context.openPRs.map((p) => `- PR #${p.number}: ${p.title} [${p.state}] Risk: ${p.riskScore || "N/A"}`).join("\n") || "No open PRs"}

Security Findings:
${context.securityFindings.map((f) => `- [${f.severity}] ${f.description} in ${f.file || "unknown"}`).join("\n") || "No security findings"}

Active Alerts:
${context.recentAlerts.map((a) => `- [${a.severity}] ${a.title}: ${a.message}`).join("\n") || "No alerts"}

CI/CD Status:
${context.ciStatus.map((c) => `- ${c.name}: ${c.status}`).join("\n") || "No recent CI runs"}

Answer questions using ONLY this data. Do not invent or hallucinate information.
Be concise, actionable, and engineering-focused.`;
}

export async function generateAIResponse(
  userMessage: string,
  orgId: string
): Promise<string> {
  const context = await gatherChatContext(orgId);
  const systemPrompt = buildSystemPrompt(context);

  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL || "gpt-4o";

  if (!apiKey) {
    return generateFallbackResponse(userMessage, context);
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      return generateFallbackResponse(userMessage, context);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response generated.";
  } catch {
    return generateFallbackResponse(userMessage, context);
  }
}

function generateFallbackResponse(userMessage: string, context: ChatContext): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("what changed this week") || lower.includes("weekly")) {
    const commits = context.recentCommits.length;
    const prs = context.openPRs.length;
    return `This week:\n• ${commits} commits across ${context.repositories.length} repositories\n• ${prs} pull requests\n• ${context.securityFindings.length} security findings\n\nKey recent commits:\n${context.recentCommits.slice(0, 5).map((c) => `• ${c.message?.substring(0, 80)}`).join("\n") || "No commits found"}`;
  }

  if (lower.includes("risky") || lower.includes("risk")) {
    const riskyPRs = context.openPRs.filter((p) => (p.riskScore || 0) > 60);
    if (riskyPRs.length === 0) return "No high-risk PRs detected at this time.";
    return `High-risk PRs detected:\n${riskyPRs.map((p) => `• PR #${p.number}: ${p.title} (Risk Score: ${p.riskScore})`).join("\n")}`;
  }

  if (lower.includes("security") || lower.includes("vulnerability")) {
    const critical = context.securityFindings.filter((f) => f.severity === "critical");
    const high = context.securityFindings.filter((f) => f.severity === "high");
    return `Security Status:\n• ${critical.length} critical findings\n• ${high.length} high findings\n• ${context.securityFindings.length} total findings\n\n${critical.length > 0 ? "⚠️ Critical issues require immediate attention:\n" + critical.map((f) => `• ${f.description}`).join("\n") : "No critical security issues."}`;
  }

  if (lower.includes("blocked")) {
    return `Checking for blockers...\n• ${context.openPRs.filter((p) => p.ciStatus === "failure").length} PRs with failing CI\n• ${context.openPRs.filter((p) => (p.riskScore || 0) > 80).length} PRs with critical risk scores\n• No explicit blockers recorded in the system.`;
  }

  if (lower.includes("delayed") || lower.includes("behind")) {
    const projects = context.projects.filter((p) => p.deadline && new Date(p.deadline) < new Date());
    if (projects.length === 0) return "No projects appear to be delayed based on current data.";
    return `Potentially delayed projects:\n${projects.map((p) => `• ${p.name}: ${p.progress}% complete`).join("\n")}`;
  }

  if (lower.includes("summary") || lower.includes("team")) {
    return `Team Summary:\n• ${context.repositories.length} active repositories\n• ${context.recentCommits.length} recent commits\n• ${context.openPRs.length} open PRs\n• ${context.securityFindings.length} security findings\n• ${context.recentAlerts.length} active alerts\n\nProjects:\n${context.projects.map((p) => `• ${p.name}: ${p.progress}%`).join("\n") || "No projects tracked"}`;
  }

  if (lower.includes("focus") || lower.includes("priorit")) {
    const priorities: string[] = [];
    if (context.securityFindings.filter((f) => f.severity === "critical").length > 0) {
      priorities.push("Address critical security findings immediately");
    }
    if (context.openPRs.filter((p) => (p.riskScore || 0) > 70).length > 0) {
      priorities.push("Review high-risk pull requests");
    }
    if (context.ciStatus.filter((c) => c.status === "failure").length > 0) {
      priorities.push("Fix failing CI pipelines");
    }
    if (priorities.length === 0) {
      priorities.push("Review open PRs for quality", "Check project milestones");
    }
    return `Recommended Focus Areas:\n${priorities.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
  }

  return `I can help you with your engineering team's activity. Try asking:\n• "What changed this week?"\n• "Which PRs are risky?"\n• "Are there any security problems?"\n• "Who is blocked?"\n• "What should we focus on?"\n• "Summarize the team's work"`;
}
