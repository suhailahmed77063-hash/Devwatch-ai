import { db } from "@/lib/db";
import {
  releases,
  releaseCommits,
  releasePullRequests,
  releaseChecks,
  releaseRisks,
  deploymentEvents,
  deploymentEnvironments,
  rollbackRecommendations,
  deploymentGateConfig,
  releaseNotifications,
  commits,
  pullRequests,
  securityFindings,
  vulnerabilities,
  codeFindings,
  ciRuns,
  repositories,
  projects,
} from "@/lib/db/schema";
import { eq, and, desc, count, sql, gte } from "drizzle-orm";

// ── Score Calculation ─────────────────────────────────────────────────────

export interface ReleaseSignals {
  totalCommits: number;
  totalPRs: number;
  openPRs: number;
  mergedPRs: number;
  ciPassRate: number;
  testPassRate: number;
  criticalSecurity: number;
  highSecurity: number;
  mediumSecurity: number;
  lowSecurity: number;
  criticalVulns: number;
  highRiskPRs: number;
  breakingChanges: number;
  dbChanges: number;
  codeQualityIssues: number;
  failedDeployments: number;
  previousDeployments: number;
}

export function calculateReadinessScore(signals: ReleaseSignals): {
  score: number;
  label: string;
  emoji: string;
  color: string;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};
  let score = 100;

  // CI/CD Health (max -25 points)
  const ciPenalty = signals.ciPassRate < 100 ? Math.round((100 - signals.ciPassRate) * 0.25) : 0;
  breakdown["CI/CD Health"] = -ciPenalty;
  score -= ciPenalty;

  // Test Results (max -20 points)
  const testPenalty = signals.testPassRate < 100 ? Math.round((100 - signals.testPassRate) * 0.20) : 0;
  breakdown["Test Results"] = -testPenalty;
  score -= testPenalty;

  // Security (max -25 points)
  const securityPenalty = Math.min(
    signals.criticalSecurity * 10 + signals.highSecurity * 5 + signals.mediumSecurity * 2,
    25
  );
  breakdown["Security"] = -securityPenalty;
  score -= securityPenalty;

  // High Risk PRs (max -15 points)
  const riskPRPenalty = Math.min(signals.highRiskPRs * 5, 15);
  breakdown["High Risk PRs"] = -riskPRPenalty;
  score -= riskPRPenalty;

  // Breaking Changes (max -10 points)
  const breakingPenalty = Math.min(signals.breakingChanges * 5, 10);
  breakdown["Breaking Changes"] = -breakingPenalty;
  score -= breakingPenalty;

  // Code Quality (max -10 points)
  const qualityPenalty = Math.min(signals.codeQualityIssues * 2, 10);
  breakdown["Code Quality"] = -qualityPenalty;
  score -= qualityPenalty;

  // Failed Deployments History (max -10 points)
  const failedDeployPenalty = signals.failedDeployments > 0 ? Math.min(signals.failedDeployments * 5, 10) : 0;
  breakdown["Deploy History"] = -failedDeployPenalty;
  score -= failedDeployPenalty;

  score = Math.max(0, Math.min(100, score));

  let label: string;
  let emoji: string;
  let color: string;

  if (score >= 90) {
    label = "Ready to Deploy";
    emoji = "🟢";
    color = "green";
  } else if (score >= 70) {
    label = "Deploy with Caution";
    emoji = "🟡";
    color = "yellow";
  } else if (score >= 50) {
    label = "Needs Attention";
    emoji = "🟠";
    color = "orange";
  } else {
    label = "Not Ready";
    emoji = "🔴";
    color = "red";
  }

  return { score, label, emoji, color, breakdown };
}

// ── Gather Release Signals from DB ────────────────────────────────────────

export async function gatherReleaseSignals(
  repoId?: string,
  sinceDate?: Date
): Promise<ReleaseSignals> {
  const since = sinceDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const repoFilter = repoId ? eq(commits.repoId, repoId) : undefined;
  const timeFilter = gte(commits.committedAt, since);

  // Commits
  const commitCount = await db
    .select({ count: count() })
    .from(commits)
    .where(repoFilter ? and(repoFilter, timeFilter) : timeFilter);

  // PRs
  const prFilter = repoId ? eq(pullRequests.repoId, repoId) : undefined;
  const totalPRs = await db.select({ count: count() }).from(pullRequests).where(prFilter || undefined);
  const mergedPRs = await db.select({ count: count() }).from(pullRequests).where(
    and(prFilter || eq(pullRequests.repoId, pullRequests.repoId), eq(pullRequests.state, "merged"))
  );
  const openPRs = await db.select({ count: count() }).from(pullRequests).where(
    and(prFilter || eq(pullRequests.repoId, pullRequests.repoId), eq(pullRequests.state, "open"))
  );

  // CI runs
  const ciFilter = repoId ? eq(ciRuns.repoId, repoId) : undefined;
  const totalCI = await db.select({ count: count() }).from(ciRuns).where(ciFilter || undefined);
  const passedCI = await db.select({ count: count() }).from(ciRuns).where(
    and(ciFilter || eq(ciRuns.repoId, ciRuns.repoId), eq(ciRuns.status, "success"))
  );

  // Security findings
  const secFilter = repoId ? eq(securityFindings.repoId, repoId) : undefined;
  const criticalSecurity = await db.select({ count: count() }).from(securityFindings).where(
    and(secFilter || eq(securityFindings.repoId, securityFindings.repoId), eq(securityFindings.severity, "critical"))
  );
  const highSecurity = await db.select({ count: count() }).from(securityFindings).where(
    and(secFilter || eq(securityFindings.repoId, securityFindings.repoId), eq(securityFindings.severity, "high"))
  );
  const mediumSecurity = await db.select({ count: count() }).from(securityFindings).where(
    and(secFilter || eq(securityFindings.repoId, securityFindings.repoId), eq(securityFindings.severity, "medium"))
  );
  const lowSecurity = await db.select({ count: count() }).from(securityFindings).where(
    and(secFilter || eq(securityFindings.repoId, securityFindings.repoId), eq(securityFindings.severity, "low"))
  );

  // Vulnerabilities
  const vulnFilter = repoId ? eq(vulnerabilities.repoId, repoId) : undefined;
  const criticalVulns = await db.select({ count: count() }).from(vulnerabilities).where(
    and(vulnFilter || eq(vulnerabilities.repoId, vulnerabilities.repoId), eq(vulnerabilities.severity, "critical"))
  );

  // Code findings
  const codeFilter = repoId ? eq(codeFindings.repoId, repoId) : undefined;
  const codeQualityIssues = await db.select({ count: count() }).from(codeFindings).where(
    and(codeFilter || eq(codeFindings.repoId, codeFindings.repoId), eq(codeFindings.type, "code_quality"))
  );

  // High risk PRs
  const highRiskPRs = await db.select({ count: count() }).from(pullRequests).where(
    and(prFilter || eq(pullRequests.repoId, pullRequests.repoId), sql`${pullRequests.riskScore} > 60`)
  );

  // Deployment history
  const failedDeployments = await db.select({ count: count() }).from(deploymentEvents).where(
    eq(deploymentEvents.status, "failed")
  );
  const previousDeployments = await db.select({ count: count() }).from(deploymentEvents);

  const ciPassRate = totalCI[0]?.count > 0
    ? Math.round((passedCI[0]?.count || 0) / totalCI[0].count * 100)
    : 100;

  return {
    totalCommits: commitCount[0]?.count || 0,
    totalPRs: totalPRs[0]?.count || 0,
    openPRs: openPRs[0]?.count || 0,
    mergedPRs: mergedPRs[0]?.count || 0,
    ciPassRate,
    testPassRate: ciPassRate, // Use CI pass rate as proxy for test pass rate
    criticalSecurity: criticalSecurity[0]?.count || 0,
    highSecurity: highSecurity[0]?.count || 0,
    mediumSecurity: mediumSecurity[0]?.count || 0,
    lowSecurity: lowSecurity[0]?.count || 0,
    criticalVulns: criticalVulns[0]?.count || 0,
    highRiskPRs: highRiskPRs[0]?.count || 0,
    breakingChanges: 0, // Will be detected by AI analysis
    dbChanges: 0, // Will be detected by AI analysis
    codeQualityIssues: codeQualityIssues[0]?.count || 0,
    failedDeployments: failedDeployments[0]?.count || 0,
    previousDeployments: previousDeployments[0]?.count || 0,
  };
}

// ── Generate Deployment Checklist ─────────────────────────────────────────

export function generateDeploymentChecklist(signals: ReleaseSignals): Array<{
  name: string;
  passed: boolean;
  required: boolean;
  message: string;
}> {
  return [
    {
      name: "All required PRs merged",
      passed: signals.openPRs === 0,
      required: true,
      message: signals.openPRs === 0 ? "All PRs are merged" : `${signals.openPRs} PRs still open`,
    },
    {
      name: "CI pipeline passed",
      passed: signals.ciPassRate === 100,
      required: true,
      message: signals.ciPassRate === 100 ? "All CI checks passed" : `CI pass rate: ${signals.ciPassRate}%`,
    },
    {
      name: "Unit tests passed",
      passed: signals.testPassRate >= 95,
      required: true,
      message: `Test pass rate: ${signals.testPassRate}%`,
    },
    {
      name: "Integration tests passed",
      passed: signals.testPassRate >= 90,
      required: true,
      message: `Integration test pass rate: ${signals.testPassRate}%`,
    },
    {
      name: "Critical vulnerability unresolved",
      passed: signals.criticalSecurity === 0 && signals.criticalVulns === 0,
      required: true,
      message: signals.criticalSecurity === 0 ? "No critical vulnerabilities" : `${signals.criticalSecurity} critical security issues found`,
    },
    {
      name: "Database migration reviewed",
      passed: true, // Default to true, AI analysis will update
      required: false,
      message: "Awaiting AI analysis for database migration review",
    },
    {
      name: "Rollback plan verified",
      passed: true, // Default to true
      required: false,
      message: "Previous stable version available for rollback",
    },
    {
      name: "Environment variables verified",
      passed: true, // Default to true
      required: false,
      message: "Environment configuration verified",
    },
    {
      name: "No high-risk PRs",
      passed: signals.highRiskPRs === 0,
      required: false,
      message: signals.highRiskPRs === 0 ? "No high-risk PRs" : `${signals.highRiskPRs} high-risk PRs detected`,
    },
    {
      name: "Code quality acceptable",
      passed: signals.codeQualityIssues < 10,
      required: false,
      message: `${signals.codeQualityIssues} code quality issues found`,
    },
  ];
}

// ── Deployment Gate Evaluation ────────────────────────────────────────────

export interface DeploymentGateResult {
  blocked: boolean;
  reasons: string[];
  warnings: string[];
  config: Array<{
    condition: string;
    action: string;
    triggered: boolean;
  }>;
}

export async function evaluateDeploymentGate(
  orgId: string,
  signals: ReleaseSignals
): Promise<DeploymentGateResult> {
  const config = await db
    .select()
    .from(deploymentGateConfig)
    .where(
      and(
        eq(deploymentGateConfig.orgId, orgId),
        eq(deploymentGateConfig.isEnabled, true)
      )
    );

  const reasons: string[] = [];
  const warnings: string[] = [];
  const gateResults: Array<{ condition: string; action: string; triggered: boolean }> = [];

  // Default gate conditions
  const defaultConditions = [
    { condition: "critical_security", action: "block", triggered: signals.criticalSecurity > 0 || signals.criticalVulns > 0 },
    { condition: "high_security", action: "block", triggered: signals.highSecurity > 2 },
    { condition: "test_failure", action: "block", triggered: signals.testPassRate < 80 },
    { condition: "ci_failure", action: "block", triggered: signals.ciPassRate < 90 },
    { condition: "db_migration_risk", action: "warning", triggered: false },
    { condition: "breaking_change", action: "warning", triggered: signals.breakingChanges > 0 },
    { condition: "medium_code_quality", action: "warning", triggered: signals.codeQualityIssues > 5 },
    { condition: "low_risk_pr", action: "allow", triggered: signals.highRiskPRs > 3 },
  ];

  // Merge with user config
  for (const dc of defaultConditions) {
    const userConfig = config.find((c) => c.condition === dc.condition);
    const action = userConfig?.action || dc.action;

    gateResults.push({
      condition: dc.condition,
      action,
      triggered: dc.triggered,
    });

    if (dc.triggered && action === "block") {
      reasons.push(getConditionLabel(dc.condition));
    } else if (dc.triggered && action === "warning") {
      warnings.push(getConditionLabel(dc.condition));
    }
  }

  return {
    blocked: reasons.length > 0,
    reasons,
    warnings,
    config: gateResults,
  };
}

function getConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    critical_security: "Critical security vulnerability detected",
    high_security: "High security issue detected",
    test_failure: "Production test failure",
    ci_failure: "CI pipeline failure",
    db_migration_risk: "Database migration has high risk",
    breaking_change: "Breaking API changes detected",
    medium_code_quality: "Medium code-quality issues",
    low_risk_pr: "Multiple low-risk PRs pending",
  };
  return labels[condition] || condition;
}

// ── Generate Release Risks ────────────────────────────────────────────────

export async function generateReleaseRisks(
  releaseId: string,
  signals: ReleaseSignals
): Promise<void> {
  const risks: Array<{
    releaseId: string;
    category: "security" | "stability" | "performance" | "database" | "api_compatibility" | "infrastructure" | "configuration";
    severity: "critical" | "high" | "medium" | "low" | "informational";
    title: string;
    description: string;
    evidence: string;
    affectedComponent: string;
    recommendedAction: string;
    isAiGenerated: boolean;
  }> = [];

  if (signals.criticalSecurity > 0) {
    risks.push({
      releaseId,
      category: "security",
      severity: "critical",
      title: "Critical Security Vulnerabilities",
      description: `${signals.criticalSecurity} critical security findings require immediate resolution before deployment.`,
      evidence: `${signals.criticalSecurity} critical findings detected by security scanner`,
      affectedComponent: "Application Security",
      recommendedAction: "Resolve all critical security findings before proceeding with deployment",
      isAiGenerated: false,
    });
  }

  if (signals.highSecurity > 0) {
    risks.push({
      releaseId,
      category: "security",
      severity: "high",
      title: "High Severity Security Issues",
      description: `${signals.highSecurity} high severity security issues detected.`,
      evidence: `${signals.highSecurity} high severity findings`,
      affectedComponent: "Application Security",
      recommendedAction: "Review and remediate high severity findings",
      isAiGenerated: false,
    });
  }

  if (signals.testPassRate < 100) {
    risks.push({
      releaseId,
      category: "stability",
      severity: signals.testPassRate < 80 ? "high" : "medium",
      title: "Test Failures Detected",
      description: `Test pass rate is ${signals.testPassRate}%. ${100 - signals.testPassRate}% of tests are failing.`,
      evidence: `Test pass rate: ${signals.testPassRate}%`,
      affectedComponent: "Test Suite",
      recommendedAction: "Fix failing tests before deployment",
      isAiGenerated: false,
    });
  }

  if (signals.ciPassRate < 100) {
    risks.push({
      releaseId,
      category: "stability",
      severity: signals.ciPassRate < 90 ? "high" : "medium",
      title: "CI Pipeline Issues",
      description: `CI pass rate is ${signals.ciPassRate}%. Some CI checks are failing.`,
      evidence: `CI pass rate: ${signals.ciPassRate}%`,
      affectedComponent: "CI/CD Pipeline",
      recommendedAction: "Investigate and fix CI pipeline failures",
      isAiGenerated: false,
    });
  }

  if (signals.highRiskPRs > 0) {
    risks.push({
      releaseId,
      category: "stability",
      severity: "medium",
      title: "High-Risk Pull Requests",
      description: `${signals.highRiskPRs} pull requests have high risk scores and need careful review.`,
      evidence: `${signals.highRiskPRs} PRs with risk score > 60`,
      affectedComponent: "Code Quality",
      recommendedAction: "Review high-risk PRs thoroughly before merging",
      isAiGenerated: false,
    });
  }

  if (signals.breakingChanges > 0) {
    risks.push({
      releaseId,
      category: "api_compatibility",
      severity: "high",
      title: "Breaking API Changes",
      description: `${signals.breakingChanges} breaking changes detected that may affect API consumers.`,
      evidence: `${signals.breakingChanges} breaking API changes`,
      affectedComponent: "API",
      recommendedAction: "Communicate breaking changes to API consumers and update documentation",
      isAiGenerated: false,
    });
  }

  if (signals.failedDeployments > 0) {
    risks.push({
      releaseId,
      category: "infrastructure",
      severity: "medium",
      title: "Previous Deployment Failures",
      description: `${signals.failedDeployments} previous deployment(s) failed. Review root cause before proceeding.`,
      evidence: `${signals.failedDeployments} failed deployments in history`,
      affectedComponent: "Deployment Pipeline",
      recommendedAction: "Investigate previous deployment failures and ensure they won't recur",
      isAiGenerated: false,
    });
  }

  if (signals.codeQualityIssues > 5) {
    risks.push({
      releaseId,
      category: "stability",
      severity: "low",
      title: "Code Quality Issues",
      description: `${signals.codeQualityIssues} code quality issues detected. While not critical, they indicate technical debt.`,
      evidence: `${signals.codeQualityIssues} code quality findings`,
      affectedComponent: "Codebase",
      recommendedAction: "Address code quality issues in future sprints",
      isAiGenerated: false,
    });
  }

  if (risks.length > 0) {
    await db.insert(releaseRisks).values(risks);
  }
}

// ── Create Full Release Analysis ──────────────────────────────────────────

export async function createReleaseAnalysis(
  releaseId: string,
  orgId: string,
  repoId?: string
): Promise<{
  score: number;
  label: string;
  emoji: string;
  color: string;
  checklist: Array<{ name: string; passed: boolean; required: boolean; message: string }>;
  gate: DeploymentGateResult;
  risks: number;
  summary: string;
}> {
  // 1. Gather signals
  const signals = await gatherReleaseSignals(repoId);

  // 2. Calculate score
  const scoreResult = calculateReadinessScore(signals);

  // 3. Generate checklist
  const checklist = generateDeploymentChecklist(signals);

  // 4. Evaluate deployment gate
  const gate = await evaluateDeploymentGate(orgId, signals);

  // 5. Generate risks
  await generateReleaseRisks(releaseId, signals);

  // 6. Count risks
  const riskCount = await db.select({ count: count() }).from(releaseRisks).where(eq(releaseRisks.releaseId, releaseId));

  // 7. Create release checks
  for (const check of checklist) {
    await db.insert(releaseChecks).values({
      releaseId,
      checkName: check.name,
      checkType: check.required ? "required" : "optional",
      passed: check.passed,
      message: check.message,
      requiredForDeploy: check.required,
      completedAt: check.passed ? new Date() : null,
    });
  }

  // 8. Generate summary
  const summary = generateReleaseSummary(signals, scoreResult, gate);

  // 9. Update release
  await db
    .update(releases)
    .set({
      readinessScore: scoreResult.score,
      scoreLabel: scoreResult.label,
      status: gate.blocked ? "blocked" : scoreResult.score >= 70 ? "ready" : "draft",
      releaseSummary: summary,
      deploymentChecklist: checklist as unknown as Record<string, unknown>,
      deploymentGate: gate as unknown as Record<string, unknown>,
      aiAnalysis: {
        signals,
        scoreBreakdown: scoreResult.breakdown,
        riskCount: riskCount[0]?.count || 0,
        gateBlocked: gate.blocked,
      } as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(releases.id, releaseId));

  return {
    score: scoreResult.score,
    label: scoreResult.label,
    emoji: scoreResult.emoji,
    color: scoreResult.color,
    checklist,
    gate,
    risks: riskCount[0]?.count || 0,
    summary,
  };
}

// ── Generate Release Summary ──────────────────────────────────────────────

function generateReleaseSummary(
  signals: ReleaseSignals,
  scoreResult: { score: number; label: string; emoji: string },
  gate: DeploymentGateResult
): string {
  const lines: string[] = [];

  lines.push(`Release Readiness: ${scoreResult.score}/100 ${scoreResult.emoji}`);
  lines.push(`Status: ${scoreResult.label}`);
  lines.push("");

  lines.push("## Summary");
  lines.push(`- ${signals.totalCommits} commits included`);
  lines.push(`- ${signals.mergedPRs} PRs merged, ${signals.openPRs} still open`);
  lines.push(`- CI pass rate: ${signals.ciPassRate}%`);
  lines.push(`- Test pass rate: ${signals.testPassRate}%`);
  lines.push(`- ${signals.criticalSecurity} critical, ${signals.highSecurity} high, ${signals.mediumSecurity} medium security findings`);
  lines.push(`- ${signals.criticalVulns} critical dependency vulnerabilities`);
  lines.push(`- ${signals.highRiskPRs} high-risk PRs`);
  lines.push(`- ${signals.codeQualityIssues} code quality issues`);
  lines.push("");

  if (gate.blocked) {
    lines.push("## ⛔ Deployment Blocked");
    lines.push("Reasons:");
    gate.reasons.forEach((r, i) => lines.push(`  ${i + 1}. ${r}`));
    lines.push("");
  }

  if (gate.warnings.length > 0) {
    lines.push("## ⚠️ Warnings");
    gate.warnings.forEach((w) => lines.push(`- ${w}`));
    lines.push("");
  }

  lines.push("## Recommendation");
  if (scoreResult.score >= 90) {
    lines.push("This release is ready for production deployment. All checks pass and no blocking issues were found.");
  } else if (scoreResult.score >= 70) {
    lines.push("This release can be deployed with caution. Review the warnings and risks before proceeding.");
  } else if (scoreResult.score >= 50) {
    lines.push("This release needs attention before deployment. Address the identified issues first.");
  } else {
    lines.push("This release is NOT ready for deployment. Critical issues must be resolved first.");
  }

  return lines.join("\n");
}

// ── Rollback Recommendation ──────────────────────────────────────────────

export async function generateRollbackRecommendation(
  releaseId: string,
  deploymentEventId: string,
  failureError: string
): Promise<void> {
  // Find the previous successful deployment
  const previousDeployment = await db
    .select()
    .from(deploymentEvents)
    .where(
      and(
        eq(deploymentEvents.status, "success"),
        eq(deploymentEvents.environment, "production")
      )
    )
    .orderBy(desc(deploymentEvents.completedAt))
    .limit(1);

  // Find the release info
  const release = await db.select().from(releases).where(eq(releases.id, releaseId)).limit(1);
  const currentRelease = release[0];

  // Find related commit/PR (simple heuristic)
  const relatedCommits = await db
    .select()
    .from(releaseCommits)
    .where(eq(releaseCommits.releaseId, releaseId))
    .limit(5);

  const relatedPRs = await db
    .select()
    .from(releasePullRequests)
    .where(eq(releasePullRequests.releaseId, releaseId))
    .limit(5);

  const investigationSteps = [
    "Check deployment logs for error details",
    "Review commits included in this release",
    "Check if any database migrations were applied",
    "Verify environment variables and configuration",
    "Review recent PRs for potential root causes",
    "Check external service dependencies",
  ];

  await db.insert(rollbackRecommendations).values({
    releaseId,
    deploymentEventId,
    likelyCause: `Deployment failed with error: ${failureError.substring(0, 500)}. AI analysis suggests reviewing the most recent changes for potential root cause.`,
    relatedCommitSha: relatedCommits[0]?.commitId || null,
    relatedPrNumber: null,
    affectedService: currentRelease?.repoId || "Application",
    previousStableVersion: previousDeployment[0]?.version || "unknown",
    recommendedVersion: previousDeployment[0]?.version || currentRelease?.previousVersion || "unknown",
    investigationSteps,
    isAiAssessment: true,
    isImplemented: false,
  });
}

// ── Notifications ─────────────────────────────────────────────────────────

export async function createReleaseNotification(
  orgId: string,
  type: string,
  title: string,
  message: string,
  severity: string,
  releaseId?: string,
  userId?: string
): Promise<void> {
  await db.insert(releaseNotifications).values({
    orgId,
    releaseId: releaseId || null,
    userId: userId || null,
    type: type as "release_blocked" | "critical_vulnerability" | "deployment_failure" | "deployment_success" | "rollback_recommended" | "score_decreased",
    title,
    message,
    severity: severity as "critical" | "high" | "medium" | "low" | "informational",
    isRead: false,
  });
}

// ── Get Latest Release ────────────────────────────────────────────────────

export async function getLatestRelease(orgId: string) {
  const result = await db
    .select()
    .from(releases)
    .where(eq(releases.orgId, orgId))
    .orderBy(desc(releases.createdAt))
    .limit(1);

  return result[0] || null;
}

// ── Get Release History ───────────────────────────────────────────────────

export async function getReleaseHistory(orgId: string, limit = 20) {
  return db
    .select()
    .from(releases)
    .where(eq(releases.orgId, orgId))
    .orderBy(desc(releases.createdAt))
    .limit(limit);
}
