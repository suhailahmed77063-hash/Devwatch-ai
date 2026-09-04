export interface AppFileRow {
  path: string;
  size: number;
  updatedAt: string;
}

export interface AppMeta {
  projectName: string | null;
  appStatus: "starter" | "ready";
  fileCount: number;
  runCount: number;
  checkpointCount: number;
  envVarCount: number;
  lastRun: {
    status: string;
    steps: PipelineStep[] | null;
    summary: string | null;
    startedAt: string;
  } | null;
}

export interface PipelineStep {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn" | "skip" | "running";
  output?: string;
  durationMs?: number;
}

export interface OpenTab {
  path: string;
  content: string;
  saved: boolean;
}

export interface EnvVarRow {
  id: string;
  name: string;
  isSecret: boolean;
  value: string;
}

export interface CheckpointRow {
  id: string;
  version: number;
  message: string;
  commitHash: string | null;
  createdAt: string;
  files: number;
}

export interface RunRow {
  id: string;
  kind: string;
  status: string;
  steps: PipelineStep[] | null;
  summary: string | null;
  error: string | null;
  durationMs: number | null;
  startedAt: string;
}

export interface SecurityReport {
  score: number;
  findings: { id: string; label: string; severity: string; file?: string; detail?: string }[];
}

export interface ReviewReport {
  security: SecurityReport;
  readiness: {
    score: number;
    checks: { id: string; label: string; ok: boolean; critical: boolean; detail?: string }[];
    blockers: string[];
  };
  lastRun: { steps: PipelineStep[]; passed: boolean; durationMs: number } | null;
  git: { log: { hash: string; message: string; date: string }[]; configured: boolean };
}