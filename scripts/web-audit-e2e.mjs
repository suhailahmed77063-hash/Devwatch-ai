/**
 * DevWatch AI — real end-to-end web audit run.
 * Mirrors src/lib/security-agent/web-audit.ts (Phase 1 detect + Phase 2 exploit probes + report).
 * Usage: node scripts/web-audit-e2e.mjs https://target-site
 */
const TARGET = process.argv[2] ?? "https://devwatch-ai.vercel.app";
const CANARY = "dw7x2canary";
const UA = "Mozilla/5.0 (compatible; DevWatchAI-WebAudit/1.0)";
const findings = [];
const validations = [];
const checkedPaths = [];
const W = { critical: 30, high: 15, medium: 8, low: 3, info: 0 };
const started = Date.now();
const BUDGET = 70_000;

const isPublic = (u) => {
  try {
    const x = new URL(u);
    const h = x.hostname.toLowerCase();
    if (x.protocol !== "http:" && x.protocol !== "https:") return false;
    return !(h === "localhost" || /^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^169\.254\./.test(h) || h.endsWith(".local") || h.endsWith(".internal"));
  } catch { return false; }
};

const fetchPage = async (url, opts = {}) => {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...(opts.headers ?? {}) }, redirect: opts.redirect ?? "follow", signal: AbortSignal.timeout(12_000) });
    const text = (await res.text()).slice(0, 2_000_000);
    return { res, text };
  } catch { return null; }
};

// ── Phase 1: Detect ────────────────────────────────────────────────────────
const probe = new URL(TARGET.startsWith("http") ? TARGET : "https://" + TARGET);
if (!isPublic(probe.toString())) { console.error("Target blocked (SSRF guard)"); process.exit(1); }
const main = await fetchPage(probe.toString());
if (!main) { console.error("Site unreachable"); process.exit(1); }
const { res, text: body } = main;
const finalUrl = res.url || probe.toString();
const https = finalUrl.startsWith("https://");
const origin = new URL(finalUrl).origin;
const ttfb = Date.now() - started;
console.log(`[detect] ${finalUrl} -> HTTP ${res.status}, ${body.length} bytes, ttfb ~${ttfb}ms, https=${https}`);

if (!https) findings.push({ category: "security", severity: "high", checkId: "tls.https", title: "Site served over plain HTTP" });
for (const [name, label, sev, rec] of [
  ["strict-transport-security", "HSTS missing", "medium", "Add Strict-Transport-Security header"],
  ["content-security-policy", "Content-Security-Policy missing", "high", "Add a restrictive CSP"],
  ["x-content-type-options", "X-Content-Type-Options missing", "low", "Add nosniff"],
  ["x-frame-options", "X-Frame-Options missing", "medium", "Add DENY / frame-ancestors"],
  ["referrer-policy", "Referrer-Policy missing", "low", "Add strict-origin-when-cross-origin"],
  ["permissions-policy", "Permissions-Policy missing", "low", "Restrict powerful APIs"],
]) if (!res.headers.get(name)) findings.push({ category: "security", severity: sev, checkId: "headers." + name, title: label, recommendation: rec });

const setCookies = res.headers.getSetCookie?.() ?? [];
const insecureCookies = setCookies.filter((c) => !/secure/i.test(c) || !/httponly/i.test(c));
if (insecureCookies.length) findings.push({ category: "security", severity: "medium", checkId: "cookies.flags", title: `${insecureCookies.length} cookie(s) missing Secure/HttpOnly`, evidence: insecureCookies.map((c) => c.split(";")[0]).join(", ") });
if (https) {
  const mixed = (body.match(/(?:src|href)=["']http:\/\/[^"']+["']/gi) ?? []).slice(0, 5);
  if (mixed.length) findings.push({ category: "security", severity: "high", checkId: "content.mixed", title: `Mixed content (${mixed.length}+)`, evidence: mixed.join(", ") });
}

for (const p of ["/.env", "/.env.local", "/.git/HEAD", "/composer.json", "/package.json", "/phpinfo.php", "/.DS_Store", "/backup.zip", "/server-status"]) {
  if (Date.now() - started > BUDGET) break;
  const u = origin + p;
  const r = await fetchPage(u);
  const status = r ? r.res.status : null;
  checkedPaths.push({ path: p, status });
  if (r && r.res.status === 200) {
    const sev = p.includes(".env") || p.includes(".git") ? "critical" : p.includes("phpinfo") || p.includes("backup") ? "high" : p.includes("composer") || p.includes("server-status") ? "medium" : "low";
    findings.push({ category: "security", severity: sev, checkId: "exposure." + p, title: `${p} publicly readable`, evidence: `${u} returned 200` });
  }
}

const title = body.match(/<title[^>]*>([^<]{0,300})<\/title>/i)?.[1]?.trim();
const desc = body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,500})["']/i)?.[1];
const h1 = (body.match(/<h1[\s>]/gi) ?? []).length;
const imgs = body.match(/<img\b[^>]*>/gi) ?? [];
const noAlt = imgs.filter((t) => !/\balt\s*=/i.test(t)).length;
if (!title) findings.push({ category: "seo", severity: "medium", checkId: "seo.title", title: "Missing <title>" });
if (!desc) findings.push({ category: "seo", severity: "medium", checkId: "seo.description", title: "Missing meta description" });
if (h1 === 0) findings.push({ category: "seo", severity: "low", checkId: "seo.h1", title: "No <h1> heading" });
if (noAlt > 0) findings.push({ category: "accessibility", severity: "medium", checkId: "a11y.img-alt", title: `${noAlt} image(s) missing alt` });
if (!/<html[^>]+lang=/i.test(body)) findings.push({ category: "accessibility", severity: "low", checkId: "a11y.lang", title: "<html> lacks lang" });
if (!/rel=["']canonical["']/i.test(body)) findings.push({ category: "seo", severity: "low", checkId: "seo.canonical", title: "Missing canonical link" });
if (!/name=["']viewport["']/i.test(body)) findings.push({ category: "seo", severity: "medium", checkId: "seo.viewport", title: "Missing viewport meta" });
if (!res.headers.get("content-encoding")) findings.push({ category: "performance", severity: "low", checkId: "perf.compression", title: "Response not compressed" });

// ── Phase 2: Safe exploit probes ───────────────────────────────────────────
// 1) XSS reflection
{
  const u = new URL(finalUrl);
  const payload = CANARY + `"><script>`;
  u.searchParams.set("dw_probe", payload);
  const r = await fetchPage(u.toString());
  if (r) {
    const isHtml = (r.res.headers.get("content-type") ?? "").includes("text/html");
    const raw = isHtml && r.text.includes(payload);
    const encoded = r.text.includes(CANARY + "&quot;&gt;&lt;script&gt;");
    validations.push({ findingCheckId: "exploit.xss-reflection", probe: `GET ${u.pathname}?dw_probe=<canary>"><script>`, status: raw ? "exploited" : encoded || !r.text.includes(CANARY) || !isHtml ? "mitigated" : "inconclusive", evidence: raw ? "Canary reflected unencoded in HTML — injected script would execute." : undefined });
    if (raw) findings.push({ category: "security", severity: "high", checkId: "xss.reflection", title: "Query parameter reflected without encoding (XSS-prone)" });
  }
}
// 2) SQLi error leakage
{
  const u = new URL(finalUrl);
  u.searchParams.set("id", "1'");
  const r = await fetchPage(u.toString());
  if (r) {
    const leak = /(SQL syntax|SQLSTATE|unterminated quoted string|pg_query|ORA-\d{5}|You have an error in your SQL)/i.exec(r.text);
    validations.push({ findingCheckId: "exploit.sqli-errors", probe: "GET ?id=1' — DB error leakage", status: leak ? "exploited" : "mitigated", evidence: leak ? r.text.slice(Math.max(0, (leak.index ?? 0) - 60), (leak.index ?? 0) + 120) : undefined });
    if (leak) findings.push({ category: "security", severity: "high", checkId: "sqli.error-leak", title: "Database error leaked to clients (SQLi-prone)" });
  }
}
// 3) Open redirect
{
  const u = new URL(finalUrl);
  u.searchParams.set("redirect", "/");
  u.searchParams.set("url", "/");
  u.searchParams.set("next", "/");
  const r = await fetchPage(u.toString(), { redirect: "manual" });
  if (r) {
    const loc = r.res.headers.get("location");
    const open = r.res.status >= 300 && r.res.status < 400 && loc && /^https?:\/\//i.test(loc) && !loc.startsWith(origin);
    validations.push({ findingCheckId: "exploit.open-redirect", probe: "GET ?redirect=/&url=/&next=/ (manual)", status: open ? "exploited" : "mitigated", evidence: open ? `Redirects to: ${loc}` : undefined });
    if (open) findings.push({ category: "security", severity: "medium", checkId: "redirect.open", title: "Open redirect via query parameter" });
  }
}
// 4) CORS
{
  const r = await fetchPage(finalUrl, { headers: { Origin: "https://evil.example" } });
  if (r) {
    const acao = r.res.headers.get("access-control-allow-origin");
    const creds = r.res.headers.get("access-control-allow-credentials");
    const bad = (acao === "*" && creds === "true") || (acao === "https://evil.example" && creds === "true");
    validations.push({ findingCheckId: "exploit.cors", probe: "GET Origin: evil.example — ACAO check", status: bad ? "exploited" : "mitigated", evidence: bad ? `ACAO ${acao} + ACAC ${creds}` : undefined });
    if (bad) findings.push({ category: "security", severity: "high", checkId: "cors.permissive", title: "Permissive CORS with credentials" });
  }
}
// 5) Directory listing
{
  const r = await fetchPage(origin + "/");
  if (r) {
    const listing = /<title>Index of \/<\/title>|Directory listing for/i.test(r.text.slice(0, 200_000));
    validations.push({ findingCheckId: "exploit.dir-listing", probe: "GET / — directory listing markers", status: listing ? "exploited" : "mitigated" });
    if (listing) findings.push({ category: "security", severity: "medium", checkId: "exposure.dir-listing", title: "Directory listing enabled at web root" });
  }
}
// 6) Dangerous methods
{
  try {
    const r = await fetch(finalUrl, { method: "OPTIONS", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12_000) });
    const allow = r.headers.get("allow") ?? r.headers.get("access-control-allow-methods") ?? "";
    const bad = /TRACE|TRACK|PUT|DELETE/i.test(allow);
    validations.push({ findingCheckId: "exploit.http-methods", probe: "OPTIONS — Allow methods", status: bad ? "exploited" : "mitigated", evidence: bad ? `advertises: ${allow}` : undefined });
    if (bad) findings.push({ category: "security", severity: "medium", checkId: "methods.dangerous", title: "Dangerous HTTP methods advertised" });
  } catch {
    validations.push({ findingCheckId: "exploit.http-methods", probe: "OPTIONS — Allow methods", status: "inconclusive" });
  }
}

// ── Score + report ─────────────────────────────────────────────────────────
const exploitedCount = validations.filter((v) => v.status === "exploited").length;
const deduction = findings.reduce((s, f) => s + W[f.severity], 0);
const score = Math.max(0, Math.min(100, 100 - deduction));
const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
const counts = { critical: findings.filter((f) => f.severity === "critical").length, high: findings.filter((f) => f.severity === "high").length, medium: findings.filter((f) => f.severity === "medium").length, low: findings.filter((f) => f.severity === "low").length };

const fixLines = findings.filter((f) => f.severity !== "info").map((f, i) => {
  const validated = validations.some((v) => v.status === "exploited" && (v.findingCheckId === "exploit." + f.checkId.split(".")[1] || f.checkId === v.findingCheckId.replace("exploit.", "").replace("-", ".")));
  return `### ${i + 1}. ${f.title} (${f.severity.toUpperCase()}${validated ? ", exploit-validated" : ""})\n\n**Problem.** ${f.recommendation ?? "Weakness detected."}\n\n**Fix.** ${f.recommendation ?? "Apply standard hardening for this finding."}\n\n**Verification.** Re-run this audit after deploying the fix — the corresponding check must pass.`;
});

const report = [
  `# Web Audit + Exploit Validation Report — ${finalUrl}`,
  "",
  `> DevWatch AI — real end-to-end run on ${new Date().toISOString()}`,
  "",
  `| | |`,
  `| --- | --- |`,
  `| Health score | **${score}/100** (grade ${grade}) |`,
  `| Findings | ${findings.length} (${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low) |`,
  `| Exploit probes | ${validations.length} run — **${exploitedCount} exploited**, ${validations.length - exploitedCount} mitigated/inconclusive |`,
  `| HTTPS | ${https ? "✅" : "❌"} | TTFB | ${ttfb} ms |`,
  `| Page title | ${title ?? "—"} |`,
  "",
  "## Issues",
  "",
  findings.length ? ["| Severity | Category | Issue |", "| --- | --- | --- |", ...findings.map((f) => `| ${f.severity.toUpperCase()} | ${f.category} | ${f.title} |`)].join("\n") : "_None._",
  "",
  "## Exploit validation",
  "",
  ["| Probe | Result | Evidence |", "| --- | --- | --- |", ...validations.map((v) => `| ${v.probe} | ${v.status === "exploited" ? "🔴 EXPLOITED" : v.status === "mitigated" ? "🟢 mitigated" : "⚪ inconclusive"} | ${(v.evidence ?? "—").slice(0, 160)} |`)].join("\n"),
  "",
  "## Fix plan",
  "",
  fixLines.join("\n\n") || "_Nothing to fix._",
  "",
  "## Exposed-path probe results",
  "",
  ["| Path | Status |", "| --- | --- |", ...checkedPaths.map((p) => `| ${p.path} | ${p.status ?? "no answer"} |`)].join("\n"),
  "",
  "---",
  "_Read-only + non-destructive canary probes only. No data was modified._",
].join("\n");

console.log("\n=== SUMMARY ===");
console.log(`score=${score}/100 grade=${grade} findings=${findings.length} exploited=${exploitedCount}/${validations.length}`);
console.table(findings.map((f) => ({ severity: f.severity, checkId: f.checkId, title: f.title })));
console.table(validations.map((v) => ({ probe: v.findingCheckId, status: v.status })));
const fs = await import("node:fs");
fs.mkdirSync("reports", { recursive: true });
const out = `reports/web-audit-${new URL(finalUrl).hostname}-${Date.now()}.md`;
fs.writeFileSync(out, report);
console.log(`\nReport saved: ${out}`);
