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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sec_findings_repo_idx").on(table.repoId),
    index("sec_findings_severity_idx").on(table.severity),
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
