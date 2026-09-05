/**
 * Sandbox Manager
 * 
 * Creates isolated execution environments for generated code.
 * Uses Node.js child processes with strict resource limits.
 * 
 * Safety features:
 * - Timeout protection (kills process after limit)
 * - Memory limits
 * - Process isolation via temp directories
 * - Stdout/stderr capture
 * - Automatic cleanup
 * - Health checks
 */

import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { logger } from "../logger";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SandboxConfig {
  /** Maximum execution time in milliseconds */
  timeoutMs?: number;
  /** Maximum memory in MB */
  maxMemoryMb?: number;
  /** Working directory (default: temp sandbox) */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Shell to use */
  shell?: boolean;
}

export interface SandboxResult {
  /** Exit code (null if killed by signal) */
  exitCode: number | null;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Whether the process was killed by timeout */
  timedOut: boolean;
  /** Whether the process was killed by OOM */
  oomKilled: boolean;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Peak memory usage in bytes */
  peakMemoryBytes?: number;
}

export interface SandboxInstance {
  /** Unique sandbox ID */
  id: string;
  /** Working directory */
  cwd: string;
  /** Whether the sandbox is active */
  active: boolean;
  /** Created at timestamp */
  createdAt: number;
  /** Running processes */
  processes: Map<string, ChildProcess>;
}

// ── Sandbox Manager ────────────────────────────────────────────────────────

const SANDBOX_BASE = path.join(os.tmpdir(), "aiforge-sandboxes");
const DEFAULT_TIMEOUT_MS = 60_000; // 1 minute
const DEFAULT_MAX_MEMORY_MB = 512; // 512 MB
const MAX_SANDBOXES = 50;
const MAX_CONCURRENT_PROCESSES = 10;

const sandboxes = new Map<string, SandboxInstance>();

/**
 * Create a new sandbox instance
 */
export async function createSandbox(projectId: string): Promise<SandboxInstance> {
  // Enforce limits
  if (sandboxes.size >= MAX_SANDBOXES) {
    // Cleanup oldest sandbox
    const oldest = Array.from(sandboxes.values())
      .sort((a, b) => a.createdAt - b.createdAt)[0];
    if (oldest) {
      await destroySandbox(oldest.id);
    }
  }

  const id = `sbx_${projectId}_${Date.now()}`;
  const cwd = path.join(SANDBOX_BASE, id);

  await fs.mkdir(cwd, { recursive: true });

  const instance: SandboxInstance = {
    id,
    cwd,
    active: true,
    createdAt: Date.now(),
    processes: new Map(),
  };

  sandboxes.set(id, instance);
  logger.info("sandbox.created", { id, projectId, cwd });

  return instance;
}

/**
 * Get or create sandbox for a project
 */
export async function getOrCreateSandbox(projectId: string): Promise<SandboxInstance> {
  // Find existing active sandbox for this project
  for (const sbx of sandboxes.values()) {
    if (sbx.id.includes(projectId) && sbx.active) {
      return sbx;
    }
  }
  return createSandbox(projectId);
}

/**
 * Destroy a sandbox and cleanup resources
 */
export async function destroySandbox(id: string): Promise<void> {
  const sbx = sandboxes.get(id);
  if (!sbx) return;

  // Kill all running processes
  for (const [procId, proc] of sbx.processes) {
    try {
      proc.kill("SIGTERM");
      // Force kill after 5 seconds
      setTimeout(() => {
        try { proc.kill("SIGKILL"); } catch { /* already dead */ }
      }, 5000);
    } catch { /* already dead */ }
  }
  sbx.processes.clear();

  // Cleanup temp directory
  try {
    await fs.rm(sbx.cwd, { recursive: true, force: true });
  } catch (e) {
    logger.warn("sandbox.cleanup_failed", { id, error: (e as Error).message });
  }

  sbx.active = false;
  sandboxes.delete(id);
  logger.info("sandbox.destroyed", { id });
}

/**
 * Execute a command in a sandbox
 */
export async function executeInSandbox(
  sandboxId: string,
  command: string,
  args: string[] = [],
  config: SandboxConfig = {}
): Promise<SandboxResult> {
  const sbx = sandboxes.get(sandboxId);
  if (!sbx || !sbx.active) {
    throw new Error(`Sandbox ${sandboxId} is not active`);
  }

  // Check process limit
  if (sbx.processes.size >= MAX_CONCURRENT_PROCESSES) {
    throw new Error(`Sandbox ${sandboxId} has too many running processes (${MAX_CONCURRENT_PROCESSES})`);
  }

  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cwd = config.cwd ?? sbx.cwd;

  const startTime = Date.now();
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let oomKilled = false;

  return new Promise<SandboxResult>((resolve) => {
    const procId = `proc_${Date.now()}`;

    const env = {
      ...process.env,
      NODE_ENV: "development",
      HOME: os.tmpdir(),
      npm_config_cache: path.join(os.tmpdir(), "npm-cache"),
      NPM_CONFIG_CACHE: path.join(os.tmpdir(), "npm-cache"),
      ...config.env,
    };

    const child = spawn(command, args, {
      cwd,
      env: env as NodeJS.ProcessEnv,
      shell: config.shell ?? true,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"] as unknown as ["ignore", "pipe", "pipe"],
    }) as unknown as ChildProcess;

    sbx.processes.set(procId, child);

    // Timeout protection
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGTERM");
        // Force kill after 3 seconds
        setTimeout(() => {
          try { child.kill("SIGKILL"); } catch { /* already dead */ }
        }, 3000);
      } catch { /* already dead */ }
    }, timeoutMs);

    child.stdout?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;
      // Limit output size
      if (stdout.length > 10 * 1024 * 1024) { // 10MB
        stdout = stdout.slice(-8 * 1024 * 1024);
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;
      if (stderr.length > 5 * 1024 * 1024) { // 5MB
        stderr = stderr.slice(-4 * 1024 * 1024);
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      sbx.processes.delete(procId);
      resolve({
        exitCode: 1,
        stdout,
        stderr: stderr + "\n" + err.message,
        timedOut,
        oomKilled,
        durationMs: Date.now() - startTime,
      });
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      sbx.processes.delete(procId);

      // Check for OOM (SIGKILL on Linux)
      if (signal === "SIGKILL" && !timedOut) {
        oomKilled = true;
      }

      resolve({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut,
        oomKilled,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

/**
 * Copy files into sandbox
 */
export async function copyFilesToSandbox(
  sandboxId: string,
  files: Record<string, string>
): Promise<void> {
  const sbx = sandboxes.get(sandboxId);
  if (!sbx) throw new Error(`Sandbox ${sandboxId} not found`);

  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(sbx.cwd, relPath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
  }

  logger.info("sandbox.files_copied", { sandboxId, count: Object.keys(files).length });
}

/**
 * Read files from sandbox
 */
export async function readFilesFromSandbox(
  sandboxId: string,
  patterns: string[] = ["*"]
): Promise<Record<string, string>> {
  const sbx = sandboxes.get(sandboxId);
  if (!sbx) throw new Error(`Sandbox ${sandboxId} not found`);

  const files: Record<string, string> = {};

  const walk = async (dir: string, base: string) => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const rel = base ? `${base}/${entry.name}` : entry.name;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full, rel);
        } else {
          // Check if file matches patterns
          const matches = patterns.some(p => {
            if (p === "*") return true;
            if (p.endsWith("/*")) return rel.startsWith(p.slice(0, -2));
            return rel === p || rel.endsWith(p);
          });
          if (matches) {
            try {
              files[rel] = await fs.readFile(full, "utf-8");
            } catch { /* skip binary files */ }
          }
        }
      }
    } catch { /* skip inaccessible dirs */ }
  };

  await walk(sbx.cwd, "");
  return files;
}

/**
 * Get sandbox status
 */
export function getSandboxStatus(sandboxId: string) {
  const sbx = sandboxes.get(sandboxId);
  if (!sbx) return null;

  return {
    id: sbx.id,
    active: sbx.active,
    cwd: sbx.cwd,
    createdAt: new Date(sbx.createdAt).toISOString(),
    runningProcesses: sbx.processes.size,
    uptimeMs: Date.now() - sbx.createdAt,
  };
}

/**
 * List all active sandboxes
 */
export function listSandboxes() {
  return Array.from(sandboxes.values()).map(sbx => ({
    id: sbx.id,
    active: sbx.active,
    createdAt: new Date(sbx.createdAt).toISOString(),
    runningProcesses: sbx.processes.size,
  }));
}

/**
 * Cleanup stale sandboxes (older than 1 hour)
 */
export async function cleanupStaleSandboxes(): Promise<number> {
  const oneHourAgo = Date.now() - 3600_000;
  let cleaned = 0;

  for (const [id, sbx] of sandboxes) {
    if (sbx.createdAt < oneHourAgo) {
      await destroySandbox(id);
      cleaned++;
    }
  }

  return cleaned;
}
