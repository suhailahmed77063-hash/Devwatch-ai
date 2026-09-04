import { describe, expect, it } from "vitest";
import { runSecurityScan } from "./security";

describe("runSecurityScan", () => {
  it("gives a clean project a top score", () => {
    const files: Record<string, string> = {
      "src/index.ts": `import { env } from "./env";
const db = env("DATABASE_URL");
export function run() { return db; }
`,
      ".env.example": "DATABASE_URL=postgres://example\n",
    };
    const report = runSecurityScan(files);
    expect(report.score).toBe(100);
    expect(report.findings).toHaveLength(0);
  });

  it("flags hardcoded secrets", () => {
    const files: Record<string, string> = {
      "src/config.ts": `export const KEY = "sk-live-1234567890abcdefghijklmnop";`,
    };
    const report = runSecurityScan(files);
    expect(report.score).toBeLessThan(80);
    const secret = report.findings.find((f) => f.id === "hardcoded-secrets");
    expect(secret).toBeTruthy();
    expect(secret?.severity).toBe("critical");
  });

  it("flags a committed .env", () => {
    const report = runSecurityScan({ ".env": "STRIPE_SECRET_KEY=abc" });
    const env = report.findings.find((f) => f.id === "env-committed");
    expect(env).toBeTruthy();
    expect(report.score).toBeLessThan(100);
  });

  it("flags unsafe innerHTML without sanitization", () => {
    const report = runSecurityScan({
      "src/app.ts": `document.getElementById("x").innerHTML = userInput;`,
    });
    const xss = report.findings.find((f) => f.id === "xss-unsafe-html");
    expect(xss).toBeTruthy();
    expect(xss?.severity).toBe("high");
  });

  it("flags plaintext passwords in source", () => {
    const report = runSecurityScan({
      "src/auth.ts": `const password = "hunter22";`,
    });
    const pw = report.findings.find((f) => f.id === "password-plaintext");
    expect(pw).toBeTruthy();
  });

  it("flags unguarded API routes but not guarded ones", () => {
    const open = runSecurityScan({
      "app/api/users/route.ts": `export async function GET(req: Request) { return Response.json({}); }`,
    });
    expect(open.findings.some((f) => f.id === "auth-missing-on-api")).toBe(true);

    const guarded = runSecurityScan({
      "app/api/users/route.ts": `import { requireUser } from "@/auth";
export async function GET(req: Request) { const u = await requireUser(); return Response.json({ u }); }`,
    });
    expect(guarded.findings.some((f) => f.id === "auth-missing-on-api")).toBe(false);
  });

  it("dedupes findings and clamps the score to 0..100", () => {
    const files: Record<string, string> = {
      "a.ts": "const k = \"sk-live-abcdefghijklmnopqrstuvwxyz\";",
      "b.ts": "const k2 = \"sk-live-abcdefghijklmnopqrstuvwxyz\";",
      "c.ts": "const k3 = \"sk-live-abcdefghijklmnopqrstuvwxyz\";",
    };
    const report = runSecurityScan(files);
    const secretFindings = report.findings.filter((f) => f.id === "hardcoded-secrets");
    expect(secretFindings).toHaveLength(1); // deduped across files
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });
});
