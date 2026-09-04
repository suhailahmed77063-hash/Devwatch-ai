import { describe, expect, it } from "vitest";
import { computeReadiness } from "./review";
import type { PipelineResult } from "@/types/app";

const passedRun: PipelineResult = {
  passed: true,
  durationMs: 5000,
  steps: [
    { id: "typecheck", label: "Type check", status: "pass" },
    { id: "unit_tests", label: "Unit tests", status: "pass" },
    { id: "build", label: "Production build", status: "pass" },
  ],
};

describe("computeReadiness", () => {
  it("reports critical blockers when no pipeline run has happened yet", () => {
    const report = computeReadiness({ files: { "src/index.ts": "export const a = 1;" }, envVars: [], lastRun: null, hasDatabase: false });
    // 8/11 static checks can pass without a run, but the three pipeline
    // gates are critical blockers — deployment must not be allowed.
    expect(report.score).toBeLessThan(80);
    expect(report.blockers).toContain("Production build passes");
    expect(report.blockers).toContain("Automated tests pass");
    expect(report.blockers).toContain("Type check passes");
  });

  it("scores a green pipeline with declared env at 100", () => {
    const report = computeReadiness({
      files: { "src/index.ts": "export const env = process.env.APP_NAME;", ".env.example": "APP_NAME=foo" },
      envVars: [{ name: "APP_NAME", isSecret: false }],
      lastRun: passedRun,
      hasDatabase: false,
    });
    expect(report.score).toBe(100);
    expect(report.blockers).toHaveLength(0);
  });

  it("flags missing env vars referenced by code", () => {
    const report = computeReadiness({
      files: { "src/index.ts": "const db = process.env.DATABASE_URL;" },
      envVars: [],
      lastRun: passedRun,
      hasDatabase: false,
    });
    const envCheck = report.checks.find((c) => c.id === "env");
    expect(envCheck?.ok).toBe(false);
    expect(report.blockers).toContain("All referenced environment variables are declared");
  });

  it("flags Prisma usage without a configured DATABASE_URL", () => {
    const report = computeReadiness({
      files: {
        "prisma/schema.prisma": `datasource db { provider = "sqlite" url = "file:./dev.db" }`,
        "src/index.ts": "export const a = 1;",
      },
      envVars: [],
      lastRun: passedRun,
      hasDatabase: false,
    });
    const db = report.checks.find((c) => c.id === "database");
    expect(db?.ok).toBe(false);
    expect(report.blockers).toContain("Database is configured");
  });

  it("flags auth code that stores plaintext passwords", () => {
    const report = computeReadiness({
      files: {
        "src/auth.ts": `export async function login(email: string, password: string) { db.users.insert({ email, password }); }`,
        "src/index.ts": "export const a = 1;",
      },
      envVars: [],
      lastRun: passedRun,
      hasDatabase: false,
    });
    const auth = report.checks.find((c) => c.id === "auth");
    expect(auth?.ok).toBe(false);
    expect(report.blockers).toContain("Passwords are hashed, never plaintext");
  });

  it("accepts hashed password storage and route guards", () => {
    const report = computeReadiness({
      files: {
        "src/auth.ts": `import bcrypt from "bcrypt";
export async function register(email: string, password: string) {
  const hash = await bcrypt.hash(password, 10);
  db.users.insert({ email, password: hash });
}
export async function requireUser() { return { id: 1 }; }`,
        "app/api/users/route.ts": `import { requireUser } from "@/auth";
export async function GET(req: Request) {
  try { const u = await requireUser(); return Response.json({ u }); }
  catch (e) { return Response.json({ error: String(e) }, { status: 401 }); }
}`,
        "src/index.ts": "export const a = 1;",
      },
      envVars: [],
      lastRun: passedRun,
      hasDatabase: false,
    });
    const auth = report.checks.find((c) => c.id === "auth");
    expect(auth?.ok).toBe(true);
    expect(report.blockers).not.toContain("Passwords are hashed, never plaintext");
  });
});
