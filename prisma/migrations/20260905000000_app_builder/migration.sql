-- AI App Builder: virtual code workspace, automated QA runs, snapshots.
-- Mirrors prisma/schema.prisma (PostgreSQL). On a fresh database you can also
-- apply the whole schema with `npx prisma db push` — this file documents the
-- incremental change for existing deployments (`prisma migrate deploy`).

CREATE TYPE "AppRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'CANCELLED');

CREATE TABLE "AppFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'manual',
    "status" "AppRunStatus" NOT NULL DEFAULT 'QUEUED',
    "steps" JSONB,
    "summary" TEXT,
    "error" TEXT,
    "createdById" TEXT,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AppRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppCheckpoint" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "commitHash" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppFile_projectId_path_key" ON "AppFile"("projectId", "path");
CREATE INDEX "AppFile_projectId_idx" ON "AppFile"("projectId");
CREATE INDEX "AppRun_projectId_startedAt_idx" ON "AppRun"("projectId", "startedAt");
CREATE UNIQUE INDEX "AppCheckpoint_projectId_version_key" ON "AppCheckpoint"("projectId", "version");
CREATE INDEX "AppCheckpoint_projectId_createdAt_idx" ON "AppCheckpoint"("projectId", "createdAt");

ALTER TABLE "AppFile" ADD CONSTRAINT "AppFile_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppRun" ADD CONSTRAINT "AppRun_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppRun" ADD CONSTRAINT "AppRun_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppCheckpoint" ADD CONSTRAINT "AppCheckpoint_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppCheckpoint" ADD CONSTRAINT "AppCheckpoint_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;