-- Security Agent (Detect → Investigate → Validate → Remediate → Verify)
-- All rows hang off Project — project RBAC (access.ts) is the isolation boundary.

-- ── Enums ──
CREATE TYPE "SecurityRunKind" AS ENUM ('SCAN', 'INVESTIGATE', 'VALIDATE', 'REMEDIATE', 'VERIFY', 'FULL');
CREATE TYPE "SecurityRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "SecurityFindingStatus" AS ENUM ('QUEUED', 'INVESTIGATING', 'VALIDATION_REQUIRED', 'VALIDATING', 'CONFIRMED', 'FALSE_POSITIVE', 'REMEDIATION_READY', 'FIXED', 'VERIFIED');
CREATE TYPE "SecurityVerdict" AS ENUM ('CONFIRMED', 'LIKELY', 'POTENTIAL', 'FALSE_POSITIVE');
CREATE TYPE "SecuritySeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "SecurityRepoSource" AS ENUM ('WORKSPACE', 'LINKED_REPO', 'GITHUB_LINK');
CREATE TYPE "SecurityAuthScope" AS ENUM ('NONE', 'USER', 'EXPLICIT', 'SYSTEM');
CREATE TYPE "SecurityValidationStatus" AS ENUM ('PENDING', 'RUNNING', 'EXPLOITABLE', 'NOT_EXPLOITABLE', 'INCONCLUSIVE', 'FAILED', 'SKIPPED');
CREATE TYPE "SecurityPatchStatus" AS ENUM ('PROPOSED', 'APPLIED', 'DISCARDED');
CREATE TYPE "SecurityVerificationStatus" AS ENUM ('PENDING', 'RUNNING', 'FIXED', 'STILL_VULNERABLE', 'INCONCLUSIVE', 'FAILED');

-- ── SecurityRun ──
CREATE TABLE "SecurityRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "SecurityRunKind" NOT NULL DEFAULT 'SCAN',
    "status" "SecurityRunStatus" NOT NULL DEFAULT 'QUEUED',
    "repoSource" "SecurityRepoSource" NOT NULL DEFAULT 'WORKSPACE',
    "repoUrl" TEXT,
    "repoBranch" TEXT DEFAULT 'main',
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "findingCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "error" TEXT,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "createdById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SecurityRun_pkey" PRIMARY KEY ("id")
);

-- ── SecurityFinding ──
CREATE TABLE "SecurityFinding" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'sast',
    "severity" "SecuritySeverity" NOT NULL DEFAULT 'MEDIUM',
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "cwe" TEXT,
    "cve" TEXT,
    "filePath" TEXT,
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "snippet" TEXT,
    "rootCause" TEXT,
    "evidence" JSONB,
    "impact" TEXT,
    "recommendation" TEXT,
    "attackPath" JSONB,
    "components" JSONB,
    "verdict" "SecurityVerdict",
    "verdictReason" TEXT,
    "aiAnalysis" TEXT,
    "status" "SecurityFindingStatus" NOT NULL DEFAULT 'QUEUED',
    "fingerprint" TEXT NOT NULL,
    "fixedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityFinding_pkey" PRIMARY KEY ("id")
);

-- ── SecurityValidation ──
CREATE TABLE "SecurityValidation" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "SecurityValidationStatus" NOT NULL DEFAULT 'PENDING',
    "environment" TEXT NOT NULL DEFAULT 'isolated-sandbox',
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "authorizedById" TEXT,
    "pocScript" TEXT,
    "evidence" JSONB,
    "output" TEXT,
    "exploitReproduced" BOOLEAN NOT NULL DEFAULT false,
    "durationMs" INTEGER,
    "sandboxId" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SecurityValidation_pkey" PRIMARY KEY ("id")
);

-- ── SecurityPatch ──
CREATE TABLE "SecurityPatch" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "SecurityPatchStatus" NOT NULL DEFAULT 'PROPOSED',
    "summary" TEXT,
    "rootCause" TEXT,
    "strategy" TEXT,
    "diff" TEXT NOT NULL,
    "verificationPlan" TEXT,
    "model" TEXT,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityPatch_pkey" PRIMARY KEY ("id")
);

-- ── SecurityVerification ──
CREATE TABLE "SecurityVerification" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "patchId" TEXT,
    "revalidationId" TEXT,
    "status" "SecurityVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "beforeState" TEXT,
    "rescan" JSONB,
    "testsPassed" BOOLEAN,
    "testOutput" TEXT,
    "remainingRisks" JSONB,
    "summary" TEXT,
    "error" TEXT,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SecurityVerification_pkey" PRIMARY KEY ("id")
);

-- ── SecurityAction (audit trail) ──
CREATE TABLE "SecurityAction" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "runId" TEXT,
    "findingId" TEXT,
    "actorId" TEXT,
    "tool" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "authScope" "SecurityAuthScope" NOT NULL DEFAULT 'USER',
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "environment" TEXT,
    "input" JSONB,
    "result" JSONB,
    "error" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAction_pkey" PRIMARY KEY ("id")
);

-- ── Foreign keys ──
ALTER TABLE "SecurityRun" ADD CONSTRAINT "SecurityRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityRun" ADD CONSTRAINT "SecurityRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SecurityFinding" ADD CONSTRAINT "SecurityFinding_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SecurityRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityFinding" ADD CONSTRAINT "SecurityFinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SecurityValidation" ADD CONSTRAINT "SecurityValidation_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "SecurityFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityValidation" ADD CONSTRAINT "SecurityValidation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SecurityPatch" ADD CONSTRAINT "SecurityPatch_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "SecurityFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityPatch" ADD CONSTRAINT "SecurityPatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SecurityVerification" ADD CONSTRAINT "SecurityVerification_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "SecurityFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityVerification" ADD CONSTRAINT "SecurityVerification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityVerification" ADD CONSTRAINT "SecurityVerification_patchId_fkey" FOREIGN KEY ("patchId") REFERENCES "SecurityPatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityVerification" ADD CONSTRAINT "SecurityVerification_revalidationId_fkey" FOREIGN KEY ("revalidationId") REFERENCES "SecurityValidation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SecurityAction" ADD CONSTRAINT "SecurityAction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityAction" ADD CONSTRAINT "SecurityAction_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SecurityRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityAction" ADD CONSTRAINT "SecurityAction_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "SecurityFinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Indexes ──
CREATE INDEX "SecurityRun_projectId_startedAt_idx" ON "SecurityRun"("projectId", "startedAt");
CREATE INDEX "SecurityRun_status_idx" ON "SecurityRun"("status");
CREATE INDEX "SecurityFinding_projectId_status_idx" ON "SecurityFinding"("projectId", "status");
CREATE INDEX "SecurityFinding_projectId_severity_idx" ON "SecurityFinding"("projectId", "severity");
CREATE INDEX "SecurityFinding_projectId_fingerprint_idx" ON "SecurityFinding"("projectId", "fingerprint");
CREATE INDEX "SecurityFinding_runId_idx" ON "SecurityFinding"("runId");
CREATE INDEX "SecurityValidation_findingId_startedAt_idx" ON "SecurityValidation"("findingId", "startedAt");
CREATE INDEX "SecurityValidation_projectId_startedAt_idx" ON "SecurityValidation"("projectId", "startedAt");
CREATE INDEX "SecurityPatch_findingId_createdAt_idx" ON "SecurityPatch"("findingId", "createdAt");
CREATE INDEX "SecurityVerification_findingId_startedAt_idx" ON "SecurityVerification"("findingId", "startedAt");
CREATE INDEX "SecurityAction_projectId_createdAt_idx" ON "SecurityAction"("projectId", "createdAt");
CREATE INDEX "SecurityAction_runId_idx" ON "SecurityAction"("runId");
CREATE INDEX "SecurityAction_findingId_idx" ON "SecurityAction"("findingId");
