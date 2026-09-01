import { db } from "@/lib/db";
import {
  users,
  organizations,
  organizationMembers,
  repositories,
  developers,
  projects,
  projectRepositories,
  milestones,
  tasks,
  commits,
  commitFiles,
  pullRequests,
  pullRequestReviews,
  codeFindings,
  securityFindings,
  vulnerabilities,
  ciRuns,
  alerts,
  reports,
  activityEvents,
} from "@/lib/db/schema";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

export async function seedDatabase() {
  console.log("🌱 Seeding database...");

  // ── Users ──────────────────────────────────────────────────────────────
  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@devwatch.ai",
      name: "Admin User",
      role: "super_admin",
    })
    .returning();

  // ── Organization ───────────────────────────────────────────────────────
  const [org] = await db
    .insert(organizations)
    .values({
      name: "Acme Engineering",
      slug: "acme-eng",
      description: "Acme Corp Engineering Division",
      githubOrg: "acme-corp",
      ownerId: admin.id,
    })
    .returning();

  await db.insert(organizationMembers).values({
    orgId: org.id,
    userId: admin.id,
    role: "super_admin",
  });

  // ── Repositories ───────────────────────────────────────────────────────
  const repoData = [
    { githubId: "1", name: "acme-platform", fullName: "acme-corp/acme-platform", description: "Main platform application" },
    { githubId: "2", name: "acme-api", fullName: "acme-corp/acme-api", description: "REST API service" },
    { githubId: "3", name: "acme-mobile", fullName: "acme-corp/acme-mobile", description: "React Native mobile app" },
    { githubId: "4", name: "acme-infra", fullName: "acme-corp/acme-infra", description: "Infrastructure as Code" },
    { githubId: "5", name: "acme-docs", fullName: "acme-corp/acme-docs", description: "Documentation site" },
  ];

  const repos = [];
  for (const rd of repoData) {
    const [repo] = await db
      .insert(repositories)
      .values({
        orgId: org.id,
        ...rd,
        isPrivate: true,
        defaultBranch: "main",
      })
      .returning();
    repos.push(repo);
  }

  // ── Developers ─────────────────────────────────────────────────────────
  const devData = [
    { githubUsername: "sarah-chen", name: "Sarah Chen", email: "sarah@acme.com" },
    { githubUsername: "marcus-johnson", name: "Marcus Johnson", email: "marcus@acme.com" },
    { githubUsername: "priya-patel", name: "Priya Patel", email: "priya@acme.com" },
    { githubUsername: "alex-rodriguez", name: "Alex Rodriguez", email: "alex@acme.com" },
    { githubUsername: "jordan-kim", name: "Jordan Kim", email: "jordan@acme.com" },
    { githubUsername: "emma-wilson", name: "Emma Wilson", email: "emma@acme.com" },
    { githubUsername: "david-brown", name: "David Brown", email: "david@acme.com" },
    { githubUsername: "lisa-nguyen", name: "Lisa Nguyen", email: "lisa@acme.com" },
  ];

  const devs = [];
  for (const dd of devData) {
    const [dev] = await db
      .insert(developers)
      .values({
        orgId: org.id,
        ...dd,
        avatarUrl: `https://avatars.githubusercontent.com/${dd.githubUsername}`,
      })
      .returning();
    devs.push(dev);
  }

  // ── Projects ───────────────────────────────────────────────────────────
  const [proj1] = await db
    .insert(projects)
    .values({
      orgId: org.id,
      name: "Platform v2.0",
      description: "Major platform upgrade with new features",
      status: "active",
      progress: 72,
      leadId: devs[0].id,
      startDate: daysAgo(60),
      deadline: daysAgo(-30),
    })
    .returning();

  const [proj2] = await db
    .insert(projects)
    .values({
      orgId: org.id,
      name: "API Redesign",
      description: "REST to GraphQL migration",
      status: "active",
      progress: 45,
      leadId: devs[1].id,
      startDate: daysAgo(30),
      deadline: daysAgo(-60),
    })
    .returning();

  const [proj3] = await db
    .insert(projects)
    .values({
      orgId: org.id,
      name: "Mobile App Launch",
      description: "React Native mobile application",
      status: "active",
      progress: 28,
      leadId: devs[2].id,
      startDate: daysAgo(15),
      deadline: daysAgo(-90),
    })
    .returning();

  // Link repos to projects
  await db.insert(projectRepositories).values([
    { projectId: proj1.id, repoId: repos[0].id },
    { projectId: proj2.id, repoId: repos[1].id },
    { projectId: proj3.id, repoId: repos[2].id },
  ]);

  // ── Milestones ─────────────────────────────────────────────────────────
  const [ms1] = await db
    .insert(milestones)
    .values({
      projectId: proj1.id,
      title: "Authentication System",
      dueDate: daysAgo(-14),
      status: "completed",
      progress: 100,
    })
    .returning();

  const [ms2] = await db
    .insert(milestones)
    .values({
      projectId: proj1.id,
      title: "Dashboard Revamp",
      dueDate: daysAgo(-7),
      status: "open",
      progress: 65,
    })
    .returning();

  await db.insert(milestones).values({
    projectId: proj2.id,
    title: "GraphQL Schema Design",
    dueDate: daysAgo(-21),
    status: "open",
    progress: 30,
  });

  // ── Tasks ──────────────────────────────────────────────────────────────
  const taskData = [
    { projectId: proj1.id, milestoneId: ms2.id, title: "Redesign dashboard layout", type: "feature" as const, status: "done" as const, assigneeId: devs[0].id, priority: 1 },
    { projectId: proj1.id, milestoneId: ms2.id, title: "Add dark mode toggle", type: "feature" as const, status: "in_progress" as const, assigneeId: devs[3].id, priority: 2 },
    { projectId: proj1.id, milestoneId: ms2.id, title: "Fix chart rendering bug", type: "bug" as const, status: "in_review" as const, assigneeId: devs[4].id, priority: 0 },
    { projectId: proj1.id, title: "Performance optimization", type: "task" as const, status: "todo" as const, assigneeId: devs[5].id, priority: 3 },
    { projectId: proj2.id, title: "Design GraphQL schema", type: "feature" as const, status: "in_progress" as const, assigneeId: devs[1].id, priority: 0 },
    { projectId: proj2.id, title: "Implement resolver layer", type: "feature" as const, status: "todo" as const, assigneeId: devs[6].id, priority: 1 },
    { projectId: proj2.id, title: "Add rate limiting", type: "task" as const, status: "backlog" as const, priority: 2 },
    { projectId: proj3.id, title: "Set up React Native project", type: "feature" as const, status: "done" as const, assigneeId: devs[2].id, priority: 0 },
    { projectId: proj3.id, title: "Implement auth flow", type: "feature" as const, status: "in_progress" as const, assigneeId: devs[7].id, priority: 1 },
    { projectId: proj3.id, title: "Fix iOS build issue", type: "bug" as const, status: "in_progress" as const, assigneeId: devs[2].id, priority: 0 },
  ];

  for (const td of taskData) {
    await db.insert(tasks).values(td);
  }

  // ── Commits ────────────────────────────────────────────────────────────
  const commitMessages = [
    "feat(auth): implement OAuth2 flow with refresh tokens",
    "fix(dashboard): resolve chart rendering on Safari",
    "feat(api): add GraphQL query batching",
    "refactor(db): optimize query performance for dashboard",
    "feat(mobile): implement push notifications",
    "fix(security): patch XSS vulnerability in user input",
    "docs: update API documentation for v2 endpoints",
    "feat(ui): add dark mode support with system preference",
    "test(auth): add integration tests for OAuth flow",
    "fix(ci): resolve flaky e2e test in auth module",
    "feat(search): implement full-text search with Elasticsearch",
    "perf(api): add Redis caching layer for hot endpoints",
    "fix(mobile): resolve memory leak in image gallery",
    "feat(dashboard): add real-time notifications",
    "refactor(api): migrate REST endpoints to GraphQL",
    "fix(security): update vulnerable dependencies",
    "feat(devops): add Terraform modules for AWS deployment",
    "feat(auth): add two-factor authentication support",
    "fix(ui): resolve responsive layout issues on tablets",
    "feat(api): implement webhook retry mechanism",
  ];

  const branches = ["main", "feat/auth", "feat/dashboard", "fix/security", "feat/api", "feat/mobile", "fix/ios-build"];
  const commitsList = [];

  for (let i = 0; i < 20; i++) {
    const dev = devs[i % devs.length];
    const repo = repos[i % repos.length];
    const additions = Math.floor(Math.random() * 500) + 10;
    const deletions = Math.floor(Math.random() * 200);
    const [commit] = await db
      .insert(commits)
      .values({
        repoId: repo.id,
        developerId: dev.id,
        sha: `abc${String(i).padStart(2, "0")}${Math.random().toString(36).substring(2, 8)}`,
        message: commitMessages[i],
        branch: branches[i % branches.length],
        authorName: dev.name,
        authorEmail: dev.email,
        additions,
        deletions,
        filesChanged: Math.floor(Math.random() * 15) + 1,
        verified: Math.random() > 0.2,
        committedAt: daysAgo(Math.floor(i / 3)),
        createdAt: daysAgo(Math.floor(i / 3)),
      })
      .returning();
    commitsList.push(commit);
  }

  // ── Pull Requests ──────────────────────────────────────────────────────
  const prTitles = [
    { title: "Implement OAuth2 authentication flow", state: "merged" as const },
    { title: "Add dark mode support", state: "merged" as const },
    { title: "Fix XSS vulnerability in search", state: "merged" as const },
    { title: "Migrate API to GraphQL", state: "open" as const, riskScore: 72 },
    { title: "Add push notifications for mobile", state: "open" as const, riskScore: 45 },
    { title: "Optimize dashboard query performance", state: "merged" as const },
    { title: "Fix memory leak in image gallery", state: "open" as const, riskScore: 35 },
    { title: "Implement full-text search", state: "open" as const, riskScore: 58 },
    { title: "Add 2FA support", state: "open" as const, riskScore: 65 },
    { title: "Update CI pipeline configuration", state: "closed" as const },
  ];

  const prList = [];
  for (let i = 0; i < prTitles.length; i++) {
    const dev = devs[i % devs.length];
    const repo = repos[i % repos.length];
    const prData = prTitles[i];
    const [pr] = await db
      .insert(pullRequests)
      .values({
        repoId: repo.id,
        developerId: dev.id,
        githubId: String(100 + i),
        number: 100 + i,
        title: prData.title,
        body: `Description for ${prData.title}`,
        state: prData.state,
        branch: branches[i % branches.length],
        baseBranch: "main",
        additions: Math.floor(Math.random() * 500) + 20,
        deletions: Math.floor(Math.random() * 100),
        changedFiles: Math.floor(Math.random() * 10) + 1,
        riskScore: ("riskScore" in prData ? (prData as any).riskScore : Math.floor(Math.random() * 40) + 10),
        ciStatus: Math.random() > 0.3 ? "success" : "failure",
        mergedAt: prData.state === "merged" ? daysAgo(i + 1) : null,
        closedAt: prData.state === "closed" ? daysAgo(i + 2) : null,
        createdAt: daysAgo(i + 1),
      })
      .returning();
    prList.push(pr);
  }

  // ── PR Reviews ─────────────────────────────────────────────────────────
  for (let i = 0; i < prList.length; i++) {
    const reviewer = devs[(i + 2) % devs.length];
    await db.insert(pullRequestReviews).values({
      prId: prList[i].id,
      developerId: reviewer.id,
      state: Math.random() > 0.3 ? "APPROVED" : "CHANGES_REQUESTED",
      body: "Looks good to me!",
      submittedAt: daysAgo(i),
    });
  }

  // ── Code Findings ──────────────────────────────────────────────────────
  const codeFindingData = [
    { prId: prList[3].id, repoId: repos[1].id, type: "security" as const, severity: "high" as const, file: "src/graphql/resolver.ts", line: 42, rule: "sql-injection", message: "Potential SQL injection in resolver", explanation: "User input passed directly to query builder", suggestedFix: "Use parameterized queries", confidence: 80 },
    { prId: prList[3].id, repoId: repos[1].id, type: "code_quality" as const, severity: "medium" as const, file: "src/graphql/schema.ts", line: 15, rule: "complex-function", message: "Schema definition function exceeds 200 lines", explanation: "Large monolithic schema definition", suggestedFix: "Split into modular schema files", confidence: 90 },
    { prId: prList[4].id, repoId: repos[2].id, type: "security" as const, severity: "medium" as const, file: "src/push/notify.ts", line: 28, rule: "xss-innerhtml", message: "Notification content not sanitized", explanation: "Push notification body rendered without sanitization", suggestedFix: "Sanitize all user-generated content before sending", confidence: 75 },
    { prId: prList[7].id, repoId: repos[0].id, type: "security" as const, severity: "critical" as const, file: "src/search/index.ts", line: 55, rule: "hardcoded-secret", message: "Elasticsearch credentials in source code", explanation: "API key hardcoded in search configuration", suggestedFix: "Move to environment variables", confidence: 95 },
    { prId: prList[7].id, repoId: repos[0].id, type: "code_quality" as const, severity: "low" as const, file: "src/search/utils.ts", line: 12, rule: "console-log", message: "Debug console.log left in code", explanation: "Debug logging should be removed for production", suggestedFix: "Remove or replace with proper logger", confidence: 100 },
    { prId: prList[8].id, repoId: repos[0].id, type: "security" as const, severity: "high" as const, file: "src/auth/two-factor.ts", line: 71, rule: "hardcoded-password", message: "2FA secret generator uses weak entropy", explanation: "Custom PRNG used instead of crypto module", suggestedFix: "Use crypto.randomBytes() for security-sensitive randomness", confidence: 85 },
    { prId: prList[6].id, repoId: repos[2].id, type: "code_quality" as const, severity: "medium" as const, file: "src/components/Gallery.tsx", line: 89, rule: "empty-catch", message: "Image load failure silently ignored", explanation: "Error in image loading catch block is empty", suggestedFix: "Add error state and fallback image", confidence: 90 },
  ];

  for (const fd of codeFindingData) {
    await db.insert(codeFindings).values(fd);
  }

  // ── Security Findings ──────────────────────────────────────────────────
  const secFindingData = [
    { repoId: repos[0].id, severity: "critical" as const, category: "secret_detection", file: "config/deploy.yml", description: "AWS access key found in CI configuration", recommendation: "Move to GitHub Secrets", cweId: "CWE-798" },
    { repoId: repos[1].id, severity: "high" as const, category: "dependency", file: "package.json", description: "Vulnerable version of lodash (CVE-2021-23337)", recommendation: "Update lodash to >= 4.17.21", cweId: "CWE-798" },
    { repoId: repos[0].id, severity: "high" as const, category: "sast", file: "src/auth/login.ts", description: "Authentication bypass possible via missing session validation", recommendation: "Add session token validation on all protected routes", cweId: "CWE-287" },
    { repoId: repos[1].id, severity: "medium" as const, category: "sast", file: "src/api/users.ts", description: "User data exposed in error responses", recommendation: "Sanitize error messages to avoid leaking user data", cweId: "CWE-200" },
    { repoId: repos[2].id, severity: "medium" as const, category: "sast", file: "src/storage/FileHandler.ts", description: "Unrestricted file upload without type validation", recommendation: "Validate file types and implement size limits", cweId: "CWE-434" },
    { repoId: repos[3].id, severity: "low" as const, category: "configuration", file: "terraform/main.tf", description: "S3 bucket publicly accessible", recommendation: "Set bucket ACL to private and enable encryption", cweId: "CWE-538" },
    { repoId: repos[0].id, severity: "informational" as const, category: "best_practice", file: ".env.example", description: "Example file contains placeholder secrets that look real", recommendation: "Use clearly fake placeholder values", cweId: "" },
  ];

  for (const fd of secFindingData) {
    await db.insert(securityFindings).values(fd);
  }

  // ── Vulnerabilities ────────────────────────────────────────────────────
  const vulnData = [
    { repoId: repos[0].id, package: "lodash", version: "4.17.19", severity: "high" as const, title: "Prototype Pollution in lodash", cveId: "CVE-2021-23337", patchedVersion: "4.17.21" },
    { repoId: repos[1].id, package: "axios", version: "0.20.0", severity: "high" as const, title: "Server-Side Request Forgery in axios", cveId: "CVE-2021-3749", patchedVersion: "0.21.1" },
    { repoId: repos[0].id, package: "express", version: "4.17.1", severity: "medium" as const, title: "Open Redirect in Express", cveId: "CVE-2022-24999", patchedVersion: "4.18.2" },
    { repoId: repos[2].id, package: "react-native-fetch-blob", version: "0.10.8", severity: "high" as const, title: "Path Traversal vulnerability", cveId: "CVE-2019-10780", patchedVersion: "0.10.9" },
    { repoId: repos[3].id, package: "terraform-aws-modules", version: "1.0.0", severity: "medium" as const, title: "Insecure default S3 configuration", cveId: "", patchedVersion: "1.2.0" },
  ];

  for (const vd of vulnData) {
    await db.insert(vulnerabilities).values(vd);
  }

  // ── CI Runs ────────────────────────────────────────────────────────────
  for (let i = 0; i < 15; i++) {
    const repo = repos[i % repos.length];
    const statuses = ["success", "success", "success", "failure", "success"];
    const status = statuses[i % statuses.length];
    await db.insert(ciRuns).values({
      repoId: repo.id,
      prId: i < prList.length ? prList[i].id : null,
      commitId: i < commitsList.length ? commitsList[i].id : null,
      name: `CI Pipeline #${100 + i}`,
      branch: branches[i % branches.length],
      status: status as any,
      conclusion: status,
      url: `https://github.com/${repo.fullName}/actions/runs/${1000 + i}`,
      startedAt: hoursAgo(i * 4 + 2),
      completedAt: hoursAgo(i * 4),
    });
  }

  // ── Alerts ─────────────────────────────────────────────────────────────
  const alertData = [
    { orgId: org.id, type: "critical_security" as const, title: "Critical Security Vulnerability Detected", message: "AWS access key found in CI configuration for acme-platform", severity: "critical" as const, repoId: repos[0].id, isRead: false },
    { orgId: org.id, type: "high_risk_pr" as const, title: "High-Risk PR Opened", message: "PR #103 'Migrate API to GraphQL' has a risk score of 72", severity: "high" as const, prId: prList[3].id, isRead: false },
    { orgId: org.id, type: "secret_detected" as const, title: "Secret Detected in Commit", message: "Elasticsearch credentials found in src/search/index.ts", severity: "critical" as const, prId: prList[7].id, isRead: false },
    { orgId: org.id, type: "ci_failure" as const, title: "CI Pipeline Failing", message: "CI Pipeline #103 failed on feat/api branch", severity: "medium" as const, repoId: repos[1].id, isRead: true },
    { orgId: org.id, type: "pr_stale" as const, title: "PR Awaiting Review", message: "PR #108 'Add 2FA support' has been waiting for review for 3 days", severity: "medium" as const, prId: prList[8].id, isRead: false },
    { orgId: org.id, type: "milestone_at_risk" as const, title: "Milestone at Risk", message: "Dashboard Revamp milestone is 65% complete with 7 days to deadline", severity: "high" as const, isRead: false },
    { orgId: org.id, type: "dependency_vulnerability" as const, title: "Vulnerable Dependencies", message: "5 known vulnerabilities found across repositories", severity: "medium" as const, isRead: false },
    { orgId: org.id, type: "info" as const, title: "Weekly Report Available", message: "Your weekly engineering report for Week 34 is ready", severity: "informational" as const, isRead: true },
  ];

  for (const ad of alertData) {
    await db.insert(alerts).values(ad);
  }

  // ── Reports ────────────────────────────────────────────────────────────
  await db.insert(reports).values({
    orgId: org.id,
    frequency: "weekly",
    title: "Engineering Report - Week 34",
    summary: "Strong week with 45 commits, 8 PRs merged. 2 critical security issues flagged.",
    content: `# Engineering Report - Week 34

## Team Activity
- 45 commits across 5 repositories
- 8 PRs merged, 3 still open
- 12 code reviews completed
- CI/CD success rate: 87%

## Security
- 2 critical vulnerabilities identified
- 5 dependency vulnerabilities
- 1 secret detection event

## Project Progress
- Platform v2.0: 72% complete
- API Redesign: 45% complete
- Mobile App: 28% complete

## Key Changes
1. OAuth2 authentication flow implemented
2. GraphQL API migration started
3. Dark mode support added
4. XSS vulnerability patched

## Recommendations
1. Address critical security findings immediately
2. Review high-risk GraphQL migration PR
3. Focus on Dashboard Revamp milestone`,
    periodStart: daysAgo(7),
    periodEnd: new Date(),
  });

  console.log("✅ Database seeded successfully!");
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
