/**
 * AI Security Agent — Validator (isolated sandbox execution).
 *
 * Executes the non-destructive PoC for a finding inside an isolated child
 * process: empty environment (no secrets), writable temp dir, hard timeout,
 * killed on overrun, output capped, directory destroyed afterwards. The
 * sandbox has no access to DevWatch credentials and no network-bearing env.
 */

import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { RawFinding } from "./types";
import { buildPoc, type PocPlan } from "./poc";

export const SANDBOX_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 64 * 1024;

export interface SandboxResult {
  status: "exploitable" | "not_exploitable" | "inconclusive" | "failed";
  output: string;
  durationMs: number;
  error?: string;
}

export interface SandboxExecution {
  plan: PocPlan | null;
  result: SandboxResult | null;
}

function runNode(
  scriptPath: string,
  cwd: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; code: number | null; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--no-warnings", scriptPath], {
      cwd,
      env: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        HOME: cwd,
        NODE_ENV: "development",
        // No secrets, tokens or database URLs propagate into the sandbox.
      },
      stdio: ["ignore", "pipe", "pipe"] as const,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const collect = (chunk: Buffer, into: "out" | "err") => {
      const text = chunk.toString("utf8");
      if (into === "out") {
        if (stdout.length < MAX_OUTPUT_BYTES) stdout += text.slice(0, MAX_OUTPUT_BYTES - stdout.length);
      } else {
        if (stderr.length < MAX_OUTPUT_BYTES) stderr += text.slice(0, MAX_OUTPUT_BYTES - stderr.length);
      }
    };
    child.stdout?.on("data", (c: Buffer) => collect(c, "out"));
    child.stderr?.on("data", (c: Buffer) => collect(c, "err"));

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: `${stderr}\n${err.message}`.trim(), code: null, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code, timedOut });
    });
  });
}

/**
 * Execute the PoC plan for a finding in the isolated sandbox.
 * Returns `plan: null` when the finding class has no safe PoC (inconclusive).
 */
export async function runSandboxValidation(finding: RawFinding, timeoutMs = SANDBOX_TIMEOUT_MS): Promise<SandboxExecution> {
  const plan = buildPoc(finding);
  if (!plan) return { plan: null, result: null };

  const started = Date.now();
  let dir: string | null = null;
  try {
    dir = await mkdtemp(path.join(tmpdir(), "dw-sec-sandbox-"));
    const scriptPath = path.join(dir, "poc.js");
    await writeFile(scriptPath, plan.script, "utf8");

    const { stdout, stderr, timedOut } = await runNode(scriptPath, dir, timeoutMs);

    if (timedOut) {
      return {
        plan,
        result: { status: "failed", output: stdout, durationMs: Date.now() - started, error: `Sandbox timeout after ${timeoutMs}ms — process killed` },
      };
    }

    const reproduced = /RESULT:\s*REPRODUCED/.test(stdout);
    const notReproduced = /RESULT:\s*NOT_REPRODUCED/.test(stdout);
    const skipped = /RESULT:\s*SKIP/.test(stdout);

    const status: SandboxResult["status"] = reproduced
      ? "exploitable"
      : notReproduced
        ? "not_exploitable"
        : skipped
          ? "inconclusive"
          : stderr
            ? "failed"
            : "inconclusive";

    return {
      plan,
      result: {
        status,
        output: `${stdout}${stderr ? `\n[stderr]\n${stderr}` : ""}`.slice(0, MAX_OUTPUT_BYTES),
        durationMs: Date.now() - started,
        error: status === "failed" ? "PoC script did not complete cleanly" : undefined,
      },
    };
  } catch (err) {
    return {
      plan,
      result: { status: "failed", output: "", durationMs: Date.now() - started, error: err instanceof Error ? err.message : String(err) },
    };
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
