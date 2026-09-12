/**
 * Security Agent — tool permissions (least privilege by default).
 *
 * The AI never gets free-form execution. Every operation it may trigger is an
 * allowlisted tool; each tool declares the minimum role required and whether
 * it is a sensitive action needing explicit user authorization.
 * Every invocation is recorded as a SecurityAction row.
 */

import { ForbiddenError } from "@/lib/errors";
import type { Role } from "@prisma/client";

export type SecurityTool =
  | "READ_REPOSITORY"
  | "RUN_STATIC_SCAN"
  | "READ_DEPENDENCIES"
  | "ANALYZE_CODE"
  | "RUN_SANDBOX_TEST"
  | "GENERATE_PATCH"
  | "CREATE_GITHUB_ISSUE"
  | "COMMENT_ON_PR";

interface ToolPolicy {
  description: string;
  minRole: Role;
  /** Sensitive actions require explicit user authorization in the request. */
  requiresExplicitAuth: boolean;
  /** Environments this tool may run in (never "production"). */
  environment?: "isolated-sandbox" | "server";
}

export const TOOL_POLICIES: Record<SecurityTool, ToolPolicy> = {
  READ_REPOSITORY: {
    description: "Read repository files (linked repo, GitHub link, or workspace snapshot)",
    minRole: "VIEWER",
    requiresExplicitAuth: false,
    environment: "server",
  },
  RUN_STATIC_SCAN: {
    description: "Run SAST / secret / dependency / config scanners",
    minRole: "VIEWER",
    requiresExplicitAuth: false,
    environment: "server",
  },
  READ_DEPENDENCIES: {
    description: "Parse dependency manifests and query the OSV vulnerability database",
    minRole: "VIEWER",
    requiresExplicitAuth: false,
    environment: "server",
  },
  ANALYZE_CODE: {
    description: "AI code-path analysis and exploitability reasoning",
    minRole: "VIEWER",
    requiresExplicitAuth: false,
    environment: "server",
  },
  RUN_SANDBOX_TEST: {
    description: "Run a non-destructive PoC inside the isolated sandbox",
    minRole: "ADMIN",
    requiresExplicitAuth: true,
    environment: "isolated-sandbox",
  },
  GENERATE_PATCH: {
    description: "Generate a proposed patch/diff (proposal only — never merged)",
    minRole: "EDITOR",
    requiresExplicitAuth: false,
    environment: "server",
  },
  CREATE_GITHUB_ISSUE: {
    description: "Open a GitHub issue with the finding summary",
    minRole: "EDITOR",
    requiresExplicitAuth: false,
    environment: "server",
  },
  COMMENT_ON_PR: {
    description: "Attach the security status report to a pull request",
    minRole: "EDITOR",
    requiresExplicitAuth: false,
    environment: "server",
  },
};

const ROLE_ORDER: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2, OWNER: 3 };

export function atLeastRole(role: Role, min: Role): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER[min];
}

export class PermissionDeniedError extends ForbiddenError {
  constructor(tool: SecurityTool, reason: string) {
    super(`Security agent tool ${tool} denied: ${reason}`);
    this.name = "PermissionDeniedError";
  }
}

/**
 * Enforce the tool policy before execution. `explicitAuth` is the user's
 * deliberate opt-in (e.g. the "Validate in Sandbox" button + confirm dialog).
 */
export function assertToolAllowed(opts: {
  tool: SecurityTool;
  role: Role;
  explicitAuth?: boolean;
}): { environment: "isolated-sandbox" | "server" } {
  const policy = TOOL_POLICIES[opts.tool];
  if (!atLeastRole(opts.role, policy.minRole)) {
    throw new PermissionDeniedError(opts.tool, `requires the ${policy.minRole.toLowerCase()} role`);
  }
  if (policy.requiresExplicitAuth && !opts.explicitAuth) {
    throw new PermissionDeniedError(opts.tool, "requires explicit user authorization");
  }
  return { environment: policy.environment ?? "server" };
}

export function toolDescription(tool: SecurityTool): string {
  return TOOL_POLICIES[tool].description;
}
