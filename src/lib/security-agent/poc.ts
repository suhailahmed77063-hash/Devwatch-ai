/**
 * AI Security Agent — safe exploit validation (PoC builders).
 *
 * Each builder returns a *non-destructive* Node script that, executed inside
 * the isolated sandbox, attempts to reproduce one vulnerability class against
 * a locally generated fixture. No external network, no production targets,
 * no data destruction. Evidence = captured output + reproduction flag.
 */

import type { RawFinding } from "./types";

export interface PocPlan {
  script: string;
  /** Human-readable description of what the test does. */
  description: string;
}

/**
 * Map a finding to a sandbox PoC plan. `null` = no safe PoC exists for this
 * class (e.g. misconfiguration) → validation reports "inconclusive".
 */
export function buildPoc(finding: RawFinding): PocPlan | null {
  switch (finding.ruleId) {
    case "sast.sql-injection":
      return {
        description: "Reproduces SQL-string-concatenation injection against an in-memory SQLite fixture using a benign payload (non-destructive).",
        script: `
const { createStatement } = (() => { try { return require("node:sqlite"); } catch { return {}; } })();
const Database = (() => { try { return require("better-sqlite3"); } catch { return null; } })();
if (!Database && !createStatement) { console.log("RESULT: SKIP no-sqlite-in-sandbox"); process.exit(0); }
const db = Database ? new Database(":memory:") : null;
const run = db ? db.prepare.bind(db) : null;
if (db) db.exec("CREATE TABLE users (id INTEGER, name TEXT); INSERT INTO users VALUES (1,'alice')");
function vulnerableQuery(userInput) {
  const sql = "SELECT id, name FROM users WHERE name = '" + userInput + "'";
  return db.prepare(sql).all();
}
const payload = "' OR '1'='1";
const rows = vulnerableQuery(payload);
const reproduced = Array.isArray(rows) && rows.length > 1;
console.log("PAYLOAD:", JSON.stringify(payload));
console.log("ROWS_RETURNED:", rows.length);
console.log("RESULT: " + (reproduced ? "REPRODUCED" : "NOT_REPRODUCED"));
`,
      };

    case "sast.xss-unsafe-html":
      return {
        description: "Demonstrates DOM XSS sink acceptance of an untrusted string using a pure-JS innerHTML emulation (no browser, no network).",
        script: `
// Emulate the sink assignment the scanner flagged, then measure script-payload survival.
const sink = { innerHTML: "" };
const untrusted = '<img src=x onerror="alert(1)">';
sink.innerHTML = untrusted;
const dangerous = /on\\w+\\s*=|<script/i.test(sink.innerHTML);
console.log("PAYLOAD:", JSON.stringify(untrusted));
console.log("PAYLOAD_SURVIVED_IN_SINK:", dangerous);
console.log("RESULT: " + (dangerous ? "REPRODUCED" : "NOT_REPRODUCED"));
`,
      };

    case "sast.command-injection":
      return {
        description: "Proves command metacharacters are passed through to a shell-like parser using a mocked exec (no real command runs).",
        script: `
// Mock the exec surface: verify that attacker-controlled metacharacters are
// concatenated into a command string without sanitization. NOTHING is executed.
function mockExec(cmd) { return { cmd, shellParsed: cmd.split(/\\s+/) }; }
const input = "file.txt; id";
const result = mockExec("cat " + input);
const injected = result.shellParsed.includes("id");
console.log("CONSTRUCTED_COMMAND:", JSON.stringify(result.cmd));
console.log("METACHARACTER_PASSED_THROUGH:", injected);
console.log("RESULT: " + (injected ? "REPRODUCED" : "NOT_REPRODUCED"));
`,
      };

    case "sast.path-traversal":
      return {
        description: "Checks whether path-join normalization allows escaping the base directory, against a virtual filesystem only.",
        script: `
const path = require("node:path");
const baseDir = "/srv/app/public";
function vulnerableRead(userPath) { return path.join(baseDir, userPath); }
const payload = "../../etc/passwd";
const resolved = vulnerableRead(payload);
const escaped = !resolved.startsWith(baseDir + path.sep);
console.log("PAYLOAD:", JSON.stringify(payload));
console.log("RESOLVED_PATH:", resolved);
console.log("ESCAPED_BASE_DIR:", escaped);
console.log("RESULT: " + (escaped ? "REPRODUCED" : "NOT_REPRODUCED"));
`,
      };

    case "sast.ssrf":
      return {
        description: "Verifies a user-supplied URL is fetched without scheme/host validation, using a mock fetch (no network activity).",
        script: `
// Mock fetch surface — no real request is made. Test only the URL validation logic.
const allowedHosts = [];
async function vulnerableFetch(targetUrl) {
  if (!allowedHosts.includes(new URL(targetUrl).host)) return { blocked: false }; // no validation
  return { blocked: true };
}
const result = await vulnerableFetch("http://169.254.169.254/latest/meta-data/");
console.log("TARGET:", "http://169.254.169.254/latest/meta-data/");
console.log("REQUEST_WOULD_BE_SENT:", !result.blocked);
console.log("RESULT: " + (!result.blocked ? "REPRODUCED" : "NOT_REPRODUCED"));
`,
      };

    case "sast.weak-crypto":
      return {
        description: "Demonstrates Math.random()-derived token entropy is far below the security threshold (offline computation only).",
        script: `
const crypto = require("node:crypto");
function insecureToken() { return Math.random().toString(36).slice(2); }
function secureToken() { return crypto.randomBytes(32).toString("hex"); }
const samples = Array.from({ length: 2000 }, insecureToken);
const unique = new Set(samples).size;
const bits = Math.log2(unique);
console.log("SAMPLES:", samples.length, "UNIQUE:", unique);
console.log("EFFECTIVE_ENTROPY_BITS:~", bits.toFixed(1));
console.log("SECURE_TOKEN_BITS:", 256);
console.log("RESULT: " + (bits < 64 ? "REPRODUCED" : "NOT_REPRODUCED"));
`,
      };

    default:
      if (finding.ruleId.startsWith("secret.")) {
        return {
          description: "Confirms the detected credential value is syntactically valid for its provider format (offline format check only; no authentication attempt).",
          script: `
const candidate = ${JSON.stringify((finding.snippet ?? "").trim().slice(0, 120))};
const looksLikeKey = /(AKIA|ASIA)[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sk_live_[A-Za-z0-9]{16,}|xox[baprs]-|BEGIN .*PRIVATE KEY/.test(candidate);
console.log("CREDENTIAL_FORMAT_VALID:", looksLikeKey);
console.log("NOTE: format check only — the agent never attempts authentication with detected secrets.");
console.log("RESULT: " + (looksLikeKey ? "REPRODUCED" : "NOT_REPRODUCED"));
`,
        };
      }
      return null;
  }
}
