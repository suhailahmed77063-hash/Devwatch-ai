import { z } from "zod";
import type { AppBlueprint, AppFileOp } from "@/types/app";
import { ValidationError } from "@/lib/errors";

export const fileOpSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("create"), path: z.string().min(1).max(300), content: z.string().max(400_000) }),
  z.object({ kind: z.literal("edit"), path: z.string().min(1).max(300), content: z.string().max(400_000) }),
  z.object({ kind: z.literal("delete"), path: z.string().min(1).max(300) }),
  z.object({ kind: z.literal("rename"), path: z.string().min(1).max(300), newPath: z.string().min(1).max(300) }),
]);

export const blueprintSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(600).default(""),
  stack: z.string().max(120).default("TypeScript"),
  modules: z.array(z.string().max(60)).max(30).default([]),
  dataModels: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        fields: z
          .array(
            z.object({
              name: z.string().min(1).max(60),
              type: z.string().min(1).max(40),
              optional: z.boolean().default(false),
              unique: z.boolean().default(false),
            })
          )
          .max(40)
          .default([]),
      })
    )
    .max(25)
    .default([]),
  apiRoutes: z
    .array(
      z.object({
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
        path: z.string().min(1).max(200),
        description: z.string().max(200).default(""),
        protected: z.boolean().default(false),
      })
    )
    .max(60)
    .default([]),
  envRequirements: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        secret: z.boolean().default(true),
        required: z.boolean().default(true),
        description: z.string().max(200).default(""),
      })
    )
    .max(30)
    .default([]),
  // Lenient on purpose: free models often omit fields or return objects where
  // strings are expected. Defaults + coercion repair the output instead of
  // failing the whole generation; normalizeBlueprint() fills the gaps.
  pages: z
    .array(
      z.object({
        route: z.string().max(200).default(""),
        name: z.string().max(80).default(""),
        components: z.array(z.string().max(60)).max(20).default([]),
      })
    )
    .max(30)
    .default([]),
  testPlan: z
    .array(z.union([z.string().max(300), z.record(z.string(), z.any())]))
    .max(20)
    .transform((items) =>
      items.map((i) => {
        if (typeof i === "string") return i;
        const named = (i as Record<string, unknown>).name;
        return typeof named === "string" && named ? named : JSON.stringify(i);
      })
    )
    .default([]),
});

export const appPlanSchema = z.object({
  summary: z.string().min(1).max(1200),
  steps: z.array(z.string().min(1).max(200)).max(12),
  operations: z.array(fileOpSchema).max(120),
  runTests: z.boolean().default(true),
});

export const appFixSchema = z.object({
  summary: z.string().max(600).default(""),
  operations: z.array(fileOpSchema).max(60),
  continue: z.boolean().default(true),
});

export const appFilesSchema = z.object({
  files: z.array(z.object({ path: z.string().min(1).max(300), content: z.string().max(400_000) })).max(100),
  summary: z.string().max(800).default(""),
});

export type AppPlan = z.infer<typeof appPlanSchema>;
export type AppFix = z.infer<typeof appFixSchema>;
export type AppFilesResult = z.infer<typeof appFilesSchema>;

/** Allowed file extensions (prevents the agent writing binaries/arbitrary scripts). */
const ALLOWED_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".txt", ".env.example",
  ".css", ".html", ".yml", ".yaml", ".prisma", ".sql", ".svg", ".png", ".jpg", ".jpeg", ".webp",
]);

/** Whole-filename allowlist for common dotfiles that carry no extension. */
const ALLOWED_DOTFILES = new Set([
  ".gitignore", ".dockerignore", ".npmrc", ".nvmrc", ".editorconfig", ".prettierrc", ".eslintrc",
  ".env", ".env.production", ".env.development", ".env.local", ".env.test",
]);

const BLOCKED_PATHS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "coverage", "package-lock.json", "package-lock.yaml",
]);

/**
 * Validate a repo-relative path: no traversal, no absolute paths, no drive
 * letters, no blocked directories, allowed extension. Throws ValidationError.
 */
export function assertSafePath(path: string, { allowAnyExt = false }: { allowAnyExt?: boolean } = {}): string {
  const p = path.trim().replace(/\\/g, "/");
  if (!p || p.startsWith("/") || p.startsWith("./") || /^[a-zA-Z]:/.test(p) || p.includes("\0")) {
    throw new ValidationError("Unsafe file path — paths must be repository-relative like src/app.ts");
  }
  const segments = p.split("/");
  if (segments.some((s) => s === ".." || s === "")) {
    throw new ValidationError("Unsafe file path — no traversal or empty segments allowed");
  }
  if (BLOCKED_PATHS.has(segments[0])) {
    throw new ValidationError(`Path starts with a blocked directory: ${segments[0]}`);
  }
  if (!allowAnyExt) {
    const name = p.split("/").pop() ?? "";
    // Whole-filename allowlist first (dotfiles like .env.example, .gitignore).
    if (ALLOWED_EXT.has(name) || ALLOWED_DOTFILES.has(name)) {
      // ok
    } else {
      const ext = "." + (name.split(".").pop() ?? "");
      if (!ALLOWED_EXT.has(ext)) {
        throw new ValidationError(`File type not allowed: ${ext || "(none)"}`);
      }
    }
  }
  if (p.length > 300) throw new ValidationError("Path is too long (max 300 characters)");
  return p;
}

export function validateOps(ops: AppFileOp[]): AppFileOp[] {
  if (ops.length > 100) throw new ValidationError("Too many file operations in one request (max 100)");
  return ops.map((op) => {
    switch (op.kind) {
      case "create":
      case "edit":
        return { ...op, path: assertSafePath(op.path) };
      case "delete":
        return { ...op, path: assertSafePath(op.path) };
      case "rename":
        return { ...op, path: assertSafePath(op.path), newPath: assertSafePath(op.newPath) };
    }
  });
}

/** Human label for a single op, used in UI + audit logs. */
export function describeOp(op: AppFileOp): string {
  switch (op.kind) {
    case "create":
      return `Create ${op.path}`;
    case "edit":
      return `Update ${op.path}`;
    case "delete":
      return `Delete ${op.path}`;
    case "rename":
      return `Rename ${op.path} → ${op.newPath}`;
  }
}

export function normalizeBlueprint(input: unknown): AppBlueprint {
  const check = blueprintSchema.safeParse(input);
  if (!check.success) {
    const detail = check.error.issues.slice(0, 5).map((i) => `${i.path.join(".")} ${i.message}`).join("; ");
    throw new ValidationError(`App blueprint failed validation${detail ? ` (${detail})` : ""}`);
  }
  const data = check.data;
  // Fill missing page names/routes so downstream prompts stay consistent.
  for (const p of data.pages) {
    if (!p.name) p.name = p.route ? (p.route.replace(/^\/+/, "") || "Home") : "Page";
    if (!p.route) p.route = `/${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }
  return data;
}