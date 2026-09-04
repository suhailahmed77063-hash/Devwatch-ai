/**
 * WebForge AI — App Builder (Lovable-style).
 *
 * A generated application is stored as *structured state*:
 *   - an `AppBlueprint` (the plan: modules, data models, API routes, env
 *     requirements, tests) — the source of truth for what the app is,
 *   - a flat set of `AppFile` rows (path -> content) — the source of truth
 *     for what the app contains. Files are synced to a real sandbox
 *     directory only when verification (typecheck/tests/build) runs.
 *
 * Never treat rendered output as the source of truth.
 */

export type AppFileOp =
  | { kind: "create"; path: string; content: string }
  | { kind: "edit"; path: string; content: string }
  | { kind: "delete"; path: string }
  | { kind: "rename"; path: string; newPath: string };

export interface AppBlueprint {
  name: string;
  description: string;
  stack: string;
  modules: string[]; // auth, billing, dashboard, admin, api, ...
  dataModels: {
    name: string;
    fields: { name: string; type: string; optional?: boolean; unique?: boolean }[];
  }[];
  apiRoutes: { method: string; path: string; description: string; protected: boolean }[];
  envRequirements: { name: string; secret: boolean; required: boolean; description?: string }[];
  pages: { route: string; name: string; components: string[] }[];
  testPlan: string[];
}

export interface AppPlanResult {
  summary: string;
  steps: string[]; // human-readable execution plan shown in the UI
  operations: AppFileOp[];
  runTests: boolean;
}

export interface AppFixResult {
  summary: string;
  operations: AppFileOp[];
  continue: boolean; // false when no useful fix was produced (stop loop)
}

export interface PipelineStep {
  id: "install" | "typecheck" | "lint" | "unit_tests" | "build" | "security" | "runtime";
  label: string;
  status: "pass" | "fail" | "warn" | "skip";
  output?: string; // tail of real command output / scan findings
  durationMs?: number;
}

export interface PipelineResult {
  steps: PipelineStep[];
  passed: boolean;
  durationMs: number;
}

export type RunKind = "generate" | "agent" | "manual" | "fix" | "full";

/** Weighted static security finding. */
export interface SecurityFinding {
  id: string;
  label: string;
  severity: "critical" | "high" | "medium" | "low";
  file?: string;
  detail?: string;
}

export interface SecurityReport {
  score: number; // 0..100 from real checks
  findings: SecurityFinding[];
}

export interface ReadinessCheck {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
  critical: boolean; // failing critical checks block deployment
}

export interface ReadinessReport {
  score: number; // 0..100
  checks: ReadinessCheck[];
  blockers: string[];
}

export interface CheckpointMeta {
  id: string;
  version: number;
  message: string;
  commitHash: string | null;
  createdAt: string;
  files: number;
}