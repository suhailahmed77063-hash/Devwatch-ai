/**
 * Universal Tool-Calling System
 * 
 * Every tool has: name, description, input schema, execution handler.
 * The AI agent automatically chooses tools based on the task.
 */

import { requireDb } from "../db";
import { logger } from "../logger";
import { runCommand } from "./workspace";
import { readAppFiles, applyFileOps } from "./data";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { workspaceDir } from "./templates";

// ── Tool Definition ────────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, { type: string; description: string; required?: boolean }>;
  execute: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  projectId: string;
  userId: string;
  workingDir: string;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

// ── Tool Registry ──────────────────────────────────────────────────────────

const tools: Map<string, ToolDefinition> = new Map();

function registerTool(tool: ToolDefinition) {
  tools.set(tool.name, tool);
}

// ── File Operations ────────────────────────────────────────────────────────

registerTool({
  name: "file_read",
  description: "Read the contents of a file in the project",
  inputSchema: {
    path: { type: "string", description: "File path relative to project root", required: true },
  },
  execute: async (input, ctx) => {
    try {
      const filePath = path.join(ctx.workingDir, input.path as string);
      if (!existsSync(filePath)) {
        return { success: false, output: "", error: `File not found: ${input.path}` };
      }
      const content = readFileSync(filePath, "utf-8");
      return { success: true, output: content };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "file_write",
  description: "Write content to a file in the project",
  inputSchema: {
    path: { type: "string", description: "File path relative to project root", required: true },
    content: { type: "string", description: "File content to write", required: true },
  },
  execute: async (input, ctx) => {
    try {
      const filePath = path.join(ctx.workingDir, input.path as string);
      const dir = path.dirname(filePath);
      mkdirSync(dir, { recursive: true });
      writeFileSync(filePath, input.content as string, "utf-8");
      return { success: true, output: `File written: ${input.path}` };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "file_delete",
  description: "Delete a file from the project",
  inputSchema: {
    path: { type: "string", description: "File path relative to project root", required: true },
  },
  execute: async (input, ctx) => {
    try {
      const filePath = path.join(ctx.workingDir, input.path as string);
      if (!existsSync(filePath)) {
        return { success: false, output: "", error: `File not found: ${input.path}` };
      }
      rmSync(filePath, { recursive: true });
      return { success: true, output: `File deleted: ${input.path}` };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "file_list",
  description: "List all files in a directory",
  inputSchema: {
    path: { type: "string", description: "Directory path (default: root)" },
  },
  execute: async (input, ctx) => {
    try {
      const dirPath = path.join(ctx.workingDir, (input.path as string) || ".");
      const files = readdirSync(dirPath, { withFileTypes: true });
      const listing = files.map(f => `${f.isDirectory() ? "📁" : "📄"} ${f.name}`).join("\n");
      return { success: true, output: listing || "Empty directory" };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "file_search",
  description: "Search for files by name pattern",
  inputSchema: {
    pattern: { type: "string", description: "Search pattern (filename or glob)", required: true },
  },
  execute: async (input, ctx) => {
    try {
      const results: string[] = [];
      const searchDir = (dir: string, depth = 0) => {
        if (depth > 5) return;
        try {
          const entries = readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name === "node_modules" || entry.name === ".git") continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              searchDir(fullPath, depth + 1);
            } else if (entry.name.includes(input.pattern as string)) {
              results.push(path.relative(ctx.workingDir, fullPath));
            }
          }
        } catch { /* skip */ }
      };
      searchDir(ctx.workingDir);
      return { success: true, output: results.length ? results.join("\n") : "No files found" };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

// ── Terminal Operations ────────────────────────────────────────────────────

registerTool({
  name: "terminal_execute",
  description: "Execute a shell command in an isolated sandbox",
  inputSchema: {
    command: { type: "string", description: "Shell command to execute", required: true },
    timeout: { type: "number", description: "Timeout in seconds (default: 60)" },
  },
  execute: async (input, ctx) => {
    try {
      // Use sandbox execution for safety
      const { createSandbox, copyFilesToSandbox, executeInSandbox, destroySandbox } = await import("../sandbox/manager");
      const { readAppFiles } = await import("./data");
      
      const sandbox = await createSandbox(ctx.projectId);
      const files = await readAppFiles(ctx.projectId);
      await copyFilesToSandbox(sandbox.id, files);
      
      const timeoutMs = ((input.timeout as number) || 60) * 1000;
      const result = await executeInSandbox(
        sandbox.id,
        input.command as string,
        [],
        { timeoutMs }
      );
      
      await destroySandbox(sandbox.id);
      
      const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
      return {
        success: result.exitCode === 0,
        output: output.slice(0, 10000) || (result.exitCode === 0 ? "Command completed successfully" : "Command failed"),
        error: result.exitCode !== 0 ? `Exit code: ${result.exitCode}${result.timedOut ? " (timeout)" : ""}` : undefined,
      };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "package_install",
  description: "Install npm packages",
  inputSchema: {
    packages: { type: "string", description: "Space-separated package names", required: true },
  },
  execute: async (input, ctx) => {
    try {
      const pkgs = (input.packages as string).split(/\s+/).filter(Boolean);
      const result = await runCommand(ctx.workingDir, "npm", ["install", ...pkgs, "--no-audit", "--no-fund"], 120000);
      return {
        success: result.code === 0,
        output: result.stdout.slice(-3000) || "Packages installed",
        error: result.code !== 0 ? result.stderr.slice(-2000) : undefined,
      };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

// ── Git Operations ─────────────────────────────────────────────────────────

registerTool({
  name: "git_status",
  description: "Check git status of the project",
  inputSchema: {},
  execute: async (_input, ctx) => {
    try {
      const result = await runCommand(ctx.workingDir, "git", ["status", "--short"], 10000);
      return { success: true, output: result.stdout || "Clean working tree" };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "git_commit",
  description: "Commit all changes with a message",
  inputSchema: {
    message: { type: "string", description: "Commit message", required: true },
  },
  execute: async (input, ctx) => {
    try {
      await runCommand(ctx.workingDir, "git", ["add", "-A"], 10000);
      const result = await runCommand(ctx.workingDir, "git", ["commit", "-m", input.message as string], 10000);
      return { success: result.code === 0, output: result.stdout || "Committed", error: result.code !== 0 ? result.stderr : undefined };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

// ── Project Operations ─────────────────────────────────────────────────────

registerTool({
  name: "project_read_files",
  description: "Read all project files from database",
  inputSchema: {},
  execute: async (_input, ctx) => {
    try {
      const files = await readAppFiles(ctx.projectId);
      const listing = Object.entries(files).map(([p, c]) => `${p} (${c.length} chars)`).join("\n");
      return { success: true, output: `Project files (${Object.keys(files).length}):\n${listing}` };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "project_write_files",
  description: "Write multiple files to the project at once",
  inputSchema: {
    files: { type: "string", description: "JSON array of {path, content} objects", required: true },
  },
  execute: async (input, ctx) => {
    try {
      const files = JSON.parse(input.files as string) as { path: string; content: string }[];
      const ops = files.map(f => ({ kind: "edit" as const, path: f.path, content: f.content }));
      const labels = await applyFileOps(ctx.projectId, ops, ctx.userId);
      return { success: true, output: `Wrote ${labels.length} files:\n${labels.join("\n")}` };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "run_tests",
  description: "Run tests in the project (vitest, jest, etc.)",
  inputSchema: {},
  execute: async (_input, ctx) => {
    try {
      const result = await runCommand(ctx.workingDir, "npx", ["vitest", "run", "--reporter=basic"], 120000);
      return {
        success: result.code === 0,
        output: (result.stdout + "\n" + result.stderr).slice(-5000),
        error: result.code !== 0 ? "Tests failed" : undefined,
      };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "typecheck",
  description: "Run TypeScript type checking",
  inputSchema: {},
  execute: async (_input, ctx) => {
    try {
      const result = await runCommand(ctx.workingDir, "npx", ["tsc", "--noEmit"], 120000);
      return {
        success: result.code === 0,
        output: (result.stdout + "\n" + result.stderr).slice(-5000),
        error: result.code !== 0 ? "Type errors found" : undefined,
      };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

// ── Exports ────────────────────────────────────────────────────────────────

export function getToolDefinitions(): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
  return Array.from(tools.values()).map(t => ({
    name: t.name,
    description: t.description,
    parameters: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(t.inputSchema).map(([k, v]) => [k, { type: v.type, description: v.description }])
      ),
      required: Object.entries(t.inputSchema).filter(([, v]) => v.required).map(([k]) => k),
    },
  }));
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const tool = tools.get(name);
  if (!tool) {
    return { success: false, output: "", error: `Unknown tool: ${name}` };
  }

  const start = Date.now();
  try {
    logger.info("tool.execute", { tool: name, projectId: context.projectId, userId: context.userId });
    const result = await tool.execute(input, context);
    const durationMs = Date.now() - start;
    logger.info("tool.completed", { tool: name, success: result.success, durationMs });
    return result;
  } catch (e) {
    const durationMs = Date.now() - start;
    logger.error("tool.failed", { tool: name, error: (e as Error).message, durationMs });
    return { success: false, output: "", error: (e as Error).message };
  }
}

export function listTools(): string[] {
  return Array.from(tools.keys());
}
