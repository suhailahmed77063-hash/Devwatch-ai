/**
 * End-to-end verification of the AI app-builder QA machinery WITHOUT a
 * database: materializes a "generated" app (starter files + a realistic
 * feature module the coding agent would write), then runs the exact same
 * real commands as the production pipeline:
 *
 *   npm install → tsc --noEmit → tsc strict-unused → vitest run
 *     → tsc (build) → node dist/index.js (runtime) → security → readiness
 *
 * Run with: npx tsx scripts/verify-sandbox.ts
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { starterFiles } from "../src/lib/server/app/templates";
import { runCommand, runNpx } from "../src/lib/server/app/workspace";
import { runSecurityScan } from "../src/lib/server/app/security";
import { computeReadiness } from "../src/lib/server/app/review";
import type { PipelineStep } from "../src/types/app";

const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

async function main() {
  const dir = path.join(os.tmpdir(), `wf-verify-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });

  // Simulate a generated app: starter + feature code + tests the agent writes.
  const files: Record<string, string> = {
    ...starterFiles("Verify App"),
    "src/services/cart.ts": `export interface LineItem { sku: string; qty: number; price: number; }
export class Cart {
  private items: LineItem[] = [];
  add(item: LineItem): number {
    if (item.qty <= 0) throw new Error("qty must be positive");
    this.items.push(item);
    return this.items.length;
  }
  total(): number {
    return this.items.reduce((sum, i) => sum + i.qty * i.price, 0);
  }
}
`,
    "src/__tests__/cart.test.ts": `import { describe, expect, it } from "vitest";
import { Cart } from "../services/cart";
describe("cart", () => {
  it("totals line items", () => {
    const cart = new Cart();
    cart.add({ sku: "a", qty: 2, price: 10 });
    cart.add({ sku: "b", qty: 1, price: 5 });
    expect(cart.total()).toBe(25);
  });
  it("rejects zero qty", () => {
    const cart = new Cart();
    expect(() => cart.add({ sku: "a", qty: 0, price: 1 })).toThrow();
  });
});
`,
  };

  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf8");
  }

  const steps: PipelineStep[] = [];
  const emit = (s: PipelineStep) => {
    steps.push(s);
    const icon = s.status === "pass" ? "✓" : s.status === "fail" ? "✗" : s.status === "warn" ? "⚠" : "·";
    console.log(`  ${icon} ${s.label}${s.durationMs !== undefined ? ` (${(s.durationMs / 1000).toFixed(1)}s)` : ""}`);
    if (s.output && s.status !== "pass") console.log(`     ${s.output.split("\n").slice(0, 8).join("\n     ")}`);
  };

  console.log(`Sandbox: ${dir}\n`);

  // 1. install
  {
    const t = Date.now();
    const res = await runCommand(dir, NPM, ["install", "--no-audit", "--no-fund", "--prefer-offline", "--loglevel=error"], 240_000);
    const hasNodeModules = fs.existsSync(path.join(dir, "node_modules"));
    emit({ id: "install", label: "Install dependencies", status: res.code === 0 || hasNodeModules ? "pass" : "fail", output: res.stderr, durationMs: Date.now() - t });
    if (res.code !== 0 && !hasNodeModules) return fail();
  }
  // 2. typecheck
  {
    const t = Date.now();
    const res = await runNpx(dir, ["tsc", "--noEmit"], 180_000);
    emit({ id: "typecheck", label: "Type check", status: res.code === 0 ? "pass" : "fail", output: res.stderr, durationMs: Date.now() - t });
    if (res.code !== 0) return fail();
  }
  // 3. lint (strict)
  {
    const t = Date.now();
    const res = await runNpx(dir, ["tsc", "--noEmit", "--noUnusedLocals", "--noUnusedParameters"], 180_000);
    emit({ id: "lint", label: "Lint (strict types)", status: res.code === 0 ? "pass" : "warn", output: res.stderr, durationMs: Date.now() - t });
  }
  // 4. unit tests
  {
    const t = Date.now();
    const res = await runNpx(dir, ["vitest", "run", "--reporter=basic"], 180_000);
    emit({ id: "unit_tests", label: "Unit tests", status: res.code === 0 ? "pass" : "fail", output: res.stdout, durationMs: Date.now() - t });
    if (res.code !== 0) return fail();
  }
  // 5. production build
  {
    const t = Date.now();
    const res = await runNpx(dir, ["tsc"], 180_000);
    emit({ id: "build", label: "Production build", status: res.code === 0 ? "pass" : "fail", output: res.stderr, durationMs: Date.now() - t });
    if (res.code !== 0) return fail();
  }
  // 6. security
  {
    const t = Date.now();
    const report = runSecurityScan(files);
    emit({ id: "security", label: "Security scan", status: report.score >= 85 ? "pass" : report.score >= 70 ? "warn" : "fail", output: `${report.findings.length} finding(s) — score ${report.score}/100`, durationMs: Date.now() - t });
  }
  // 7. runtime
  {
    const t = Date.now();
    const res = await runCommand(dir, process.platform === "win32" ? "node.exe" : "node", ["dist/index.js"], 60_000);
    emit({ id: "runtime", label: "Runtime check", status: res.code === 0 ? "pass" : "fail", output: res.stdout, durationMs: Date.now() - t });
    if (res.code !== 0) return fail();
  }

  console.log("\n── Readiness report ──");
  const readiness = computeReadiness({
    files,
    envVars: [{ name: "APP_NAME", isSecret: false }],
    lastRun: { steps, passed: true, durationMs: steps.reduce((a, s) => a + (s.durationMs ?? 0), 0) },
    hasDatabase: false,
  });
  for (const c of readiness.checks) {
    console.log(`  ${c.ok ? "✓" : "✗"} ${c.label}${!c.ok && c.critical ? "  [BLOCKER]" : ""}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  console.log(`\nProduction readiness score: ${readiness.score}/100`);
  console.log(`Blockers: ${readiness.blockers.length ? readiness.blockers.join(" | ") : "none — deployable"}`);

  console.log("\nCleaning up sandbox…");
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit(0);

  function fail() {
    console.error("\nSANDBOX VERIFICATION FAILED");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
