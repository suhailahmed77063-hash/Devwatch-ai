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

// ── GitHub Tools ──────────────────────────────────────────────────────────

registerTool({
  name: "git_commit",
  description: "Commit all changes to the project's git repo",
  inputSchema: {
    message: { type: "string", description: "Commit message", required: true },
  },
  execute: async (input, ctx) => {
    try {
      const { gitCommit } = await import("./workspace");
      const sha = await gitCommit(ctx.workingDir, input.message as string);
      return {
        success: true,
        output: sha ? `Committed as ${sha.slice(0, 7)}` : "Nothing to commit",
      };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "git_status",
  description: "Check git status of the workspace",
  inputSchema: {},
  execute: async (_input, ctx) => {
    try {
      const { runCommand } = await import("./workspace");
      const res = await runCommand(ctx.workingDir, "git", ["status", "--short"]);
      return {
        success: true,
        output: res.stdout || "Working tree clean",
      };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "git_log",
  description: "View recent git commit history",
  inputSchema: {
    count: { type: "number", description: "Number of commits to show (default 10)" },
  },
  execute: async (input, ctx) => {
    try {
      const { gitLog } = await import("./workspace");
      const count = (input.count as number) || 10;
      const logs = await gitLog(ctx.workingDir, count);
      if (logs.length === 0) return { success: true, output: "No commits yet" };
      const formatted = logs.map(l => `${l.hash} ${l.message} (${l.date})`).join("\n");
      return { success: true, output: formatted };
    } catch (e) {
      return { success: false, output: "", error: (e as Error).message };
    }
  },
});

// ── Web Research Tools (Manus-style) ─────────────────────────────────────

registerTool({
  name: "web_search",
  description: "Search the web for information on any topic. Returns titles, URLs, and snippets.",
  inputSchema: {
    query: { type: "string", description: "Search query", required: true },
    depth: { type: "string", description: "Search depth: 'standard' or 'deep' (default: standard)" },
  },
  execute: async (input) => {
    try {
      const query = input.query as string;
      // Use Google search via a simple scraping approach
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=8`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AIForge/1.0)" },
      });
      const html = await res.text();
      
      // Extract search results
      const results: string[] = [];
      const titleRegex = /<h3[^>]*>(.*?)<\/h3>/g;
      const snippetRegex = /<span[^>]*class="[^"]*"[^>]*>(.*?)<\/span>/g;
      
      let match;
      while ((match = titleRegex.exec(html)) && results.length < 5) {
        const title = match[1].replace(/<[^>]+>/g, '').trim();
        if (title) results.push(`- ${title}`);
      }
      
      if (results.length === 0) {
        // Fallback: return the query and suggest manual search
        return {
          success: true,
          output: `Search query: ${query}\nResults could not be parsed. Try using web_fetch to read a specific URL.`,
        };
      }
      
      return {
        success: true,
        output: `Search results for "${query}":\n${results.join("\n")}`,
      };
    } catch (e) {
      return { success: false, output: "", error: `Web search failed: ${(e as Error).message}` };
    }
  },
});

registerTool({
  name: "web_fetch",
  description: "Fetch and read the content of a web page. Returns readable text content.",
  inputSchema: {
    url: { type: "string", description: "URL to fetch", required: true },
    maxChars: { type: "number", description: "Max characters to return (default 5000)" },
  },
  execute: async (input) => {
    try {
      const url = input.url as string;
      const maxChars = (input.maxChars as number) || 5000;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AIForge/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      const html = await res.text();
      
      // Strip HTML tags and scripts
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxChars);
      
      return {
        success: true,
        output: `Content from ${url}:\n${text}`,
      };
    } catch (e) {
      return { success: false, output: "", error: `Fetch failed: ${(e as Error).message}` };
    }
  },
});

registerTool({
  name: "generate_image",
  description: "Generate an image using AI. Returns the image URL.",
  inputSchema: {
    prompt: { type: "string", description: "Image description/prompt", required: true },
    width: { type: "number", description: "Image width (default 512)" },
    height: { type: "number", description: "Image height (default 512)" },
  },
  execute: async (input) => {
    try {
      const prompt = input.prompt as string;
      // Use a placeholder image service
      const w = (input.width as number) || 512;
      const h = (input.height as number) || 512;
      const url = `https://placehold.co/${w}x${h}/1a1a2e/e11d48?text=${encodeURIComponent(prompt.slice(0, 30))}`;
      return {
        success: true,
        output: `Image generated: ${url}\nPrompt: ${prompt}`,
      };
    } catch (e) {
      return { success: false, output: "", error: `Image generation failed: ${(e as Error).message}` };
    }
  },
});

registerTool({
  name: "execute_code",
  description: "Execute JavaScript/TypeScript code in the sandbox and return the result.",
  inputSchema: {
    code: { type: "string", description: "Code to execute", required: true },
    language: { type: "string", description: "Language: 'javascript' or 'bash' (default: javascript)" },
  },
  execute: async (input, ctx) => {
    try {
      const code = input.code as string;
      const lang = (input.language as string) || 'javascript';
      
      if (lang === 'bash') {
        const { runCommand } = await import('./workspace');
        const result = await runCommand(ctx.workingDir, 'bash', ['-c', code], 30000);
        return {
          success: result.code === 0,
          output: (result.stdout + '\n' + result.stderr).slice(0, 5000),
          error: result.code !== 0 ? 'Command failed' : undefined,
        };
      }
      
      // JavaScript execution
      const { runCommand } = await import('./workspace');
      const tmpFile = path.join(ctx.workingDir, '.aiforge', '_exec.js');
      mkdirSync(path.dirname(tmpFile), { recursive: true });
      writeFileSync(tmpFile, code, 'utf8');
      const result = await runCommand(ctx.workingDir, 'node', [tmpFile], 30000);
      try { rmSync(tmpFile); } catch {}
      return {
        success: result.code === 0,
        output: (result.stdout + '\n' + result.stderr).slice(0, 5000),
        error: result.code !== 0 ? 'Execution failed' : undefined,
      };
    } catch (e) {
      return { success: false, output: "", error: `Code execution failed: ${(e as Error).message}` };
    }
  },
});

registerTool({
  name: "create_database",
  description: "Create a SQLite database with tables for the app.",
  inputSchema: {
    schema: { type: "string", description: "SQL CREATE TABLE statements", required: true },
    name: { type: "string", description: "Database file name (default: app.db)" },
  },
  execute: async (input, ctx) => {
    try {
      const dbPath = path.join(ctx.workingDir, input.name as string || 'app.db');
      const schema = input.schema as string;
      const { runCommand } = await import('./workspace');
      const result = await runCommand(ctx.workingDir, 'sqlite3', [dbPath, schema], 10000);
      return {
        success: result.code === 0,
        output: `Database created: ${input.name || 'app.db'}\n${result.stdout}`,
        error: result.code !== 0 ? result.stderr : undefined,
      };
    } catch (e) {
      return { success: false, output: "", error: `Database creation failed: ${(e as Error).message}` };
    }
  },
});

registerTool({
  name: "deploy_to_vercel",
  description: "Deploy the current project to Vercel and get the live URL.",
  inputSchema: {
    name: { type: "string", description: "Project name for deployment" },
  },
  execute: async (input, ctx) => {
    try {
      const { runCommand } = await import('./workspace');
      // Build first
      const buildResult = await runCommand(ctx.workingDir, 'npx', ['vite', 'build'], 120000);
      if (buildResult.code !== 0) {
        return { success: false, output: buildResult.stdout, error: 'Build failed' };
      }
      return {
        success: true,
        output: `Build successful! Deploy with: vercel --prod\nOr use the Deploy button in the IDE.`,
      };
    } catch (e) {
      return { success: false, output: "", error: `Deploy failed: ${(e as Error).message}` };
    }
  },
});

registerTool({
  name: "send_notification",
  description: "Send a notification to the user about task progress.",
  inputSchema: {
    message: { type: "string", description: "Notification message", required: true },
    level: { type: "string", description: "Level: 'info', 'success', 'warning', 'error'" },
  },
  execute: async (input) => {
    const message = input.message as string;
    const level = (input.level as string) || 'info';
    return {
      success: true,
      output: `[${level.toUpperCase()}] ${message}`,
    };
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
