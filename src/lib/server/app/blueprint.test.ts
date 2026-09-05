import { describe, expect, it } from "vitest";
import { assertSafePath, normalizeBlueprint, validateOps } from "./blueprint";
import { ValidationError } from "@/lib/errors";
import type { AppBlueprint } from "@/types/app";  describe("normalizeBlueprint (lenient repair)", () => {
    it("fills missing page names/routes and coerces object testPlan items to strings", () => {
      const bp = normalizeBlueprint({
        name: "TestApp",
        pages: [{ route: "/home", components: [] }, { name: "About" }],
        testPlan: ["runs", { name: "object item" }],
      });
      expect(bp.pages[0].name).toBe("home");
      expect(bp.pages[1].route).toBe("/about");
      expect(bp.testPlan).toEqual(["runs", "object item"]);
    });
  });

  describe("assertSafePath", () => {
  it("accepts clean repo-relative paths", () => {
    expect(assertSafePath("src/app.ts")).toBe("src/app.ts");
    expect(assertSafePath("src/lib/env.ts")).toBe("src/lib/env.ts");
    expect(assertSafePath("package.json")).toBe("package.json");
    expect(assertSafePath(".env.example")).toBe(".env.example");
    expect(assertSafePath(".gitignore")).toBe(".gitignore");
    expect(assertSafePath(".dockerignore")).toBe(".dockerignore");
    // windows-style separators are normalized
    expect(assertSafePath("src\\index.ts")).toBe("src/index.ts");
  });

  it("rejects path traversal and absolute paths", () => {
    expect(() => assertSafePath("../secret")).toThrow(ValidationError);
    expect(() => assertSafePath("src/../../etc/passwd")).toThrow(ValidationError);
    expect(() => assertSafePath("/etc/passwd")).toThrow(ValidationError);
    expect(() => assertSafePath("C:\\Windows\\system32")).toThrow(ValidationError);
    expect(() => assertSafePath("")).toThrow(ValidationError);
  });

  it("rejects blocked directories", () => {
    expect(() => assertSafePath("node_modules/x/index.js")).toThrow(ValidationError);
    expect(() => assertSafePath(".git/config")).toThrow(ValidationError);
    expect(() => assertSafePath("dist/bundle.js")).toThrow(ValidationError);
    expect(() => assertSafePath("package-lock.json")).toThrow(ValidationError);
  });

  it("rejects disallowed extensions", () => {
    expect(() => assertSafePath("src/app.exe")).toThrow(ValidationError);
    expect(() => assertSafePath("evil.sh")).toThrow(ValidationError);
    // allowAnyExt is used for env var names only
    expect(assertSafePath("src/app.ts")).toBe("src/app.ts");
  });
});

describe("validateOps", () => {
  it("passes through valid ops with normalized paths", () => {
    const ops = validateOps([
      { kind: "create", path: "src/foo.ts", content: "export const x = 1;" },
      { kind: "edit", path: "src/bar.ts", content: "export const y = 2;" },
      { kind: "edit", path: ".env.example", content: "DATABASE_URL=postgres://x" },
    ]);
    expect(ops).toHaveLength(3);
  });

  it("rejects dangerous ops", () => {
    expect(() =>
      validateOps([{ kind: "create", path: "../../etc/pwn", content: "x" }])
    ).toThrow(ValidationError);
  });

  it("rejects too many ops", () => {
    const ops = Array.from({ length: 101 }, (_, i) => ({
      kind: "create" as const,
      path: `src/f${i}.ts`,
      content: "",
    }));
    expect(() => validateOps(ops)).toThrow(/Too many/);
  });
});

describe("normalizeBlueprint", () => {
  it("normalizes a valid blueprint and applies defaults", () => {
    const bp = normalizeBlueprint({
      name: "SaaS Dashboard",
      dataModels: [{ name: "User", fields: [{ name: "email", type: "string" }] }],
      apiRoutes: [{ method: "GET", path: "/api/users", protected: true }],
    }) as AppBlueprint;
    expect(bp.name).toBe("SaaS Dashboard");
    expect(bp.modules).toEqual([]);
    expect(bp.stack).toBe("TypeScript");
    expect(bp.dataModels[0].fields[0].optional).toBe(false);
  });

  it("rejects invalid blueprints with a readable error", () => {
    expect(() => normalizeBlueprint({ name: "" })).toThrow(ValidationError);
    expect(() => normalizeBlueprint({ name: "x", dataModels: [{ name: "" }] })).toThrow(/validation/i);
  });

  it("rejects absurd shapes instead of accepting them", () => {
    expect(() =>
      normalizeBlueprint({ name: "ok", modules: Array.from({ length: 500 }, () => "m") })
    ).toThrow(ValidationError);
  });
});
