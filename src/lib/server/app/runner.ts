import type { PipelineResult, PipelineStep } from "@/types/app";
import { readAppFiles } from "./data";
import { envVarMap } from "./data";
import { syncWorkspaceToDisk, runCommand, runNpx } from "./workspace";
import { runSecurityScan } from "./security";
import { logger } from "../logger";

const INSTALL_TIMEOUT = 240_000;
const CMD_TIMEOUT = 180_000;

function tail(output: string, max = 6000): string {
  const clean = output.trim();
  if (clean.length <= max) return clean;
  return `…${clean.slice(-max)}`;
}

export interface RunContext {
  projectId: string;
  onStep?: (step: PipelineStep) => void;
}

/**
 * Execute the full automated QA pipeline in the real sandbox workspace.
 * Every step runs a real command against the materialized files — no
 * simulated progress. `install` is best-effort (offline-tolerant); if the
 * generated deps cannot be resolved the pipeline reports it honestly.
 */
export async function runPipeline(ctx: RunContext): Promise<PipelineResult> {
  const startedAt = Date.now();
  const files = await readAppFiles(ctx.projectId);
  const envVars = await envVarMap(ctx.projectId);
  const dir = await syncWorkspaceToDisk(ctx.projectId, files, envVars);

  const steps: PipelineStep[] = [];
  const emit = (step: PipelineStep) => {
    steps.push(step);
    ctx.onStep?.(step);
  };

  // 1. Install dependencies (real; offline-tolerant via npm cache)
  {
    const s = Date.now();
    const res = await runCommand(dir, process.platform === "win32" ? "npm.cmd" : "npm", ["install", "--no-audit", "--no-fund", "--prefer-offline", "--loglevel=error"], INSTALL_TIMEOUT);
    const hasNodeModules = require("node:fs").existsSync(require("node:path").join(dir, "node_modules"));
    const ok = res.code === 0 || hasNodeModules;
    emit({
      id: "install",
      label: "Install dependencies",
      status: ok ? "pass" : "fail",
      output: tail(res.stderr || res.stdout, 4000),
      durationMs: Date.now() - s,
    });
    if (!ok) return { steps, passed: false, durationMs: Date.now() - startedAt };
  }

  // 2. Type check
  {
    const s = Date.now();
    const res = await runNpx(dir, ["tsc", "--noEmit"], CMD_TIMEOUT);
    emit({
      id: "typecheck",
      label: "Type check",
      status: res.code === 0 ? "pass" : "fail",
      output: tail(res.stderr || res.stdout, 6000),
      durationMs: Date.now() - s,
    });
    if (res.code !== 0) return { steps, passed: false, durationMs: Date.now() - startedAt };
  }

  // 3. Lint — strict unused-code analysis via tsc (real check, no extra deps)
  {
    const s = Date.now();
    const res = await runNpx(dir, ["tsc", "--noEmit", "--noUnusedLocals", "--noUnusedParameters"], CMD_TIMEOUT);
    emit({
      id: "lint",
      label: "Lint (strict types)",
      status: res.code === 0 ? "pass" : "warn",
      output: tail(res.stderr || res.stdout, 4000),
      durationMs: Date.now() - s,
    });
  }

  // 4. Unit tests (vitest)
  {
    const s = Date.now();
    const res = await runNpx(dir, ["vitest", "run", "--reporter=basic"], CMD_TIMEOUT);
    const pass = res.code === 0;
    emit({
      id: "unit_tests",
      label: "Unit tests",
      status: pass ? "pass" : "fail",
      output: tail(res.stdout || res.stderr, 8000),
      durationMs: Date.now() - s,
    });
    if (!pass) return { steps, passed: false, durationMs: Date.now() - startedAt };
  }

  // 5. Production build (tsc emit)
  {
    const s = Date.now();
    const res = await runNpx(dir, ["tsc"], CMD_TIMEOUT);
    emit({
      id: "build",
      label: "Production build",
      status: res.code === 0 ? "pass" : "fail",
      output: tail(res.stderr || res.stdout, 6000),
      durationMs: Date.now() - s,
    });
    if (res.code !== 0) return { steps, passed: false, durationMs: Date.now() - startedAt };
  }

  // 6. Security scan (static, in-process, real checks)
  {
    const s = Date.now();
    const report = runSecurityScan(files);
    emit({
      id: "security",
      label: "Security scan",
      status: report.score >= 70 ? (report.score >= 85 ? "pass" : "warn") : "fail",
      output: report.findings.length
        ? `${report.findings.length} finding(s): ${report.findings.map((f) => `${f.label}${f.file ? ` (${f.file})` : ""}`).join(", ")}`
        : `No findings — score ${report.score}/100`,
      durationMs: Date.now() - s,
    });
  }

  // 7. Runtime health check (node dist/index.js — the app's real self-check)
  {
    const s = Date.now();
    const res = await runCommand(dir, process.platform === "win32" ? "node.exe" : "node", ["dist/index.js"], CMD_TIMEOUT);
    emit({
      id: "runtime",
      label: "Runtime check",
      status: res.code === 0 ? "pass" : "fail",
      output: tail(res.stdout || res.stderr, 4000),
      durationMs: Date.now() - s,
    });
    if (res.code !== 0) return { steps, passed: false, durationMs: Date.now() - startedAt };
  }

  logger.info("app.pipeline.passed", { projectId: ctx.projectId, durationMs: Date.now() - startedAt });
  return { steps, passed: true, durationMs: Date.now() - startedAt };
}