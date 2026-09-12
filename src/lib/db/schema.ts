import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", [
  "super_admin",
  "admin",
  "viewer",
  "readonly",
]);

export const prStatusEnum = pgEnum("pr_status", [
  "open",
  "closed",
  "merged",
  "draft",
]);

export const ciStatusEnum = pgEnum("ci_status", [
  "pending",
  "running",
  "success",
  "failure",
  "cancelled",
]);

export const severityEnum = pgEnum("severity", [
  "critical",
  "high",
  "medium",
  "low",
  "informational",
]);

export const findingTypeEnum = pgEnum("finding_type", [
  "security",
  "code_quality",
  "performance",
  "dependency",
  "vulnerability",
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "critical_security",
  "high_risk_pr",
  "secret_detected",
  "ci_failure",
  "pr_stale",
  "milestone_at_risk",
  "dependency_vulnerability",
  "info",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
]);

export const taskTypeEnum = pgEnum("task_type", [
  "feature",
  "bug",
  "task",
  "epic",
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "open",
  "completed",
  "cancelled",
]);

export const reportFrequencyEnum = pgEnum("report_frequency", [
  "daily",
  "weekly",
  "monthly",
]);

export const releaseStatusEnum = pgEnum("release_status", [
  "draft",
  "ready",
  "blocked",
  "deploying",
  "deployed",
  "failed",
  "rolled_back",
]);

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "pending",
  "in_progress",
  "success",
  "failed",
  "cancelled",
  "rolled_back",
]);

export const deploymentEnvironmentEnum = pgEnum("deployment_environment", [
  "development",
  "staging",
  "production",
]);

export const deploymentProviderEnum = pgEnum("deployment_provider", [
  "github_actions",
  "vercel",
  "aws",
  "docker",
  "kubernetes",
  "other",
]);

export const riskCategoryEnum = pgEnum("risk_category", [
  "security",
  "stability",
  "performance",
  "database",
  "api_compatibility",
  "infrastructure",
  "configuration",
]);

export const deploymentGateConditionEnum = pgEnum("gate_condition", [
  "critical_security",
  "high_security",
  "test_failure",
  "ci_failure",
  "db_migration_risk",
  "breaking_change",
  "medium_code_quality",
  "low_risk_pr",
]);

export const releaseNotificationTypeEnum = pgEnum("release_notification_type", [
  "release_blocked",
  "critical_vulnerability",
  "deployment_failure",
  "deployment_success",
  "rollback_recommended",
  "score_decreased",
]);

// ── Users & Auth ───────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    image: text("image"),
    passwordHash: text("password_hash"),
    role: roleEnum("role").default("viewer").notNull(),
    githubId: text("github_id").unique(),
    githubToken: text("github_token"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_github_id_idx").on(table.githubId),
  ]
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// ── Organizations ──────────────────────────────────────────────────────────

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    githubOrg: text("github_org"),
    logoUrl: text("logo_url"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("organizations_slug_idx").on(table.slug)]
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").default("viewer").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("org_members_unique").on(table.orgId, table.userId),
  ]
);

// ── Repositories ───────────────────────────────────────────────────────────

export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    githubId: text("github_id").notNull().unique(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    description: text("description"),
    defaultBranch: text("default_branch").default("main"),
    isPrivate: boolean("is_private").default(false),
    webhookId: integer("webhook_id"),
    isActive: boolean("is_active").default(true),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("repos_org_idx").on(table.orgId),
    index("repos_github_id_idx").on(table.githubId),
  ]
);

// ── Developers ─────────────────────────────────────────────────────────────

export const developers = pgTable(
  "developers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    githubId: text("github_id"),
    githubUsername: text("github_username").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    email: text("email"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("devs_org_idx").on(table.orgId),
    index("devs_github_username_idx").on(table.githubUsername),
  ]
);

// ── Projects ───────────────────────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").default("active"),
    progress: integer("progress").default(0),
    startDate: timestamp("start_date"),
    deadline: timestamp("deadline"),
    leadId: uuid("lead_id").references(() => developers.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("projects_org_idx").on(table.orgId)]
);

export const projectRepositories = pgTable(
  "project_repositories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("project_repo_unique").on(table.projectId, table.repoId),
  ]
);

// ── Milestones ─────────────────────────────────────────────────────────────

export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: timestamp("due_date"),
    status: milestoneStatusEnum("status").default("open").notNull(),
    progress: integer("progress").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("milestones_project_idx").on(table.projectId)]
);

// ── Tasks ──────────────────────────────────────────────────────────────────

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    milestoneId: uuid("milestone_id").references(() => milestones.id),
    title: text("title").notNull(),
    description: text("description"),
    type: taskTypeEnum("type").default("task").notNull(),
    status: taskStatusEnum("status").default("backlog").notNull(),
    assigneeId: uuid("assignee_id").references(() => developers.id),
    priority: integer("priority").default(0),
    dueDate: timestamp("due_date"),
    parentTaskId: uuid("parent_task_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tasks_project_idx").on(table.projectId),
    index("tasks_status_idx").on(table.status),
    index("tasks_assignee_idx").on(table.assigneeId),
  ]
);

// ── Commits ────────────────────────────────────────────────────────────────

export const commits = pgTable(
  "commits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    developerId: uuid("developer_id").references(() => developers.id),
    sha: text("sha").notNull(),
    message: text("message"),
    branch: text("branch"),
    authorName: text("author_name"),
    authorEmail: text("author_email"),
    additions: integer("additions").default(0),
    deletions: integer("deletions").default(0),
    filesChanged: integer("files_changed").default(0),
    verified: boolean("verified").default(false),
    webhookEventId: text("webhook_event_id"),
    committedAt: timestamp("committed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("commits_repo_idx").on(table.repoId),
    index("commits_developer_idx").on(table.developerId),
    index("commits_sha_idx").on(table.sha),
    index("commits_committed_at_idx").on(table.committedAt),
    uniqueIndex("commits_sha_repo_unique").on(table.sha, table.repoId),
  ]
);

export const commitFiles = pgTable(
  "commit_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commitId: uuid("commit_id")
      .notNull()
      .references(() => commits.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    status: text("status"),
    additions: integer("additions").default(0),
    deletions: integer("deletions").default(0),
    patch: text("patch"),
  },
  (table) => [index("commit_files_commit_idx").on(table.commitId)]
);

// ── Pull Requests ──────────────────────────────────────────────────────────

export const pullRequests = pgTable(
  "pull_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    developerId: uuid("developer_id").references(() => developers.id),
    githubId: text("github_id").notNull().unique(),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    state: prStatusEnum("state").default("open").notNull(),
    branch: text("branch"),
    baseBranch: text("base_branch").default("main"),
    additions: integer("additions").default(0),
    deletions: integer("deletions").default(0),
    changedFiles: integer("changed_files").default(0),
    riskScore: integer("risk_score"),
    ciStatus: ciStatusEnum("ci_status"),
    mergedAt: timestamp("merged_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("prs_repo_idx").on(table.repoId),
    index("prs_developer_idx").on(table.developerId),
    index("prs_state_idx").on(table.state),
    index("prs_number_idx").on(table.number),
  ]
);

export const pullRequestReviews = pgTable(
  "pull_request_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    prId: uuid("pr_id")
      .notNull()
      .references(() => pullRequests.id, { onDelete: "cascade" }),
    developerId: uuid("developer_id").references(() => developers.id),
    githubId: text("github_id"),
    state: text("state").notNull(),
    body: text("body"),
    submittedAt: timestamp("submitted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("pr_reviews_pr_idx").on(table.prId),
    index("pr_reviews_developer_idx").on(table.developerId),
  ]
);

// ── Code & Security Findings ───────────────────────────────────────────────

export const codeFindings = pgTable(
  "code_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    prId: uuid("pr_id").references(() => pullRequests.id, {
      onDelete: "cascade",
    }),
    commitId: uuid("commit_id").references(() => commits.id, {
      onDelete: "cascade",
    }),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    type: findingTypeEnum("type").notNull(),
    severity: severityEnum("severity").notNull(),
    file: text("file"),
    line: integer("line"),
    column: integer("column"),
    rule: text("rule"),
    message: text("message").notNull(),
    explanation: text("explanation"),
    suggestedFix: text("suggested_fix"),
    confidence: integer("confidence"),
    source: text("source").default("ai"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("findings_pr_idx").on(table.prId),
    index("findings_repo_idx").on(table.repoId),
    index("findings_severity_idx").on(table.severity),
    index("findings_type_idx").on(table.type),
  ]
);

// ── AI Security Agent enums ────────────────────────────────────────────────

export const agentVerdictEnum = pgEnum("agent_verdict", [
  "confirmed",
  "likely",
  "potential",
  "false_positive",
]);

export const agentFindingStatusEnum = pgEnum("agent_finding_status", [
  "queued",
  "investigating",
  "validation_required",
  "validating",
  "confirmed",
  "false_positive",
  "remediation_ready",
  "fixed",
  "verified",
]);

export const agentRunKindEnum = pgEnum("agent_run_kind", [
  "scan",
  "investigate",
  "validate",
  "remediate",
  "verify",
  "full",
]);

export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const agentValidationStatusEnum = pgEnum("agent_validation_status", [
  "pending",
  "running",
  "exploitable",
  "not_exploitable",
  "inconclusive",
  "failed",
  "skipped",
]);

export const agentPatchStatusEnum = pgEnum("agent_patch_status", [
  "proposed",
  "applied",
  "discarded",
]);

export const agentVerificationStatusEnum = pgEnum("agent_verification_status", [
  "pending",
  "running",
  "fixed",
  "still_vulnerable",
  "inconclusive",
  "failed",
]);

export const agentAuthScopeEnum = pgEnum("agent_auth_scope", [
  "none",
  "user",
  "explicit",
  "system",
]);

export const securityFindings = pgTable(
  "security_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    commitId: uuid("commit_id").references(() => commits.id),
    prId: uuid("pr_id").references(() => pullRequests.id),
    severity: severityEnum("severity").notNull(),
    category: text("category"),
    file: text("file"),
    line: integer("line"),
    description: text("description").notNull(),
    recommendation: text("recommendation"),
    cweId: text("cwe_id"),
    cvssScore: integer("cvss_score"),
    source: text("source").default("scanner"),
    // ── AI Security Agent extension ──
    orgId: uuid("org_id"),
    runId: uuid("run_id"),
    ruleId: text("rule_id"),
    cveId: text("cve_id"),
    lineEnd: integer("line_end"),
    snippet: text("snippet"),
    rootCause: text("root_cause"),
    evidence: jsonb("evidence"),
    impact: text("impact"),
    attackPath: jsonb("attack_path"),
    components: jsonb("components"),
    verdict: agentVerdictEnum("verdict"),
    verdictReason: text("verdict_reason"),
    aiAnalysis: text("ai_analysis"),
    agentStatus: agentFindingStatusEnum("agent_status").default("queued"),
    confidence: integer("confidence"),
    fingerprint: text("fingerprint"),
    fixedAt: timestamp("fixed_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sec_findings_repo_idx").on(table.repoId),
    index("sec_findings_severity_idx").on(table.severity),
    index("sec_findings_agent_status_idx").on(table.agentStatus),
    index("sec_findings_run_idx").on(table.runId),
    index("sec_findings_fingerprint_idx").on(table.fingerprint),
  ]
);

export const vulnerabilities = pgTable(
  "vulnerabilities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    package: text("package").notNull(),
    version: text("version"),
    severity: severityEnum("severity").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    advisoryUrl: text("advisory_url"),
    cveId: text("cve_id"),
    patchedVersion: text("patched_version"),
    isDirect: boolean("is_direct").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("vulns_repo_idx").on(table.repoId),
    index("vulns_severity_idx").on(table.severity),
  ]
);

// ── CI/CD ──────────────────────────────────────────────────────────────────

export const ciRuns = pgTable(
  "ci_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    prId: uuid("pr_id").references(() => pullRequests.id),
    commitId: uuid("commit_id").references(() => commits.id),
    githubRunId: integer("github_run_id"),
    name: text("name"),
    branch: text("branch"),
    status: ciStatusEnum("status").default("pending").notNull(),
    conclusion: text("conclusion"),
    url: text("url"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ci_runs_repo_idx").on(table.repoId),
    index("ci_runs_pr_idx").on(table.prId),
    index("ci_runs_status_idx").on(table.status),
  ]
);

// ── Alerts ─────────────────────────────────────────────────────────────────

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: alertTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    severity: severityEnum("severity").notNull(),
    repoId: uuid("repo_id").references(() => repositories.id),
    prId: uuid("pr_id").references(() => pullRequests.id),
    developerId: uuid("developer_id").references(() => developers.id),
    isRead: boolean("is_read").default(false),
    isDismissed: boolean("is_dismissed").default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("alerts_org_idx").on(table.orgId),
    index("alerts_type_idx").on(table.type),
    index("alerts_read_idx").on(table.isRead),
  ]
);

// ── Reports ────────────────────────────────────────────────────────────────

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    frequency: reportFrequencyEnum("frequency").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    summary: text("summary"),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("reports_org_idx").on(table.orgId),
    index("reports_frequency_idx").on(table.frequency),
  ]
);

// ── AI Analysis ────────────────────────────────────────────────────────────

export const aiAnalysis = pgTable(
  "ai_analysis",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    repoId: uuid("repo_id").references(() => repositories.id),
    analysisType: text("analysis_type").notNull(),
    result: jsonb("result").notNull(),
    summary: text("summary"),
    modelUsed: text("model_used"),
    tokensUsed: integer("tokens_used"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_analysis_entity_idx").on(table.entityType, table.entityId),
    index("ai_analysis_repo_idx").on(table.repoId),
  ]
);

// ── Activity Events ────────────────────────────────────────────────────────

export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    repoId: uuid("repo_id").references(() => repositories.id),
    developerId: uuid("developer_id").references(() => developers.id),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload"),
    githubEventId: text("github_event_id"),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activity_org_idx").on(table.orgId),
    index("activity_event_type_idx").on(table.eventType),
    index("activity_created_at_idx").on(table.createdAt),
  ]
);

// ── Integrations ───────────────────────────────────────────────────────────

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    config: jsonb("config"),
    isActive: boolean("is_active").default(true),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("integrations_org_idx").on(table.orgId)]
);

// ── Webhook Events (raw for idempotency) ───────────────────────────────────

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    githubEventId: text("github_event_id").notNull().unique(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    processed: boolean("processed").default(false),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("webhook_events_github_id_idx").on(table.githubEventId),
    index("webhook_events_processed_idx").on(table.processed),
  ]
);

// ── Releases ───────────────────────────────────────────────────────────────

export const releases = pgTable(
  "releases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    repoId: uuid("repo_id").references(() => repositories.id),
    projectId: uuid("project_id").references(() => projects.id),
    version: text("version").notNull(),
    title: text("title"),
    description: text("description"),
    status: releaseStatusEnum("status").default("draft").notNull(),
    readinessScore: integer("readiness_score").default(0),
    scoreLabel: text("score_label"),
    previousVersion: text("previous_version"),
    targetCommitSha: text("target_commit_sha"),
    targetBranch: text("target_branch").default("main"),
    deployedAt: timestamp("deployed_at"),
    deployedBy: uuid("deployed_by").references(() => users.id),
    releaseSummary: text("release_summary"),
    aiAnalysis: jsonb("ai_analysis"),
    deploymentChecklist: jsonb("deployment_checklist"),
    deploymentGate: jsonb("deployment_gate"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("releases_org_idx").on(table.orgId),
    index("releases_repo_idx").on(table.repoId),
    index("releases_status_idx").on(table.status),
    index("releases_version_idx").on(table.version),
  ]
);

export const releaseCommits = pgTable(
  "release_commits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    commitId: uuid("commit_id")
      .notNull()
      .references(() => commits.id, { onDelete: "cascade" }),
    includedAt: timestamp("included_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("release_commit_unique").on(table.releaseId, table.commitId),
  ]
);

export const releasePullRequests = pgTable(
  "release_pull_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    prId: uuid("pr_id")
      .notNull()
      .references(() => pullRequests.id, { onDelete: "cascade" }),
    riskScore: integer("risk_score"),
    includedAt: timestamp("included_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("release_pr_unique").on(table.releaseId, table.prId),
  ]
);

export const releaseChecks = pgTable(
  "release_checks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    checkName: text("check_name").notNull(),
    checkType: text("check_type").notNull(),
    passed: boolean("passed").default(false),
    message: text("message"),
    evidence: jsonb("evidence"),
    requiredForDeploy: boolean("required_for_deploy").default(false),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("release_checks_release_idx").on(table.releaseId),
    index("release_checks_type_idx").on(table.checkType),
  ]
);

export const releaseRisks = pgTable(
  "release_risks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    category: riskCategoryEnum("category").notNull(),
    severity: severityEnum("severity").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    evidence: text("evidence"),
    affectedComponent: text("affected_component"),
    recommendedAction: text("recommended_action"),
    sourceType: text("source_type"),
    sourceId: uuid("source_id"),
    isAiGenerated: boolean("is_ai_generated").default(false),
    isAcknowledged: boolean("is_acknowledged").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("release_risks_release_idx").on(table.releaseId),
    index("release_risks_category_idx").on(table.category),
    index("release_risks_severity_idx").on(table.severity),
  ]
);

// ── Deployment Events ──────────────────────────────────────────────────────

export const deploymentEvents = pgTable(
  "deployment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    environment: deploymentEnvironmentEnum("environment").notNull(),
    provider: deploymentProviderEnum("provider"),
    status: deploymentStatusEnum("status").default("pending").notNull(),
    commitSha: text("commit_sha"),
    version: text("version"),
    externalDeploymentId: text("external_deployment_id"),
    logs: text("logs"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    duration: integer("duration"),
    error: text("error"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("deploy_events_release_idx").on(table.releaseId),
    index("deploy_events_env_idx").on(table.environment),
    index("deploy_events_status_idx").on(table.status),
  ]
);

export const deploymentEnvironments = pgTable(
  "deployment_environments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: deploymentEnvironmentEnum("type").notNull(),
    url: text("url"),
    isActive: boolean("is_active").default(true),
    config: jsonb("config"),
    lastDeployedAt: timestamp("last_deployed_at"),
    lastDeploymentId: uuid("last_deployment_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("deploy_envs_org_idx").on(table.orgId),
    index("deploy_envs_type_idx").on(table.type),
  ]
);

// ── Rollback Recommendations ───────────────────────────────────────────────

export const rollbackRecommendations = pgTable(
  "rollback_recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    deploymentEventId: uuid("deployment_event_id")
      .notNull()
      .references(() => deploymentEvents.id, { onDelete: "cascade" }),
    likelyCause: text("likely_cause").notNull(),
    relatedCommitSha: text("related_commit_sha"),
    relatedPrNumber: integer("related_pr_number"),
    affectedService: text("affected_service"),
    previousStableVersion: text("previous_stable_version").notNull(),
    recommendedVersion: text("recommended_version").notNull(),
    investigationSteps: jsonb("investigation_steps"),
    isAiAssessment: boolean("is_ai_assessment").default(true),
    isImplemented: boolean("is_implemented").default(false),
    implementedAt: timestamp("implemented_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("rollback_rec_release_idx").on(table.releaseId),
    index("rollback_rec_deploy_idx").on(table.deploymentEventId),
  ]
);

// ── Deployment Gate Config ─────────────────────────────────────────────────

export const deploymentGateConfig = pgTable(
  "deployment_gate_config",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    condition: deploymentGateConditionEnum("condition").notNull(),
    action: text("action").default("block").notNull(),
    isEnabled: boolean("is_enabled").default(true),
    threshold: integer("threshold"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("gate_config_org_idx").on(table.orgId),
    uniqueIndex("gate_config_org_condition_unique").on(table.orgId, table.condition),
  ]
);

// ── Release Notifications ──────────────────────────────────────────────────

export const releaseNotifications = pgTable(
  "release_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    releaseId: uuid("release_id").references(() => releases.id),
    userId: uuid("user_id").references(() => users.id),
    type: releaseNotificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    severity: severityEnum("severity").notNull(),
    isRead: boolean("is_read").default(false),
    actionUrl: text("action_url"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("release_notif_org_idx").on(table.orgId),
    index("release_notif_user_idx").on(table.userId),
    index("release_notif_read_idx").on(table.isRead),
  ]
);

// ── Incident Severity Enum ──────────────────────────────────────────────
export const incidentSeverityEnum = pgEnum("incident_severity", [
  "sev1",
  "sev2",
  "sev3",
  "sev4",
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "detected",
  "investigating",
  "identified",
  "monitoring",
  "resolved",
  "closed",
]);

export const entityTypeEnum = pgEnum("entity_type", [
  "developer",
  "commit",
  "pull_request",
  "file",
  "service",
  "api_endpoint",
  "database_table",
  "deployment",
  "incident",
  "repository",
  "project",
]);

export const relationshipTypeEnum = pgEnum("relationship_type", [
  "authored_commit",
  "commit_in_pr",
  "pr_changed_file",
  "file_in_service",
  "service_exposes_api",
  "service_uses_db_table",
  "pr_caused_deployment",
  "deployment_caused_incident",
  "incident_affected_service",
  "incident_affected_api",
  "project_contains_repo",
  "repo_belongs_to_project",
  "incident_related_pr",
  "incident_related_commit",
]);

// ── Incidents ──────────────────────────────────────────────────────────
export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    severity: incidentSeverityEnum("severity").default("sev3").notNull(),
    status: incidentStatusEnum("status").default("detected").notNull(),
    errorRate: text("error_rate"),
    affectedServices: jsonb("affected_services"),
    affectedApis: jsonb("affected_apis"),
    affectedDbTables: jsonb("affected_db_tables"),
    errorMessage: text("error_message"),
    stackTrace: text("stack_trace"),
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
    acknowledgedAt: timestamp("acknowledged_at"),
    identifiedAt: timestamp("identified_at"),
    resolvedAt: timestamp("resolved_at"),
    closedAt: timestamp("closed_at"),
    duration: integer("duration"),
    relatedReleaseId: uuid("related_release_id").references(() => releases.id),
    relatedDeploymentId: uuid("related_deployment_id").references(() => deploymentEvents.id),
    rootCause: jsonb("root_cause"),
    blastRadius: jsonb("blast_radius"),
    timeline: jsonb("timeline"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("incidents_org_idx").on(table.orgId),
    index("incidents_severity_idx").on(table.severity),
    index("incidents_status_idx").on(table.status),
    index("incidents_detected_at_idx").on(table.detectedAt),
  ]
);

// ── Incident Timeline Events ──────────────────────────────────────────
export const incidentTimelines = pgTable(
  "incident_timelines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    eventType: text("event_type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    source: text("source"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("incident_tl_incident_idx").on(table.incidentId),
    index("incident_tl_timestamp_idx").on(table.timestamp),
  ]
);

// ── Root Cause Analyses ───────────────────────────────────────────────
export const rootCauseAnalyses = pgTable(
  "root_cause_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    rootCauseType: text("root_cause_type").notNull(),
    confidence: integer("confidence").notNull(),
    evidence: jsonb("evidence"),
    relatedPrId: uuid("related_pr_id").references(() => pullRequests.id),
    relatedCommitId: uuid("related_commit_id").references(() => commits.id),
    relatedDeploymentId: uuid("related_deployment_id").references(() => deploymentEvents.id),
    description: text("description"),
    aiAnalysis: jsonb("ai_analysis"),
    isConfirmed: boolean("is_confirmed").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("rca_incident_idx").on(table.incidentId),
    index("rca_confidence_idx").on(table.confidence),
  ]
);

// ── Blast Radius ──────────────────────────────────────────────────────
export const blastRadius = pgTable(
  "blast_radius",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    entityName: text("entity_name").notNull(),
    impactLevel: text("impact_level").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("blast_incident_idx").on(table.incidentId),
    index("blast_level_idx").on(table.impactLevel),
  ]
);

// ── Prevention Recommendations ────────────────────────────────────────
export const preventionRecommendations = pgTable(
  "prevention_recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    priority: integer("priority").default(0),
    isImplemented: boolean("is_implemented").default(false),
    implementedAt: timestamp("implemented_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("prev_rec_incident_idx").on(table.incidentId),
  ]
);

// ── Engineering Knowledge Graph ────────────────────────────────────────
export const engineeringEntities = pgTable(
  "engineering_entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    entityType: entityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id"),
    name: text("name").notNull(),
    metadata: jsonb("metadata"),
    riskLevel: text("risk_level"),
    incidentCount: integer("incident_count").default(0),
    lastDeployedAt: timestamp("last_deployed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("eng_entities_org_idx").on(table.orgId),
    index("eng_entities_type_idx").on(table.entityType),
    uniqueIndex("eng_entities_type_id_unique").on(table.entityType, table.entityId),
  ]
);

export const engineeringRelationships = pgTable(
  "engineering_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceEntityType: text("source_entity_type").notNull(),
    sourceEntityId: uuid("source_entity_id").notNull(),
    targetEntityType: text("target_entity_type").notNull(),
    targetEntityId: uuid("target_entity_id").notNull(),
    relationshipType: relationshipTypeEnum("relationship_type").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("eng_rels_org_idx").on(table.orgId),
    index("eng_rels_source_idx").on(table.sourceEntityType, table.sourceEntityId),
    index("eng_rels_target_idx").on(table.targetEntityType, table.targetEntityId),
    index("eng_rels_type_idx").on(table.relationshipType),
  ]
);

// ═════════════════════════════════════════════════════════════════════════
// AI SECURITY AGENT
// Detect → Investigate → Safely Validate → Explain → Remediate → Verify
// ═════════════════════════════════════════════════════════════════════════

// One invocation of the security agent pipeline
export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    repoId: uuid("repo_id").references(() => repositories.id, { onDelete: "cascade" }),
    repoLink: text("repo_link"), // github.com/owner/repo when scanned by link
    branch: text("branch").default("main"),
    kind: agentRunKindEnum("kind").default("full").notNull(),
    status: agentRunStatusEnum("status").default("queued").notNull(),
    fileCount: integer("file_count").default(0),
    findingCount: integer("finding_count").default(0),
    summary: text("summary"),
    error: text("error"),
    durationMs: integer("duration_ms"),
    createdById: uuid("created_by_id").references(() => users.id),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    index("agent_runs_org_idx").on(table.orgId),
    index("agent_runs_repo_idx").on(table.repoId),
    index("agent_runs_status_idx").on(table.status),
  ]
);

// Authorized sandbox PoC validation of one finding
export const agentValidations = pgTable(
  "agent_validations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    findingId: uuid("finding_id")
      .notNull()
      .references(() => securityFindings.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    status: agentValidationStatusEnum("status").default("pending").notNull(),
    environment: text("environment").default("isolated-sandbox").notNull(),
    authorized: boolean("authorized").default(false).notNull(),
    authorizedById: uuid("authorized_by_id").references(() => users.id),
    pocScript: text("poc_script"),
    evidence: jsonb("evidence"),
    output: text("output"),
    exploitReproduced: boolean("exploit_reproduced").default(false).notNull(),
    durationMs: integer("duration_ms"),
    error: text("error"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    index("agent_validations_finding_idx").on(table.findingId),
    index("agent_validations_org_idx").on(table.orgId),
  ]
);

// AI-generated proposed patch — never auto-merged
export const agentPatches = pgTable(
  "agent_patches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    findingId: uuid("finding_id")
      .notNull()
      .references(() => securityFindings.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    status: agentPatchStatusEnum("status").default("proposed").notNull(),
    summary: text("summary"),
    rootCause: text("root_cause"),
    strategy: text("strategy"),
    diff: text("diff").notNull(),
    verificationPlan: text("verification_plan"),
    model: text("model"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agent_patches_finding_idx").on(table.findingId),
    index("agent_patches_org_idx").on(table.orgId),
  ]
);

// Re-scan + re-validation after a fix is applied
export const agentVerifications = pgTable(
  "agent_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    findingId: uuid("finding_id")
      .notNull()
      .references(() => securityFindings.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    patchId: uuid("patch_id").references(() => agentPatches.id),
    status: agentVerificationStatusEnum("status").default("pending").notNull(),
    beforeState: text("before_state"),
    rescan: jsonb("rescan"),
    testsPassed: boolean("tests_passed"),
    remainingRisks: jsonb("remaining_risks"),
    summary: text("summary"),
    error: text("error"),
    durationMs: integer("duration_ms"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    index("agent_verifications_finding_idx").on(table.findingId),
    index("agent_verifications_org_idx").on(table.orgId),
  ]
);

// Append-only audit trail of every agent tool invocation
export const agentActions = pgTable(
  "agent_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    runId: uuid("run_id").references(() => agentRuns.id, { onDelete: "set null" }),
    findingId: uuid("finding_id").references(() => securityFindings.id, { onDelete: "set null" }),
    actorId: uuid("actor_id").references(() => users.id),
    tool: text("tool").notNull(),
    action: text("action").notNull(),
    status: text("status").default("OK").notNull(),
    authScope: agentAuthScopeEnum("auth_scope").default("user").notNull(),
    authorized: boolean("authorized").default(false).notNull(),
    environment: text("environment"),
    input: jsonb("input"),
    result: jsonb("result"),
    error: text("error"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agent_actions_org_idx").on(table.orgId),
    index("agent_actions_run_idx").on(table.runId),
    index("agent_actions_finding_idx").on(table.findingId),
  ]
);
