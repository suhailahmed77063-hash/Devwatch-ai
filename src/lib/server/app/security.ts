import type { SecurityFinding, SecurityReport } from "@/types/app";

interface Rule {
  id: string;
  label: string;
  severity: "critical" | "high" | "medium" | "low";
  weight: number; // subtracted from 100 when found
  test: (path: string, content: string) => string | null; // detail when violated
}

const SECRET_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "AWS access key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { label: "OpenAI / generic API key", re: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { label: "Stripe secret key", re: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  { label: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { label: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { label: "JWT secret", re: /\b(?:JWT_?SECRET|AUTH_SECRET)\s*=\s*["']?[A-Za-z0-9_-]{8,}\b/i },
];

const RULES: Rule[] = [
  {
    id: "hardcoded-secrets",
    label: "Hardcoded secrets or API keys",
    severity: "critical",
    weight: 25,
    test: (path, content) => {
      for (const p of SECRET_PATTERNS) {
        if (p.re.test(content)) return `${p.label} found in this file`;
      }
      return null;
    },
  },
  {
    id: "env-committed",
    label: "Real .env committed",
    severity: "critical",
    weight: 20,
    test: (path, content) => {
      if (path === ".env" && !path.endsWith(".example")) return "A live .env file is part of the workspace — use .env.example and inject values at runtime";
      return null;
    },
  },
  {
    id: "insecure-http",
    label: "Insecure http:// endpoints",
    severity: "medium",
    weight: 6,
    test: (_path, content) => {
      const matches = content.match(/https?:\/\/[^\s"'`)]+/g) ?? [];
      const insecure = matches.filter((m) => m.startsWith("http://") && !m.startsWith("http://localhost"));
      return insecure.length ? `${insecure.length} insecure http:// URL(s)` : null;
    },
  },
  {
    id: "sql-injection",
    label: "Possible SQL injection",
    severity: "high",
    weight: 14,
    test: (_path, content) => {
      // naive string-concatenated query patterns (no parameterization)
      if (/`?\s*SELECT .*["'`+]\s*\+\s*[a-zA-Z_$]/.test(content) || /query\(\s*["'`][^"'`]*["'`]\s*\+/.test(content)) {
        return "Query built by string concatenation — use parameterized queries";
      }
      return null;
    },
  },
  {
    id: "xss-unsafe-html",
    label: "Unsafe HTML injection",
    severity: "high",
    weight: 12,
    test: (_path, content) => {
      if (/innerHTML\s*=/.test(content) && !/escapeHtml|escape|sanitize/.test(content)) {
        return "innerHTML is set without an escape/sanitize call nearby";
      }
      return null;
    },
  },
  {
    id: "dangerous-eval",
    label: "Dangerous eval / shell execution",
    severity: "high",
    weight: 10,
    test: (_path, content) => {
      if (/\beval\s*\(/.test(content)) return "eval() with untrusted input is dangerous";
      if (/\bexec(?:Sync)?\s*\(/.test(content) && !/child_process|execFile/.test(content)) return "shell execution present — prefer execFile with fixed args";
      return null;
    },
  },
  {
    id: "auth-missing-on-api",
    label: "API routes without auth guard",
    severity: "high",
    weight: 10,
    test: (path, content) => {
      if (/api\//.test(path) && /(export (async )?function (GET|POST|PUT|PATCH|DELETE))/.test(content) && !/auth|requireUser|verifyToken|session|middleware/.test(content)) {
        return "Handler exports a method but shows no authentication check";
      }
      return null;
    },
  },
  {
    id: "password-plaintext",
    label: "Password stored in plaintext",
    severity: "critical",
    weight: 18,
    test: (_path, content) => {
      if (/password\s*[:=]\s*["'`][^"'`]{2,}["'`]/.test(content)) return "Password value appears in source — hash with bcrypt/argon2 instead";
      return null;
    },
  },
  {
    id: "csrf-unsafe",
    label: "State-changing routes without CSRF protection",
    severity: "medium",
    weight: 5,
    test: (path, content) => {
      if (/api\//.test(path) && /export (async )?function (POST|PUT|PATCH|DELETE)/.test(content) && !/csrf|origin|sameSite|verifyToken/.test(content)) {
        return "Mutating handler with no CSRF/origin check";
      }
      return null;
    },
  },
  {
    id: "weak-logging",
    label: "Secrets written to logs",
    severity: "medium",
    weight: 6,
    test: (_path, content) => {
      if (/console\.(log|debug)\([^)]*(key|secret|token|password)/i.test(content)) return "Potential secret leakage via console output";
      return null;
    },
  },
];

/** Run the real static security scan over the workspace file map. */
export function runSecurityScan(files: Record<string, string>): SecurityReport {
  const findings: SecurityFinding[] = [];
  let deducted = 0;

  for (const [path, content] of Object.entries(files)) {
    const lower = path.toLowerCase();
    if (lower.includes("node_modules") || lower === ".env" && path.endsWith(".example")) continue;
    if (path.endsWith(".example") || lower.endsWith(".test.ts") || lower.endsWith(".spec.ts")) {
      // .env.example files may legitimately list placeholder keys
      if (path.endsWith(".env.example")) continue;
    }
    for (const rule of RULES) {
      const detail = rule.test(path, content);
      if (detail) {
        findings.push({ id: rule.id, label: rule.label, severity: rule.severity, file: path, detail });
        deducted += rule.weight;
      }
    }
  }

  // dedupe identical finding ids
  const seen = new Set<string>();
  const unique = findings.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
  const score = Math.max(0, Math.min(100, 100 - deducted));
  return { score, findings: unique };
}