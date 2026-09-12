import { describe, expect, it } from "vitest";
import { runSast } from "./sast";
import { runSecretScanner } from "./secrets";
import { runConfigScanner } from "./configuration";
import { buildPoc } from "../poc";

describe("SAST scanner", () => {
  it("flags string-concatenated SQL", () => {
    const files = { "src/db.ts": 'const q = "SELECT * FROM users WHERE name = \'" + name + "\'";' };
    const findings = runSast(files);
    expect(findings.some((f) => f.ruleId === "sast.sql-injection")).toBe(true);
  });

  it("flags innerHTML without sanitization and stays quiet when sanitized", () => {
    const dirty = { "src/ui.ts": 'el.innerHTML = userInput;' };
    expect(runSast(dirty).some((f) => f.ruleId === "sast.xss-unsafe-html")).toBe(true);

    const clean = { "src/ui.ts": 'el.textContent = userInput;' };
    expect(runSast(clean).some((f) => f.ruleId === "sast.xss-unsafe-html")).toBe(false);
  });

  it("flags weak crypto and hardcoded credentials", () => {
    const files = {
      "src/crypto.ts": 'const h = crypto.createHash("md5");',
      "src/config.ts": 'const k = "AKIAIOSFODNN7EXAMPLE";',
    };
    const findings = runSast(files);
    expect(findings.some((f) => f.ruleId === "sast.weak-crypto")).toBe(true);
    expect(findings.some((f) => f.ruleId === "sast.hardcoded-secret")).toBe(true);
  });

  it("flags unguarded API routes", () => {
    const files = { "app/api/users/route.ts": "export async function GET(req: Request) { return Response.json({}); }" };
    expect(runSast(files).some((f) => f.ruleId === "sast.missing-authz")).toBe(true);
  });

  it("does not flag clean parameterized code", () => {
    const files = { "src/db.ts": 'const q = await db.query("SELECT * FROM users WHERE id = $1", [id]);' };
    const findings = runSast(files);
    expect(findings.some((f) => f.ruleId === "sast.sql-injection")).toBe(false);
  });

  it("attaches line numbers and evidence", () => {
    const files = { "src/app.ts": "const a = 1;\nconst b = 2;\nconst q = \"SELECT * FROM t WHERE x = \" + input;" };
    const findings = runSast(files);
    const sqli = findings.find((f) => f.ruleId === "sast.sql-injection");
    expect(sqli).toBeTruthy();
    expect(sqli?.lineStart).toBeGreaterThanOrEqual(1);
    expect(sqli?.evidence?.length).toBeGreaterThan(0);
    expect(sqli?.cwe).toBe("CWE-89");
  });
});

describe("Secret scanner", () => {
  it("detects committed AWS keys with line evidence", () => {
    const files = { "src/config.ts": "# comment\nAWS_KEY=AKIAIOSFODNN7EXAMPLE" };
    const findings = runSecretScanner(files);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("critical");
    expect(findings[0].lineStart).toBe(2);
    expect(findings[0].category).toBe("secret");
  });

  it("skips .env.example and test files", () => {
    const files = {
      ".env.example": "AWS_KEY=AKIAIOSFODNN7EXAMPLE",
      "src/a.test.ts": 'const k = "AKIAIOSFODNN7EXAMPLE";',
    };
    expect(runSecretScanner(files)).toHaveLength(0);
  });
});

describe("Configuration scanner", () => {
  it("flags committed .env with content", () => {
    const findings = runConfigScanner({ ".env": "DATABASE_URL=postgres://..." });
    expect(findings.some((f) => f.ruleId === "config.committed-env")).toBe(true);
  });

  it("flags disabled TLS verification anywhere", () => {
    const findings = runConfigScanner({ "src/http.ts": "request({ rejectUnauthorized: false })" });
    expect(findings.some((f) => f.ruleId === "config.tls-verification-disabled")).toBe(true);
  });

  it("flags Docker USER root", () => {
    const findings = runConfigScanner({ "Dockerfile": "FROM node:20\nUSER root" });
    expect(findings.some((f) => f.ruleId === "config.docker-root")).toBe(true);
  });
});

describe("PoC builders", () => {
  it("produces scripts for supported classes", () => {
    for (const ruleId of ["sast.sql-injection", "sast.xss-unsafe-html", "sast.path-traversal", "sast.ssrf"]) {
      const poc = buildPoc({ ruleId } as never);
      expect(poc).toBeTruthy();
      expect(poc!.script.length).toBeGreaterThan(50);
      expect(poc!.script).not.toContain("rm -rf");
    }
  });

  it("returns null for unsupported classes (validator reports INCONCLUSIVE)", () => {
    expect(buildPoc({ ruleId: "config.docker-root" } as never)).toBeNull();
  });
});
