import { describe, expect, it } from "vitest";
import { fingerprintOf, redactSecrets, unifiedDiff, diffStat, compareVersions, inRange } from "./utils";

describe("fingerprintOf", () => {
  it("is stable for identical inputs", () => {
    const a = fingerprintOf({ ruleId: "sast.xss", filePath: "src/app.ts", lineStart: 10 });
    const b = fingerprintOf({ ruleId: "sast.xss", filePath: "src/app.ts", lineStart: 10 });
    expect(a).toBe(b);
  });

  it("differs across rules, files and lines", () => {
    const base = { ruleId: "r", filePath: "f.ts", lineStart: 1 };
    expect(fingerprintOf(base)).not.toBe(fingerprintOf({ ...base, ruleId: "r2" }));
    expect(fingerprintOf(base)).not.toBe(fingerprintOf({ ...base, filePath: "g.ts" }));
    expect(fingerprintOf(base)).not.toBe(fingerprintOf({ ...base, lineStart: 2 }));
  });
});

describe("redactSecrets", () => {
  it("redacts AWS keys while keeping a prefix", () => {
    const out = redactSecrets('key = "AKIAIOSFODNN7EXAMPLE"');
    expect(out).toContain("AKIA•••");
    expect(out).not.toContain("IOSFODNN7");
  });

  it("redacts GitHub tokens and OpenAI-style keys", () => {
    expect(redactSecrets("ghp_" + "x".repeat(30))).toMatch(/ghp_•••/);
    expect(redactSecrets("sk-" + "a".repeat(25))).toMatch(/sk-a•••|sk-•••/);
  });

  it("redacts key=value assignments but keeps the key name", () => {
    const out = redactSecrets('JWT_SECRET = "super-secret-value-123";');
    expect(out).toContain("JWT_SECRET");
    expect(out).not.toContain("super-secret-value");
  });

  it("leaves ordinary code untouched", () => {
    const code = "const sum = (a, b) => a + b;";
    expect(redactSecrets(code)).toBe(code);
  });
});

describe("unifiedDiff", () => {
  it("produces a standard hunk header and +/- lines", () => {
    const diff = unifiedDiff("line1\nline2\nline3", "line1\nlineX\nline3", "src/a.ts");
    expect(diff).toContain("--- a/src/a.ts");
    expect(diff).toContain("+++ b/src/a.ts");
    expect(diff).toContain("@@ -1,3 +1,3 @@");
    expect(diff).toContain("-line2");
    expect(diff).toContain("+lineX");
    expect(diff).toContain(" line1");
  });

  it("returns empty string when there is no change", () => {
    expect(unifiedDiff("same\nlines", "same\nlines", "a.ts")).toBe("");
  });

  it("counts added and removed lines", () => {
    const diff = unifiedDiff("a\nb\nc", "a\nB\nc\nd", "f.ts");
    const stat = diffStat(diff);
    expect(stat.added).toBe(2);
    expect(stat.removed).toBe(1);
  });
});

describe("semver comparison", () => {
  it("orders versions correctly", () => {
    expect(compareVersions("1.2.3", "1.2.4")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
    expect(compareVersions("1.2.3-beta", "1.2.3")).toBeLessThan(0);
  });

  it("evaluates range expressions", () => {
    expect(inRange("1.2.0", ">=1.0.0 <1.2.5")).toBe(true);
    expect(inRange("1.3.0", ">=1.0.0 <1.2.5")).toBe(false);
    expect(inRange("1.2.3", "^1.2.0")).toBe(true);
    expect(inRange("2.0.0", "^1.2.0")).toBe(false);
    expect(inRange("1.2.5", "~1.2.0")).toBe(true);
    expect(inRange("1.3.0", "~1.2.0")).toBe(false);
    expect(inRange("0.5.0", "<1.2.6")).toBe(true);
  });
});
