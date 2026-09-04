import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { workspaceDir } from "./templates";
import { logger } from "../logger";

export interface CmdResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Quote a single argument for a cmd.exe command line. */
function quoteWinArg(a: string): string {
  if (/^[^\s"]+$/.test(a)) return a;
  return `"${a.replace(/"/g, '\\"')}"`;
}

/**
 * Run a command in the workspace with a hard timeout. Never throws — returns result.
 * Windows note: .cmd/.bat shims (npm, npx) cannot be spawned directly by
 * Node (spawn EINVAL), so they are routed through cmd.exe with
 * windowsVerbatimArguments — the canonical fix used by npm/CLI tooling.
 */
export async function runCommand(cwd: string, cmd: string, args: string[], timeoutMs = 120_000): Promise<CmdResult> {
  let file = cmd;
  let cargs = args;
  const opts: Record<string, unknown> = {
    cwd,
    windowsHide: true,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  };
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(cmd)) {
    file = process.env.ComSpec || "cmd.exe";
    const line = [cmd, ...args.map(quoteWinArg)].join(" ");
    cargs = ["/d", "/s", "/c", `"${line}"`];
    opts.windowsVerbatimArguments = true;
  }

  return new Promise<CmdResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let child;
    try {
      child = spawn(file, cargs, opts);
    } catch (e) {
      resolve({ code: 1, stdout: "", stderr: (e as Error).message ?? String(e) });
      return;
    }
    const timer = setTimeout(() => {
      settled = true;
      child.kill("SIGKILL");
      resolve({ code: 1, stdout, stderr: `${stderr}\n[timed out after ${timeoutMs}ms]` });
    }, timeoutMs);
    child.stdout?.on("data", (d: Buffer) => {
      if (stdout.length < 8 * 1024 * 1024) stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      if (stderr.length < 8 * 1024 * 1024) stderr += d.toString();
    });
    child.on("error", (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: e.message ?? String(e) });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

/** npx wrapper (works on Windows where node_modules/.bin shims are needed). */
export async function runNpx(cwd: string, args: string[], timeoutMs = 180_000): Promise<CmdResult> {
  // Prefer the repo's node_modules/.bin shim so cached tooling works offline.
  const localBin = path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "npx.cmd" : "npx");
  try {
    const res = await runCommand(cwd, localBin, args, timeoutMs);
    if (res.code === 0) return res;
  } catch {
    // fall through to global npx
  }
  return runCommand(cwd, process.platform === "win32" ? "npx.cmd" : "npx", args, timeoutMs);
}

/** Materialize the DB workspace (files + .env) on disk. Returns the dir. */
export async function syncWorkspaceToDisk(projectId: string, files: Record<string, string>, envVars?: Record<string, string>): Promise<string> {
  const dir = workspaceDir(projectId);
  fs.mkdirSync(dir, { recursive: true });

  // Remove stale files not present in the current snapshot (careful: only inside this dir).
  const existing = walkDir(dir);
  for (const rel of existing) {
    if (rel === ".env" || rel === ".git") continue;
    if (!(rel in files)) {
      try {
        fs.rmSync(path.join(dir, rel), { recursive: true, force: true });
      } catch (e) {
        logger.warn("app.workspace.clean_failed", { projectId, rel, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf8");
  }

  // Real .env for the sandbox — values only ever touch the server.
  if (envVars) {
    const lines = Object.entries(envVars).map(([k, v]) => `${k}=${v.includes("\n") || v.includes(" ") ? JSON.stringify(v) : v}`);
    fs.writeFileSync(path.join(dir, ".env"), lines.join("\n") + "\n", "utf8");
  }

  // Git repo for traceability of every AI change (best-effort, never fatal).
  await ensureGitRepo(dir);
  return dir;
}

function walkDir(dir: string, base = ""): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (rel === ".git" || rel === "node_modules") continue;
    if (e.isDirectory()) out.push(...walkDir(path.join(dir, e.name), rel));
    else out.push(rel);
  }
  return out;
}

export async function ensureGitRepo(dir: string): Promise<void> {
  if (fs.existsSync(path.join(dir, ".git"))) return;
  try {
    await runCommand(dir, "git", ["init", "-q"]);
    await runCommand(dir, "git", ["config", "user.email", process.env.GIT_AI_EMAIL ?? "ai@webforge.app"]);
    await runCommand(dir, "git", ["config", "user.name", process.env.GIT_AI_NAME ?? "WebForge AI"]);
  } catch (e) {
    logger.warn("app.git.init_failed", { error: e instanceof Error ? e.message : String(e) });
  }
}

export async function gitCommit(dir: string, message: string): Promise<string | null> {
  try {
    await runCommand(dir, "git", ["add", "-A"]);
    const res = await runCommand(dir, "git", ["commit", "-q", "-m", message.slice(0, 200)]);
    if (res.code !== 0) return null; // nothing to commit
    const log = await runCommand(dir, "git", ["rev-parse", "HEAD"]);
    return log.stdout.trim() || null;
  } catch (e) {
    logger.warn("app.git.commit_failed", { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export async function gitLog(dir: string, limit = 20): Promise<{ hash: string; message: string; date: string }[]> {
  try {
    const res = await runCommand(dir, "git", ["log", `--max-count=${limit}`, "--format=%H|%s|%cI"]);
    if (res.code !== 0) return [];
    return res.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, ...rest] = line.split("|");
        const message = rest.slice(0, -1).join("|");
        const date = rest[rest.length - 1] ?? "";
        return { hash: hash.slice(0, 10), message, date };
      });
  } catch {
    return [];
  }
}