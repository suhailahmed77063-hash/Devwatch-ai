import type { ReadinessCheck, ReadinessReport, PipelineResult } from "@/types/app";
import { runSecurityScan } from "./security";

interface ReviewInput {
  files: Record<string, string>;
  envVars: { name: string; isSecret: boolean }[];
  lastRun: PipelineResult | null;
  hasDatabase: boolean; // whether the sandbox includes a real DB connection config
}

/** Env names referenced by generated code (process.env.X or env("X")). */
function referencedEnv(files: Record<string, string>): Set<string> {
  const out = new Set<string>();
  const re = /(?:process\.env\.([A-Z][A-Z0-9_]{2,})|env\(\s*["']([A-Z][A-Z0-9_]{2,})["']\s*\))/g;
  for (const content of Object.values(files)) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      if (m[1]) out.add(m[1]);
      if (m[2]) out.add(m[2]);
    }
  }
  return out;
}

export function computeReadiness(input: ReviewInput): ReadinessReport {
  const checks: ReadinessCheck[] = [];
  const blockers: string[] = [];

  const add = (id: string, label: string, ok: boolean, critical: boolean, detail?: string) => {
    const check: ReadinessCheck = { id, label, ok, critical, detail };
    checks.push(check);
    if (!ok && critical) blockers.push(label);
  };

  const has = (pred: (path: string, content: string) => boolean) => Object.entries(input.files).some(([p, c]) => pred(p, c));
  const paths = Object.keys(input.files);

  // Build / tests from the latest real pipeline run.
  const buildStep = input.lastRun?.steps.find((s) => s.id === "build");
  const testStep = input.lastRun?.steps.find((s) => s.id === "unit_tests");
  const typeStep = input.lastRun?.steps.find((s) => s.id === "typecheck");
  add("build", "Production build passes", buildStep?.status === "pass", true, !buildStep ? "No build run yet — run Test & Fix Everything." : undefined);
  add("tests", "Automated tests pass", testStep?.status === "pass", true, !testStep ? "No test run yet." : undefined);
  add("typecheck", "Type check passes", typeStep?.status === "pass", true, !typeStep ? "No type check run yet." : undefined);

  // Security
  const sec = runSecurityScan(input.files);
  const criticalFindings = sec.findings.filter((f) => f.severity === "critical" || f.severity === "high");
  add("security", "No critical/high security findings", criticalFindings.length === 0, true, criticalFindings.length ? `${criticalFindings.length} finding(s) — see security scan.` : undefined);

  // Environment
  const referenced = referencedEnv(input.files);
  const declared = new Set([...input.envVars.map((v) => v.name), ...(input.files[".env.example"] ? referenced : [])]);
  const missingEnv = [...referenced].filter((n) => !declared.has(n));
  add("env", "All referenced environment variables are declared", missingEnv.length === 0, true, missingEnv.length ? `Missing: ${missingEnv.join(", ")}` : undefined);

  // Database
  const usesPrisma = has((p) => p.endsWith(".prisma") || p.includes("prisma"));
  const hasDbUrl = input.envVars.some((v) => v.name === "DATABASE_URL") || referenced.has("DATABASE_URL");
  add("database", "Database is configured", !usesPrisma || hasDbUrl, true, usesPrisma && !hasDbUrl ? "Prisma files found but no DATABASE_URL is configured." : undefined);
  void input.hasDatabase;

  // Authentication hardening when auth code exists
  const hasAuth = has((p, c) => /auth|login|signIn|session/i.test(p + c));
  if (hasAuth) {
    const hashed = has((_p, c) => /bcrypt|argon2|scrypt|pbkdf2/.test(c));
    add("auth", "Passwords are hashed, never plaintext", hashed, true, hashed ? undefined : "Auth code found but no password hashing library is referenced.");
    const protectedRoutes = has((p, c) => /requireAuth|requireUser|verifyToken|isAuthenticated/.test(c));
    add("auth-routes", "Protected routes enforce authorization", protectedRoutes, false, protectedRoutes ? undefined : "No explicit auth guard found for protected routes.");
  } else {
    add("auth", "Authentication is secure", true, false, "No authentication code in this project.");
  }

  // Error handling in API modules
  const apiFiles = paths.filter((p) => p.includes("/api/") || p.includes("route."));
  if (apiFiles.length) {
    const handled = apiFiles.filter((p) => /try\s*\{|catch\s*\(/.test(input.files[p] ?? ""));
    add("errors", "API routes handle errors", handled.length >= Math.max(1, Math.ceil(apiFiles.length / 2)), true, handled.length < apiFiles.length ? `${apiFiles.length - handled.length} route file(s) without try/catch.` : undefined);
  } else {
    add("errors", "Error handling is in place", true, false, "No API route files to check.");
  }

  // Performance basics
  const oversized = paths.filter((p) => input.files[p].length > 500_000);
  add("performance", "No oversized source files", oversized.length === 0, false, oversized.length ? `${oversized.join(", ")} exceed 500 KB.` : undefined);

  // SEO + accessibility when web assets exist
  const hasHtml = has((p, c) => /<html|<title|index\.html/.test(c));
  if (hasHtml) {
    const seoOk = has((_p, c) => /<title>/.test(c) && /<meta[^>]+description/.test(c));
    add("seo", "Pages include title and meta description", seoOk, false, seoOk ? undefined : "No <title> + meta description found.");
    const altOk = has((_p, c) => /<img[^>]+alt=/.test(c));
    add("accessibility", "Images include alt text", altOk, false, altOk ? undefined : "No images with alt text found.");
  } else {
    add("seo", "Web pages present", true, false, "No HTML entry points — skipping SEO checks.");
    add("accessibility", "Accessibility basics", true, false, "No HTML entry points — skipping a11y checks.");
  }

  const passCount = checks.filter((c) => c.ok).length;
  const score = checks.length ? Math.round((passCount / checks.length) * 100) : 0;
  return { score, checks, blockers };
}