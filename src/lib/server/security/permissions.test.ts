import { describe, expect, it } from "vitest";
import { assertToolAllowed, TOOL_POLICIES, atLeastRole, PermissionDeniedError } from "./permissions";

describe("security tool permissions (least privilege)", () => {
  it("allows VIEWER to run read/scan/analysis tools", () => {
    for (const tool of ["READ_REPOSITORY", "RUN_STATIC_SCAN", "READ_DEPENDENCIES", "ANALYZE_CODE"] as const) {
      expect(() => assertToolAllowed({ tool, role: "VIEWER" })).not.toThrow();
    }
  });

  it("denies sandbox tests to VIEWER and EDITOR, allows ADMIN with explicit auth", () => {
    expect(() => assertToolAllowed({ tool: "RUN_SANDBOX_TEST", role: "VIEWER", explicitAuth: true })).toThrow(PermissionDeniedError);
    expect(() => assertToolAllowed({ tool: "RUN_SANDBOX_TEST", role: "EDITOR", explicitAuth: true })).toThrow(PermissionDeniedError);
    expect(() => assertToolAllowed({ tool: "RUN_SANDBOX_TEST", role: "ADMIN", explicitAuth: true })).not.toThrow();
  });

  it("requires explicit authorization for sandbox tests even for owners", () => {
    expect(() => assertToolAllowed({ tool: "RUN_SANDBOX_TEST", role: "OWNER", explicitAuth: false })).toThrow(/explicit user authorization/);
  });

  it("sandbox tests are marked sensitive and sandbox-bound", () => {
    expect(TOOL_POLICIES.RUN_SANDBOX_TEST.requiresExplicitAuth).toBe(true);
    expect(TOOL_POLICIES.RUN_SANDBOX_TEST.environment).toBe("isolated-sandbox");
  });

  it("role ordering is monotonic", () => {
    expect(atLeastRole("OWNER", "VIEWER")).toBe(true);
    expect(atLeastRole("ADMIN", "EDITOR")).toBe(true);
    expect(atLeastRole("VIEWER", "ADMIN")).toBe(false);
  });
});
