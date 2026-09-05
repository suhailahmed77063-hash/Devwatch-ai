/**
 * AI Memory System
 * 
 * Stores and retrieves project-aware context for the AI agent.
 * Memory types:
 * - architecture: Project structure, tech stack, patterns
 * - preferences: User's coding style, preferences
 * - decisions: Key architectural decisions made
 * - issues: Known bugs, edge cases, warnings
 * - successful: What worked well, patterns to reuse
 */

import { requireDb } from "../db";
import { logger } from "../logger";
import { readAppFiles } from "../app/data";

// ── Types ──────────────────────────────────────────────────────────────────

export type MemoryType =
  | "architecture"   // Project structure, tech stack, patterns
  | "preferences"    // User's coding style, preferences
  | "decisions"      // Key architectural decisions
  | "issues"         // Known bugs, edge cases, warnings
  | "successful";    // What worked well, patterns to reuse

export interface MemoryEntry {
  id: string;
  projectId: string;
  type: MemoryType;
  key: string;
  value: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectContext {
  /** File structure summary */
  fileStructure: string;
  /** Tech stack detected */
  techStack: string;
  /** Key dependencies */
  dependencies: string[];
  /** Architecture decisions */
  architecture: string[];
  /** User preferences */
  preferences: string[];
  /** Known issues */
  issues: string[];
  /** Successful patterns */
  patterns: string[];
}

// ── In-Memory Store (per-process, fast) ────────────────────────────────────

const memoryStore = new Map<string, MemoryEntry[]>();

function getMemories(projectId: string): MemoryEntry[] {
  if (!memoryStore.has(projectId)) {
    memoryStore.set(projectId, []);
  }
  return memoryStore.get(projectId)!;
}

// ── Memory Operations ──────────────────────────────────────────────────────

/**
 * Add a memory entry
 */
export function addMemory(
  projectId: string,
  type: MemoryType,
  key: string,
  value: string,
  metadata?: Record<string, unknown>
): void {
  const memories = getMemories(projectId);
  
  // Update existing memory of same type and key, or create new
  const existing = memories.find((m) => m.type === type && m.key === key);
  if (existing) {
    existing.value = value;
    existing.metadata = metadata;
    existing.updatedAt = new Date();
  } else {
    memories.push({
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      projectId,
      type,
      key,
      value,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Keep memories bounded (max 50 per project)
  if (memories.length > 50) {
    memories.splice(0, memories.length - 50);
  }

  logger.debug("memory.added", { projectId, type, key });
}

/**
 * Get memories by type
 */
export function getMemoriesByType(projectId: string, type: MemoryType): MemoryEntry[] {
  return getMemories(projectId).filter((m) => m.type === type);
}

/**
 * Search memories by content
 */
export function searchMemories(projectId: string, query: string): MemoryEntry[] {
  const q = query.toLowerCase();
  return getMemories(projectId).filter(
    (m) => m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q)
  );
}

/**
 * Remove a memory entry
 */
export function removeMemory(projectId: string, id: string): void {
  const memories = getMemories(projectId);
  const idx = memories.findIndex((m) => m.id === id);
  if (idx !== -1) memories.splice(idx, 1);
}

/**
 * Clear all memories for a project
 */
export function clearMemories(projectId: string): void {
  memoryStore.delete(projectId);
}

// ── Context Builder ────────────────────────────────────────────────────────

/**
 * Build comprehensive project context for AI prompts
 */
export async function buildProjectContext(projectId: string): Promise<ProjectContext> {
  const files = await readAppFiles(projectId);
  const memories = getMemories(projectId);

  // Analyze file structure
  const fileStructure = analyzeFileStructure(files);
  
  // Detect tech stack
  const techStack = detectTechStack(files);
  
  // Extract dependencies
  const dependencies = extractDependencies(files);
  
  // Group memories by type
  const architecture = memories.filter((m) => m.type === "architecture").map((m) => m.value);
  const preferences = memories.filter((m) => m.type === "preferences").map((m) => m.value);
  const issues = memories.filter((m) => m.type === "issues").map((m) => m.value);
  const patterns = memories.filter((m) => m.type === "successful").map((m) => m.value);

  return {
    fileStructure,
    techStack,
    dependencies,
    architecture,
    preferences,
    issues,
    patterns,
  };
}

/**
 * Format project context for injection into AI prompts
 */
export function formatContextForPrompt(ctx: ProjectContext): string {
  const parts: string[] = [];

  if (ctx.fileStructure) {
    parts.push(`## Project Structure\n${ctx.fileStructure}`);
  }

  if (ctx.techStack) {
    parts.push(`## Tech Stack\n${ctx.techStack}`);
  }

  if (ctx.dependencies.length > 0) {
    parts.push(`## Dependencies\n${ctx.dependencies.join(", ")}`);
  }

  if (ctx.architecture.length > 0) {
    parts.push(`## Architecture Decisions\n${ctx.architecture.map((a) => `- ${a}`).join("\n")}`);
  }

  if (ctx.preferences.length > 0) {
    parts.push(`## User Preferences\n${ctx.preferences.map((p) => `- ${p}`).join("\n")}`);
  }

  if (ctx.issues.length > 0) {
    parts.push(`## Known Issues\n${ctx.issues.map((i) => `- ${i}`).join("\n")}`);
  }

  if (ctx.patterns.length > 0) {
    parts.push(`## Successful Patterns\n${ctx.patterns.map((p) => `- ${p}`).join("\n")}`);
  }

  return parts.join("\n\n");
}

// ── Analysis Helpers ───────────────────────────────────────────────────────

function analyzeFileStructure(files: Record<string, string>): string {
  const tree: string[] = [];
  const sorted = Object.keys(files).sort();
  
  for (const path of sorted) {
    const depth = path.split("/").length - 1;
    const indent = "  ".repeat(depth);
    const name = path.split("/").pop() || path;
    const size = files[path].length;
    tree.push(`${indent}${name} (${size} chars)`);
  }

  return tree.join("\n") || "No files";
}

function detectTechStack(files: Record<string, string>): string {
  const stack: string[] = [];

  // Check package.json
  const pkg = files["package.json"];
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg);
      if (parsed.dependencies) {
        if (parsed.dependencies.react) stack.push("React");
        if (parsed.dependencies.next) stack.push("Next.js");
        if (parsed.dependencies.express) stack.push("Express");
        if (parsed.dependencies["@prisma/client"]) stack.push("Prisma");
        if (parsed.dependencies.tailwindcss) stack.push("Tailwind CSS");
        if (parsed.dependencies.zod) stack.push("Zod");
        if (parsed.dependencies.bcrypt) stack.push("bcrypt");
        if (parsed.dependencies.jsonwebtoken) stack.push("JWT");
        if (parsed.dependencies.stripe) stack.push("Stripe");
      }
      if (parsed.devDependencies) {
        if (parsed.devDependencies.typescript) stack.push("TypeScript");
        if (parsed.devDependencies.vitest) stack.push("Vitest");
      }
    } catch { /* ignore parse errors */ }
  }

  // Check file extensions
  const exts = new Set(Object.keys(files).map((f) => f.split(".").pop()));
  if (exts.has("prisma")) stack.push("PostgreSQL");
  if (exts.has("tsx") || exts.has("ts")) stack.push("TypeScript");

  return stack.join(", ") || "Unknown";
}

function extractDependencies(files: Record<string, string>): string[] {
  const pkg = files["package.json"];
  if (!pkg) return [];

  try {
    const parsed = JSON.parse(pkg);
    return [
      ...Object.keys(parsed.dependencies || {}),
      ...Object.keys(parsed.devDependencies || {}),
    ];
  } catch {
    return [];
  }
}

// ── Memory Extraction from Interactions ─────────────────────────────────────

/**
 * Extract and store memories from an AI interaction
 */
export function extractMemoriesFromInteraction(
  projectId: string,
  prompt: string,
  result: { success: boolean; filesGenerated?: string[]; error?: string }
): void {
  // Extract architecture info from file generation
  if (result.filesGenerated && result.filesGenerated.length > 0) {
    const fileTypes = result.filesGenerated.reduce((acc, f) => {
      const dir = f.split("/")[0] || "root";
      acc[dir] = (acc[dir] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const archSummary = Object.entries(fileTypes)
      .map(([dir, count]) => `${dir}: ${count} files`)
      .join(", ");
    
    addMemory(projectId, "architecture", "file-organization", archSummary, {
      files: result.filesGenerated,
    });
  }

  // Extract successful patterns
  if (result.success) {
    const pattern = prompt.length > 100 ? prompt.slice(0, 100) + "..." : prompt;
    addMemory(projectId, "successful", `pattern-${Date.now()}`, `Successfully built: ${pattern}`);
  }

  // Extract issues from errors
  if (result.error) {
    addMemory(projectId, "issues", `issue-${Date.now()}`, result.error);
  }

  // Extract user preferences from prompt analysis
  if (prompt.toLowerCase().includes("dark")) {
    addMemory(projectId, "preferences", "theme", "User prefers dark theme");
  }
  if (prompt.toLowerCase().includes("simple") || prompt.toLowerCase().includes("minimal")) {
    addMemory(projectId, "preferences", "complexity", "User prefers simple/minimal design");
  }
  if (prompt.toLowerCase().includes("responsive")) {
    addMemory(projectId, "preferences", "responsive", "User wants responsive design");
  }
}
