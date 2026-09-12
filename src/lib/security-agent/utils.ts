/**
 * AI Security Agent — shared utilities.
 * Ported to DevWatch AI conventions (no external deps).
 */

import crypto from "node:crypto";

// ── Fingerprints ────────────────────────────────────────────────────────────

/** Stable identity of a finding across scans (same repo + code = same hash). */
export function fingerprintOf(parts: {
  ruleId: string;
  filePath?: string | null;
  lineStart?: number | null;
  extra?: string | null;
}): string {
  const h = crypto.createHash("sha256");
  h.update(parts.ruleId);
  h.update("|");
  h.update(parts.filePath ?? "");
  h.update("|");
  h.update(String(parts.lineStart ?? ""));
  h.update("|");
  h.update(parts.extra ?? "");
  return h.digest("hex").slice(0, 24);
}

// ── Secret redaction ────────────────────────────────────────────────────────

const REDACTED = "••••••••";

const SECRET_PATTERNS: RegExp[] = [
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bsk_live_[A-Za-z0-9]{16,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bnpm_[A-Za-z0-9]{30,}\b/,
  /\bglpat-[A-Za-z0-9_-]{15,}\b/,
];

/**
 * Redact secret-looking material from text destined for DB, LLM or UI.
 * Keeps evidence useful while preventing secret propagation.
 */
export function redactSecrets(text: string): string {
  if (!text) return text;
  let out = text;
  out = out.replace(new RegExp(SECRET_PATTERNS.map((r) => r.source).join("|"), "g"), (m) =>
    m.length > 8 ? `${m.slice(0, 4)}${REDACTED}` : REDACTED
  );
  // key=value assignments — keep the key name, hide the value
  out = out.replace(
    /((?:password|passwd|secret|token|api_?key|access_?key|private_?key|auth)["']?\s*[:=]\s*["']?)([^\s"',;)}]{6,})/gi,
    (_m, p1: string) => `${p1}${REDACTED}`
  );
  return out;
}

// ── Unified diff ────────────────────────────────────────────────────────────

function lines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n");
}

/** Unified diff for one file (LCS-based with context grouping). */
export function unifiedDiff(oldText: string, newText: string, filePath: string, context = 3): string {
  const a = lines(oldText);
  const b = lines(newText);
  const n = a.length;
  const m = b.length;

  if (n * m > 262_144) {
    return [
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
      `@@ -1,${n} +1,${m} @@`,
      ...a.map((l) => `-${l}`),
      ...b.map((l) => `+${l}`),
    ].join("\n");
  }

  const dp: Uint32Array = new Uint32Array((n + 1) * (m + 1));
  const idx = (i: number, j: number) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[idx(i, j)] = a[i] === b[j] ? dp[idx(i + 1, j + 1)] + 1 : Math.max(dp[idx(i + 1, j)], dp[idx(i, j + 1)]);
    }
  }

  type Op = { t: "-" | "+" | " "; line: string };
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ t: " ", line: a[i] });
      i++;
      j++;
    } else if (dp[idx(i + 1, j)] >= dp[idx(i, j + 1)]) {
      ops.push({ t: "-", line: a[i] });
      i++;
    } else {
      ops.push({ t: "+", line: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ t: "-", line: a[i++] });
  while (j < m) ops.push({ t: "+", line: b[j++] });

  // Group into hunks with context lines
  const hunks: Op[][] = [];
  let current: Op[] = [];
  let pending: Op[] = [];
  let sinceChange = 0;
  for (const op of ops) {
    if (op.t === " ") {
      if (current.length) {
        current.push(op);
        sinceChange++;
        if (sinceChange > context) {
          hunks.push(current);
          current = [];
          sinceChange = 0;
        }
      } else {
        pending.push(op);
        if (pending.length > context) pending.shift();
      }
    } else {
      if (!current.length) current = [...pending];
      pending = [];
      current.push(op);
      sinceChange = 0;
    }
  }
  if (current.length) hunks.push(current);
  const real = hunks.filter((h) => h.some((o) => o.t !== " "));
  if (!real.length) return "";

  const startIdx = new Map<Op[], number>();
  for (const h of real) {
    let count = 0;
    for (const op of ops) {
      if (count === 0 && op === h[0]) break;
      count++;
    }
    startIdx.set(h, count);
  }

  const before = (limit: number) => ({
    old: ops.slice(0, limit).filter((o) => o.t !== "+").length,
    new: ops.slice(0, limit).filter((o) => o.t !== "-").length,
  });

  const out: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];
  for (const hunk of real) {
    const start = startIdx.get(hunk) ?? 0;
    const b4 = before(start);
    const oldCount = hunk.filter((o) => o.t !== "+").length;
    const newCount = hunk.filter((o) => o.t !== "-").length;
    out.push(`@@ -${b4.old + 1},${oldCount} +${b4.new + 1},${newCount} @@`);
    for (const op of hunk) out.push(`${op.t}${op.line}`);
  }
  return out.join("\n");
}

export function diffStat(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) added++;
    else if (line.startsWith("-") && !line.startsWith("---")) removed++;
  }
  return { added, removed };
}

// ── Semver ──────────────────────────────────────────────────────────────────

export function compareVersions(a: string, b: string): number {
  const parse = (v: string): { nums: number[]; pre: string | null } => {
    const [core, pre] = v.replace(/^v/i, "").trim().split("-", 2);
    const nums = core.split(".").map((p) => parseInt(p, 10) || 0);
    while (nums.length < 3) nums.push(0);
    return { nums: nums.slice(0, 3), pre: pre ?? null };
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let k = 0; k < 3; k++) {
    if (pa.nums[k] !== pb.nums[k]) return pa.nums[k] - pb.nums[k];
  }
  if (pa.pre === null && pb.pre === null) return 0;
  if (pa.pre === null) return 1;
  if (pb.pre === null) return -1;
  return pa.pre.localeCompare(pb.pre);
}

export function inRange(version: string, range: string): boolean {
  const v = version.trim();
  const r = range.trim();
  if (!v || !r) return false;
  const constraints = r.split(/[, ]+/).filter(Boolean);
  return constraints.every((c) => {
    const m = c.match(/^(>=|<=|==|=|>|<|~|\^)?\s*(.+)$/);
    if (!m) return false;
    const op = m[1] ?? "=";
    const target = m[2].replace(/\*/g, "0");
    const cmp = compareVersions(v, target);
    switch (op) {
      case ">=": return cmp >= 0;
      case "<=": return cmp <= 0;
      case ">": return cmp > 0;
      case "<": return cmp < 0;
      case "=":
      case "==": return cmp === 0;
      case "~": return cmp >= 0 && compareVersions(v, bumpTilde(target)) < 0;
      case "^": return cmp >= 0 && compareVersions(v, bumpCaret(target)) < 0;
      default: return cmp === 0;
    }
  });
}

function bumpTilde(v: string): string {
  const p = v.split(".").map((x) => parseInt(x, 10) || 0);
  p[1] = (p[1] ?? 0) + 1;
  return `${p[0]}.${p[1]}.0`;
}

function bumpCaret(v: string): string {
  const p = v.split(".").map((x) => parseInt(x, 10) || 0);
  if (p[0] > 0) return `${p[0] + 1}.0.0`;
  if ((p[1] ?? 0) > 0) return `0.${p[1] + 1}.0`;
  return `0.0.${(p[2] ?? 0) + 1}`;
}
