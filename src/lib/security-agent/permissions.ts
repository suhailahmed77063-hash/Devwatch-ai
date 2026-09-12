/**
 * AI Security Agent — tool permissions (least privilege by default).
 * Every agent operation goes through an allowlisted tool with a minimum role
 * and, for sensitive actions, an explicit-authorization requirement.
 */

export type AgentTool =
  | "READ_REPOSITORY"
  | "RUN_STATIC_SCAN"
  | "READ_DEPENDENCIES"
  | "ANALYZE_CODE"
  | "RUN_SANDBOX_TEST"
  | "GENERATE_PATCH"
  | "CREATE_GITHUB_ISSUE";

interface ToolPolicy {
  description: string;
  /** Roles allowed to invoke this tool (DevWatch roles). */
  roles: Array<"super_admin" | "admin" | "viewer" | "readonly">;
  requiresExplicitAuth: boolean;
  environment: "isolated-sandbox" | "server";
}

export const TOOL_POLICIES: Record<AgentTool, ToolPolicy> = {
  READ_REPOSITORY: {
    description: "Read repository files via the GitHub API",
    roles: ["super_admin", "admin", "viewer"],
    requiresExplicitAuth: false,
    environment: "server",
  },
  RUN_STATIC_SCAN: {
    description: "Run SAST / secret / dependency / config scanners",
    roles: ["super_admin", "admin", "viewer"],
    requiresExplicitAuth: false,
    environment: "server",
  },
  READ_DEPENDENCIES: {
    description: "Parse dependency manifests and query OSV",
    roles: ["super_admin", "admin", "viewer"],
    requiresExplicitAuth: false,
    environment: "server",
  },
  ANALYZE_CODE: {
    description: "AI code-path and exploitability analysis",
    roles: ["super_admin", "admin", "viewer"],
    requiresExplicitAuth: false,
    environment: "server",
  },
  RUN_SANDBOX_TEST: {
    description: "Run a non-destructive PoC inside the isolated sandbox",
    roles: ["super_admin", "admin"],
    requiresExplicitAuth: true,
    environment: "isolated-sandbox",
  },
  GENERATE_PATCH: {
    description: "Generate a proposed patch/diff (never merged automatically)",
    roles: ["super_admin", "admin"],
    requiresExplicitAuth: false,
    environment: "server",
  },
  CREATE_GITHUB_ISSUE: {
    description: "Open a GitHub issue with the finding summary",
    roles: ["super_admin", "admin"],
    requiresExplicitAuth: false,
    environment: "server",
  },
};

export type Role = "super_admin" | "admin" | "viewer" | "readonly";

export class PermissionDeniedError extends Error {
  constructor(tool: AgentTool, reason: string) {
    super(`Security agent tool ${tool} denied: ${reason}`);
    this.name = "PermissionDeniedError";
  }
}

/**
 * Enforce the tool policy before execution. `explicitAuth` is the user's
 * deliberate opt-in (the sandbox confirm dialog).
 */
export function assertToolAllowed(opts: {
  tool: AgentTool;
  role: Role;
  explicitAuth?: boolean;
}): { environment: "isolated-sandbox" | "server" } {
  const policy = TOOL_POLICIES[opts.tool];
  if (!policy.roles.includes(opts.role)) {
    throw new PermissionDeniedError(opts.tool, `requires role ${policy.roles.join("/")}`);
  }
  if (policy.requiresExplicitAuth && !opts.explicitAuth) {
    throw new PermissionDeniedError(opts.tool, "requires explicit user authorization");
  }
  return { environment: policy.environment };
}
