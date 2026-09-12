/**
 * Website URL Testing — end-to-end audit + safe exploit validation engine.
 *
 * Phase 1 — Detect: availability, HTTPS/TLS, security headers, cookies,
 * mixed content, exposed sensitive paths, SEO, accessibility, performance.
 * Phase 2 — Validate: active, NON-DESTRUCTIVE exploit probes for the
 * vulnerability classes that can be confirmed safely over HTTP:
 *   XSS reflection, SQLi error leakage, open redirect, permissive CORS,
 *   directory listing, dangerous HTTP methods, cookie exposure.
 *   Nothing is modified or destroyed; payloads are benign canaries.
 * Phase 3 — Explain: AI-generated fix plan (problem → fix → verification)
 *   per finding, with a deterministic fallback when no AI key is set.
 * Output: findings + validation results + fix plan + 0-100 score + a
 * final download-ready report.
 *
 * Safety: only safe methods, request/response size caps, per-request and
 * overall timeouts, same-origin redirect probes only, private-network
 * targets blocked (SSRF guard).
 */

export type WebSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface WebFinding {
  category: "security" | "performance" | "seo" | "accessibility" | "content" | "availability";
  severity: WebSeverity;
  checkId: string;
  title: string;
  detail?: string;
  evidence?: string;
  recommendation?: string;
}

export interface WebValidation {
  findingCheckId: string;
  probe: string;
  request: string;
  status: "exploited" | "mitigated" | "inconclusive";
  evidence?: string;
}

export interface WebAuditResult {
  url: string;
  finalUrl: string;
  reachable: boolean;
  https: boolean;
  findings: WebFinding[];
  validations: WebValidation[];
  fixPlan: FixPlanItem[];
  score: number;
  summary: string;
  timings: { totalMs: number; ttfbMs: number | null; loadMs: number | null };
  pageMeta: {
    title?: string;
    description?: string;
    h1Count: number;
    imgWithoutAlt: number;
    htmlBytes: number;
    generator?: string;
  };
  checkedPaths: Array<{ path: string; status: number | null }>;
}

const REQUEST_TIMEOUT_MS = 12_000;
const MAX_BYTES = 2_000_000; // 2 MB per response
const OVERALL_BUDGET_MS = 75_000;
const UA = "Mozilla/5.0 (compatible; DevWatchAI-WebAudit/1.0; +https://devwatch.ai/bot)";
const CANARY = "dw7x2canary"; // benign marker used by exploit probes

/** SSRF guard: block localhost, private ranges, and non-http(s) schemes. */
function isPublicHttpUrl(url: string): URL | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host === "metadata.google.internal"
  ) {
    return null;
  }
  return u;
}

async function fetchPage(url: string): Promise<{ res: Response; body: string; ttfbMs: number; totalMs: number } | null> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const ttfbMs = Date.now() - started;
    const reader = res.body?.getReader();
    let body = "";
    if (reader) {
      const decoder = new TextDecoder();
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        body += decoder.decode(value, { stream: true });
        if (received > MAX_BYTES) {
          await reader.cancel().catch(() => undefined);
          break;
        }
      }
    }
    return { res, body, ttfbMs, totalMs: Date.now() - started };
  } catch {
    return null;
  }
}

function statusText(code: number): string {
  return `HTTP ${code}`;
}

function extractMeta(body: string): WebAuditResult["pageMeta"] {
  const title = body.match(/<title[^>]*>([^<]{0,300})<\/title>/i)?.[1]?.trim();
  const description = body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,500})["']/i)?.[1]
    ?? body.match(/<meta[^>]+content=["']([^"']{0,500})["'][^>]+name=["']description["']/i)?.[1];
  const h1Count = (body.match(/<h1[\s>]/gi) ?? []).length;
  const imgs = body.match(/<img\b[^>]*>/gi) ?? [];
  const imgWithoutAlt = imgs.filter((t) => !/\balt\s*=/i.test(t)).length;
  const generator = body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']{0,120})["']/i)?.[1];
  return { title, description, h1Count, imgWithoutAlt, htmlBytes: body.length, generator };
}

const EXPOSED_PATHS: Array<{ path: string; label: string; severity: WebSeverity }> = [
  { path: "/.env", label: "Environment file (.env) publicly readable", severity: "critical" },
  { path: "/.env.local", label: "Environment file (.env.local) publicly readable", severity: "critical" },
  { path: "/.git/HEAD", label: "Git repository metadata exposed (.git/HEAD)", severity: "critical" },
  { path: "/composer.json", label: "composer.json publicly readable", severity: "medium" },
  { path: "/package.json", label: "package.json publicly readable", severity: "low" },
  { path: "/phpinfo.php", label: "phpinfo() page exposed", severity: "high" },
  { path: "/wp-login.php", label: "WordPress login endpoint (informational)", severity: "info" },
  { path: "/.DS_Store", label: ".DS_Store directory listing artifact exposed", severity: "low" },
  { path: "/backup.zip", label: "Backup archive publicly downloadable", severity: "high" },
  { path: "/server-status", label: "Apache server-status exposed", severity: "medium" },
];

const SECURITY_HEADERS: Array<{ name: string; label: string; severity: WebSeverity; rec: string }> = [
  { name: "strict-transport-security", label: "HSTS missing", severity: "medium", rec: "Add Strict-Transport-Security: max-age=63072000; includeSubDomains; preload" },
  { name: "content-security-policy", label: "Content-Security-Policy missing", severity: "high", rec: "Define a Content-Security-Policy to mitigate XSS" },
  { name: "x-content-type-options", label: "X-Content-Type-Options missing", severity: "low", rec: "Add X-Content-Type-Options: nosniff" },
  { name: "x-frame-options", label: "X-Frame-Options missing", severity: "medium", rec: "Add X-Frame-Options: DENY or frame-ancestors CSP directive" },
  { name: "referrer-policy", label: "Referrer-Policy missing", severity: "low", rec: "Add Referrer-Policy: strict-origin-when-cross-origin" },
  { name: "permissions-policy", label: "Permissions-Policy missing", severity: "low", rec: "Add a Permissions-Policy header restricting powerful APIs" },
];

const SEV_WEIGHT: Record<WebSeverity, number> = { critical: 30, high: 15, medium: 8, low: 3, info: 0 };

export async function runWebAudit(rawUrl: string): Promise<WebAuditResult> {
  const started = Date.now();
  const findings: WebFinding[] = [];
  const checkedPaths: WebAuditResult["checkedPaths"] = [];

  const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const target = isPublicHttpUrl(normalized);
  if (!target) {
    return {
      url: rawUrl,
      finalUrl: normalized,
      reachable: false,
      https: false,
      findings: [{ category: "availability", severity: "critical", checkId: "url.invalid", title: "URL is invalid or not a public website", detail: "Only public http(s) URLs can be audited." }],
      validations: [], fixPlan: [],
      score: 0,
      summary: "URL could not be audited (invalid or non-public address).",
      timings: { totalMs: Date.now() - started, ttfbMs: null, loadMs: null },
      pageMeta: { h1Count: 0, imgWithoutAlt: 0, htmlBytes: 0 },
      checkedPaths: [],
    };
  }

  const origin = target.origin;
  // ── Availability + protocol ──────────────────────────────────────────────
  const main = await fetchPage(target.toString());
  if (!main) {
    findings.push({
      category: "availability", severity: "critical", checkId: "site.unreachable",
      title: "Site did not respond",
      detail: "The server did not answer within the timeout or refused the connection.",
      recommendation: "Verify the site is up and publicly reachable.",
    });
    return {
      url: rawUrl, finalUrl: target.toString(), reachable: false, https: target.protocol === "https:",
      findings, validations: [], fixPlan: [], score: 0,
      summary: "Site unreachable — no further checks possible.",
      timings: { totalMs: Date.now() - started, ttfbMs: null, loadMs: null },
      pageMeta: { h1Count: 0, imgWithoutAlt: 0, htmlBytes: 0 }, checkedPaths,
    };
  }

  const { res, body, ttfbMs, totalMs } = main;
  const finalUrl = res.url || target.toString();
  const https = finalUrl.startsWith("https://");

  if (!https) {
    findings.push({
      category: "security", severity: "high", checkId: "tls.https",
      title: "Site served over plain HTTP",
      detail: "Traffic is unencrypted; credentials and session tokens can be intercepted.",
      recommendation: "Install TLS and force HTTPS redirects.",
    });
  } else {
    findings.push({ category: "security", severity: "info", checkId: "tls.https", title: "HTTPS enabled" });
  }

  if (res.status >= 400) {
    findings.push({
      category: "availability", severity: "critical", checkId: "site.status",
      title: `Homepage returns ${statusText(res.status)}`,
      detail: `Final URL: ${finalUrl}`,
    });
  }

  // ── Security headers ─────────────────────────────────────────────────────
  for (const h of SECURITY_HEADERS) {
    if (!res.headers.get(h.name)) {
      findings.push({
        category: "security", severity: h.severity, checkId: `headers.${h.name}`,
        title: h.label, recommendation: h.rec,
      });
    }
  }

  // ── Cookies flags ────────────────────────────────────────────────────────
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const insecureCookies = setCookies.filter((c) => !/secure/i.test(c) || !/httponly/i.test(c));
  if (insecureCookies.length > 0) {
    findings.push({
      category: "security", severity: "medium", checkId: "cookies.flags",
      title: `${insecureCookies.length} cookie(s) missing Secure/HttpOnly flags`,
      detail: insecureCookies.map((c) => c.split(";")[0]).slice(0, 5).join(", "),
      recommendation: "Set Secure; HttpOnly; SameSite on all cookies.",
    });
  }

  // ── Mixed content ────────────────────────────────────────────────────────
  if (https) {
    const insecureRefs = (body.match(/(?:src|href)=["']http:\/\/[^"']+["']/gi) ?? []).slice(0, 5);
    if (insecureRefs.length > 0) {
      findings.push({
        category: "security", severity: "high", checkId: "content.mixed",
        title: `Mixed content: ${insecureRefs.length}+ insecure http:// references on an HTTPS page`,
        evidence: insecureRefs.join(", ").slice(0, 500),
        recommendation: "Load all assets over HTTPS.",
      });
    }
  }

  // ── Exposed paths ────────────────────────────────────────────────────────
  const deadline = started + OVERALL_BUDGET_MS;
  for (const p of EXPOSED_PATHS) {
    if (Date.now() > deadline) break;
    const u = origin + p.path;
    try {
      const r = await fetch(u, {
        method: "GET",
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(6000),
      });
      // consume a small part to complete the request
      await r.text().then((t) => t.slice(0, 200)).catch(() => "");
      checkedPaths.push({ path: p.path, status: r.status });
      if (r.status === 200) {
        findings.push({
          category: "security", severity: p.severity, checkId: `exposure.${p.path}`,
          title: p.label, evidence: `${u} returned 200`, 
          recommendation: "Restrict access to this file/path at the web server or CDN level.",
        });
      }
    } catch {
      checkedPaths.push({ path: p.path, status: null });
    }
  }

  // ── SEO / content / a11y signals ─────────────────────────────────────────
  const meta = extractMeta(body);
  if (!meta.title) findings.push({ category: "seo", severity: "medium", checkId: "seo.title", title: "Missing <title>", recommendation: "Add a descriptive <title> (50-60 chars)." });
  else if (meta.title.length > 65) findings.push({ category: "seo", severity: "low", checkId: "seo.title.length", title: `<title> is long (${meta.title.length} chars)`, recommendation: "Keep the title under 60 characters." });
  if (!meta.description) findings.push({ category: "seo", severity: "medium", checkId: "seo.description", title: "Missing meta description", recommendation: "Add <meta name=\"description\"> (120-160 chars)." });
  if (meta.h1Count === 0) findings.push({ category: "seo", severity: "low", checkId: "seo.h1", title: "No <h1> heading found", recommendation: "Use exactly one descriptive <h1> per page." });
  if (meta.imgWithoutAlt > 0) findings.push({
    category: "accessibility", severity: "medium", checkId: "a11y.img-alt",
    title: `${meta.imgWithoutAlt} image(s) missing alt text`,
    recommendation: "Add descriptive alt attributes to all images.",
  });
  const lang = body.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1];
  if (!lang) findings.push({ category: "accessibility", severity: "low", checkId: "a11y.lang", title: "<html> lacks a lang attribute", recommendation: "Set <html lang=\"...\"> for screen readers." });
  if (!/<link[^>]+rel=["']canonical["']/i.test(body)) findings.push({ category: "seo", severity: "low", checkId: "seo.canonical", title: "Missing canonical link", recommendation: "Add <link rel=\"canonical\"> to avoid duplicate-content issues." });
  if (!/<meta[^>]+name=["']viewport["']/i.test(body)) findings.push({ category: "seo", severity: "medium", checkId: "seo.viewport", title: "Missing viewport meta tag (mobile-unfriendly)", recommendation: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">." });

  // ── Performance signals ──────────────────────────────────────────────────
  if (ttfbMs > 1500) findings.push({ category: "performance", severity: "medium", checkId: "perf.ttfb", title: `Slow first byte: ${ttfbMs} ms`, recommendation: "Target TTFB < 800 ms (edge caching, faster origin)." });
  if (meta.htmlBytes > 500_000) findings.push({ category: "performance", severity: "low", checkId: "perf.html-size", title: `HTML document is large (${Math.round(meta.htmlBytes / 1024)} KB)`, recommendation: "Reduce inline scripts/styles; aim for < 150 KB HTML." });
  const compression = res.headers.get("content-encoding");
  if (!compression) findings.push({ category: "performance", severity: "low", checkId: "perf.compression", title: "Response not compressed", recommendation: "Enable gzip/brotli compression." });

  // ── Score + summary ──────────────────────────────────────────────────────
  const validations = await runExploitProbes({ origin, finalUrl, body, res, findings, checkedPaths, deadline: started + OVERALL_BUDGET_MS });
  const fixPlan = await buildFixPlan(findings, validations);

  const deduction = findings.reduce((sum, f) => sum + SEV_WEIGHT[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - deduction));
  const counts = {
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
  };
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
  const exploitedCount = validations.filter((v) => v.status === "exploited").length;
  const summary =
    `Health score ${score}/100 (grade ${grade}). ` +
    `Found ${findings.length} issue(s): ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low. ` +
    (validations.length ? `Exploit validation: ${exploitedCount} exploited, ${validations.length - exploitedCount} mitigated/inconclusive. ` : "") +
    `Loaded in ${totalMs} ms (TTFB ${ttfbMs} ms).`;

  return {
    url: rawUrl, finalUrl, reachable: true, https, findings, validations, fixPlan, score, summary,
    timings: { totalMs, ttfbMs, loadMs: totalMs },
    pageMeta: meta, checkedPaths,
  };
}

// ═════════════════════════════════════════════════════════════════════════
// Phase 2 — Safe exploit validation (active, non-destructive probes)
// ═════════════════════════════════════════════════════════════════════════

/**
 * Actively validates the detected vulnerability classes with benign,
 * non-destructive probes. Every probe is a canary: it only READS or
 * ECHOES, never writes, deletes, or stresses the target.
 */
async function runExploitProbes(ctx: {
  origin: string;
  finalUrl: string;
  body: string;
  res: Response;
  findings: WebFinding[];
  checkedPaths: Array<{ path: string; status: number | null }>;
  deadline: number;
}): Promise<WebValidation[]> {
  const out: WebValidation[] = [];
  const has = (id: string) => ctx.findings.some((f) => f.checkId === id);
  const timeLeft = () => Date.now() < ctx.deadline;

  // 1) XSS reflection probe — inject a benign canary into a query param and
  //    check if it reflects back unencoded in the response body.
  if (timeLeft()) {
    try {
      const u = new URL(ctx.finalUrl);
      const payload = CANARY + `"><script>`;
      u.searchParams.set("dw_probe", payload);
      const r = await fetch(u.toString(), {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const text = (await r.text()).slice(0, MAX_BYTES);
      const isHtml = (r.headers.get("content-type") ?? "").includes("text/html");
      const rawReflected = isHtml && text.includes(payload);
      const encoded = text.includes(CANARY + "&quot;&gt;&lt;script&gt;");
      out.push({
        findingCheckId: "exploit.xss-reflection",
        probe: `GET ${u.pathname}?dw_probe=<canary>"><script> — checking response reflection`,
        request: u.toString(),
        status: rawReflected ? "exploited" : encoded || !text.includes(CANARY) || !isHtml ? "mitigated" : "inconclusive",
        evidence: rawReflected ? "Canary reflected unencoded in the HTML response — an attacker-controlled script tag would execute in the victim's browser." : undefined,
      });
      if (rawReflected && !has("xss.reflection")) {
        ctx.findings.push({
          category: "security", severity: "high", checkId: "xss.reflection",
          title: "Query parameter reflected without encoding (XSS-prone)",
          detail: `Parameter dw_probe echoed raw in the response at ${u.pathname}.`,
          recommendation: "HTML-encode all reflected input and add a strict Content-Security-Policy.",
        });
      }
    } catch {
      out.push({ findingCheckId: "exploit.xss-reflection", probe: "XSS reflection probe", request: ctx.finalUrl, status: "inconclusive" });
    }
  }

  // 2) SQLi error-based probe — malformed parameter should NOT leak SQL errors.
  if (timeLeft()) {
    try {
      const u = new URL(ctx.finalUrl);
      u.searchParams.set("id", "1'");
      const r = await fetch(u.toString(), { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      const text = (await r.text()).slice(0, 400_000);
      const leak = /(SQL syntax|SQLSTATE|unterminated quoted string|pg_query|ORA-\d{5}|You have an error in your SQL)/i.exec(text);
      out.push({
        findingCheckId: "exploit.sqli-errors",
        probe: "GET ?id=1' — checking for database error leakage",
        request: u.toString(),
        status: leak ? "exploited" : "mitigated",
        evidence: leak ? `Database error leaked in response: ${text.slice(Math.max(0, (leak.index ?? 0) - 60), (leak.index ?? 0) + 120)}` : undefined,
      });
      if (leak && !has("sqli.error-leak")) {
        ctx.findings.push({
          category: "security", severity: "high", checkId: "sqli.error-leak",
          title: "Database error message leaked to clients (SQLi-prone)",
          detail: "A malformed parameter produced a raw database error in the response.",
          recommendation: "Wrap DB access, log errors server-side, and return generic error pages.",
        });
      }
    } catch {
      out.push({ findingCheckId: "exploit.sqli-errors", probe: "SQLi error probe", request: ctx.finalUrl, status: "inconclusive" });
    }
  }

  // 3) Open-redirect probe — same-origin redirect target; harmless even if it fires.
  if (timeLeft()) {
    try {
      const u = new URL(ctx.finalUrl);
      u.searchParams.set("redirect", "/");
      u.searchParams.set("url", "/");
      u.searchParams.set("next", "/");
      const r = await fetch(u.toString(), { redirect: "manual", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      const loc = r.headers.get("location");
      const open = r.status >= 300 && r.status < 400 && typeof loc === "string" && /^https?:\/\//i.test(loc) && !loc.startsWith(ctx.origin);
      out.push({
        findingCheckId: "exploit.open-redirect",
        probe: "GET ?redirect=/&url=/&next=/ with redirect:manual — inspecting Location header",
        request: u.toString(),
        status: open ? "exploited" : "mitigated",
        evidence: open ? `Redirects to external location: ${loc}` : undefined,
      });
      if (open && !has("redirect.open")) {
        ctx.findings.push({
          category: "security", severity: "medium", checkId: "redirect.open",
          title: "Open redirect via query parameter",
          detail: `Parameter-controlled redirect left the origin: ${loc}`,
          recommendation: "Validate redirect targets against an allowlist of local paths/origins.",
        });
      }
    } catch {
      out.push({ findingCheckId: "exploit.open-redirect", probe: "Open redirect probe", request: ctx.finalUrl, status: "inconclusive" });
    }
  }

  // 4) CORS permissiveness probe — reflect a foreign Origin and inspect ACAO.
  if (timeLeft()) {
    try {
      const r = await fetch(ctx.finalUrl, {
        headers: { "User-Agent": UA, Origin: "https://evil.example" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const acao = r.headers.get("access-control-allow-origin");
      const creds = r.headers.get("access-control-allow-credentials");
      const bad = (acao === "*" && creds === "true") || (acao === "https://evil.example" && creds === "true");
      out.push({
        findingCheckId: "exploit.cors",
        probe: "GET with Origin: https://evil.example — inspecting Access-Control-Allow-Origin",
        request: ctx.finalUrl,
        status: bad ? "exploited" : "mitigated",
        evidence: bad ? `ACAO: ${acao}, ACAC: ${creds} — foreign origins can read authenticated responses.` : undefined,
      });
      if (bad && !has("cors.permissive")) {
        ctx.findings.push({
          category: "security", severity: "high", checkId: "cors.permissive",
          title: "Permissive CORS with credentials",
          recommendation: "Echo only trusted origins and avoid allow-credentials with wildcards.",
        });
      }
    } catch {
      out.push({ findingCheckId: "exploit.cors", probe: "CORS probe", request: ctx.finalUrl, status: "inconclusive" });
    }
  }

  // 5) Directory listing probe — re-check any 3xx/200 path probe targets.
  if (timeLeft()) {
    try {
      const r = await fetch(ctx.origin + "/", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      const text = (await r.text()).slice(0, 200_000);
      const listing = /<title>Index of \/<\/title>|Directory listing for/i.test(text);
      out.push({
        findingCheckId: "exploit.dir-listing",
        probe: "GET / — checking for directory listing markers",
        request: ctx.origin + "/",
        status: listing ? "exploited" : "mitigated",
        evidence: listing ? "Root path renders a directory index." : undefined,
      });
      if (listing && !has("exposure.dir-listing")) {
        ctx.findings.push({
          category: "security", severity: "medium", checkId: "exposure.dir-listing",
          title: "Directory listing enabled at web root",
          recommendation: "Disable autoindex and serve a default document.",
        });
      }
    } catch {
      out.push({ findingCheckId: "exploit.dir-listing", probe: "Directory listing probe", request: ctx.origin + "/", status: "inconclusive" });
    }
  }

  // 6) Dangerous HTTP methods probe — OPTIONS/TRACE discovery only.
  if (timeLeft()) {
    try {
      const r = await fetch(ctx.finalUrl, {
        method: "OPTIONS",
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const allow = r.headers.get("allow") ?? r.headers.get("access-control-allow-methods") ?? "";
      const dangerous = /TRACE|TRACK|PUT|DELETE/i.test(allow);
      out.push({
        findingCheckId: "exploit.http-methods",
        probe: "OPTIONS — inspecting Allow / Access-Control-Allow-Methods",
        request: ctx.finalUrl,
        status: dangerous ? "exploited" : "mitigated",
        evidence: dangerous ? `Server advertises dangerous methods: ${allow}` : undefined,
      });
      if (dangerous && !has("methods.dangerous")) {
        ctx.findings.push({
          category: "security", severity: "medium", checkId: "methods.dangerous",
          title: "Dangerous HTTP methods advertised (TRACE/PUT/DELETE)",
          recommendation: "Disable unused HTTP methods at the web server/edge.",
        });
      }
    } catch {
      out.push({ findingCheckId: "exploit.http-methods", probe: "HTTP methods probe", request: ctx.finalUrl, status: "inconclusive" });
    }
  }

  return out;
}

// ═════════════════════════════════════════════════════════════════════════
// Phase 3 — Fix plan (AI-generated, deterministic fallback)
// ═════════════════════════════════════════════════════════════════════════

export interface FixPlanItem {
  findingTitle: string;
  severity: WebSeverity;
  validated: boolean;
  problem: string;
  fix: string;
  verification: string;
}

const FIX_TEMPLATES: Record<string, { problem: string; fix: string; verification: string }> = {
  "headers.strict-transport-security": { problem: "Browsers may connect over plain HTTP and be downgraded/stripped.", fix: "Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` at the edge (Vercel.json headers or server middleware).", verification: "curl -sI https://site | grep -i strict; re-run this audit — the HSTS check must pass." },
  "headers.content-security-policy": { problem: "No CSP — any injected script (including the reflected-XSS path validated above) executes freely.", fix: "Add a restrictive CSP, e.g. `default-src 'self'; script-src 'self' 'nonce-<random>'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'` and iterate on report-uri violations.", verification: "Check the CSP header is present and re-run the XSS reflection probe — it must report mitigated." },
  "headers.x-content-type-options": { problem: "Browsers may MIME-sniff uploads into executable content.", fix: "Add `X-Content-Type-Options: nosniff` header globally.", verification: "curl -sI <site> | grep -i nosniff; re-run audit." },
  "headers.x-frame-options": { problem: "The site can be framed — clickjacking becomes possible.", fix: "Add `X-Frame-Options: DENY` or `frame-ancestors 'none'` in CSP.", verification: "Confirm header present; try framing the site in an iframe — it must be blocked." },
  "headers.referrer-policy": { problem: "Full URLs (incl. tokens) may leak to third parties via Referer.", fix: "Add `Referrer-Policy: strict-origin-when-cross-origin`.", verification: "Header present in curl -sI output; re-run audit." },
  "headers.permissions-policy": { problem: "Powerful browser APIs (camera, mic, geolocation) are unrestricted.", fix: "Add `Permissions-Policy: camera=(), microphone=(), geolocation=()` or an allowlist.", verification: "Header present; re-run audit." },
  "cookies.flags": { problem: "Session cookies without Secure/HttpOnly can be stolen via XSS or plaintext HTTP.", fix: "Set `Secure; HttpOnly; SameSite=Lax` on every Set-Cookie (framework cookie config or middleware).", verification: "curl -sI <login-url> shows flags on all cookies; re-run audit." },
  "xss.reflection": { problem: "Reflected input reaches HTML unencoded — script injection executes in victims' browsers (validated by the canary probe).", fix: "HTML-encode reflected values (framework auto-escaping / encodeURIComponent in JS sinks), validate parameter types, and deploy the CSP from the header fix.", verification: "Re-run the audit — the XSS reflection probe must report `mitigated`; manually test with `<script>alert(1)</script>` in the parameter." },
  "sqli.error-leak": { problem: "Raw database errors reach clients, exposing schema and injection surface (validated).", fix: "Catch DB exceptions server-side and return generic errors; use parameterized queries/ORM; enable verbose DB logging only in private logs.", verification: "Re-run audit — SQLi error probe must be `mitigated`; check error pages show no SQL text." },
  "redirect.open": { problem: "Attackers can craft links that redirect users to phishing sites (validated).", fix: "Allowlist redirect destinations: only relative paths (`/path`) or exact origins; reject absolute URLs to foreign hosts.", verification: `Send ?redirect=https://evil.example — it must be rejected; re-run audit.` },
  "cors.permissive": { problem: "Any origin can read authenticated responses with credentials (validated).", fix: "Configure CORS to echo only trusted origins; never combine `Access-Control-Allow-Origin: *` with `Allow-Credentials: true`.", verification: "Send Origin: https://evil.example — response must not carry ACAO for it; re-run audit." },
  "exposure.dir-listing": { problem: "Attackers can enumerate files on the server (validated).", fix: "Disable autoindex (nginx: `autoindex off;`; Apache: `Options -Indexes`) and serve a default document.", verification: "GET / must render the app, not a listing; re-run audit." },
  "methods.dangerous": { problem: "TRACE/PUT/DELETE advertised — Cross-Site Tracing or unauthorized writes become possible (validated).", fix: "Disable unused methods at the edge (nginx: `if ($request_method ~ ^(TRACE|TRACK)$) { return 405; }` or limit_methods in Vercel config).", verification: "OPTIONS must no longer advertise them; re-run audit." },
};

const EXPOSURE_RECOMMENDATION = "Restrict access to this file/path at the web server or CDN level";

function fallbackFixPlan(findings: WebFinding[], validations: WebValidation[]): FixPlanItem[] {
  const exploitedIds = new Set(validations.filter((v) => v.status === "exploited").map((v) => v.findingCheckId));
  const items: FixPlanItem[] = [];
  for (const f of findings.filter((x) => x.severity !== "info")) {
    const tpl = FIX_TEMPLATES[f.checkId];
    items.push({
      findingTitle: f.title,
      severity: f.severity,
      validated: exploitedIds.has(f.checkId) || f.checkId === "xss.reflection" && exploitedIds.has("exploit.xss-reflection"),
      problem: tpl?.problem ?? f.detail ?? "Weakness detected by the audit.",
      fix: tpl?.fix ?? f.recommendation ?? EXPOSURE_RECOMMENDATION + ".",
      verification: tpl?.verification ?? "Re-run this audit after deploying the fix — the corresponding check must pass.",
    });
  }
  return items;
}

/** AI fix plan with graceful fallback to deterministic templates. */
async function buildFixPlan(findings: WebFinding[], validations: WebValidation[]): Promise<FixPlanItem[]> {
  const fallback = fallbackFixPlan(findings, validations);
  const issues = findings.filter((f) => f.severity !== "info");
  if (!issues.length) return [];
  try {
    const { chatJson, aiConfigured } = await import("./llm");
    if (!aiConfigured()) return fallback;
    const exploited = validations.filter((v) => v.status === "exploited");
    const user = [
      "Website audit findings (target: public site, read-only audit):",
      ...issues.map((f) => `- [${f.severity}] ${f.title} (check ${f.checkId})${f.detail ? ` — ${f.detail}` : ""}`),
      "",
      "Exploit validation results (non-destructive canary probes):",
      ...(exploited.length
        ? exploited.map((v) => `- ${v.findingCheckId}: EXPLOITED — ${v.evidence ?? v.probe}`)
        : ["- No probe reproduced an exploit; remaining issues are hardening gaps."]),
      "",
      "For each finding produce: problem (what an attacker gains), fix (concrete, minimal, framework-agnostic), verification (how to test the fix). Respond JSON only:",
      '{"fixes":[{"findingTitle":string,"problem":string,"fix":string,"verification":string}]}',
    ].join("\n");
    const raw = await chatJson<{ fixes?: Array<{ findingTitle?: string; problem?: string; fix?: string; verification?: string }> }>({
      system:
        "You are a senior application-security engineer writing remediation guidance for a website audit report. Be concrete and minimal; reference the validated exploit evidence where relevant. Respond with JSON only.",
      user,
      maxTokens: 2000,
    });
    const byTitle = new Map<string, NonNullable<RawFix["fixes"]>[number]>();
    for (const fx of raw.fixes ?? []) if (fx.findingTitle) byTitle.set(fx.findingTitle, fx);
    if (!byTitle.size) return fallback;
    return issues.map((f) => {
      const tpl = FIX_TEMPLATES[f.checkId];
      const ai = byTitle.get(f.title);
      const exploitedIds = new Set(validations.filter((v) => v.status === "exploited").map((v) => v.findingCheckId));
      return {
        findingTitle: f.title,
        severity: f.severity,
        validated: exploitedIds.has(f.checkId),
        problem: (ai?.problem ?? tpl?.problem ?? f.detail ?? "Weakness detected by the audit.").slice(0, 800),
        fix: (ai?.fix ?? tpl?.fix ?? f.recommendation ?? "Apply the standard hardening for this finding.").slice(0, 800),
        verification: (ai?.verification ?? tpl?.verification ?? "Re-run this audit after deploying the fix.").slice(0, 600),
      };
    });
  } catch {
    return fallback;
  }
}

interface RawFix { fixes?: Array<{ findingTitle?: string; problem?: string; fix?: string; verification?: string }> }

/** Markdown report (download-ready). */
export function buildReportMarkdown(result: WebAuditResult): string {
  const line = (f: WebFinding) =>
    `| ${f.severity.toUpperCase()} | ${f.category} | ${f.title} | ${f.recommendation ?? "—"} |`;
  const issues = result.findings.filter((f) => f.severity !== "info");
  const passed = result.findings.filter((f) => f.severity === "info");

  return [
    `# Web Audit Report — ${result.url}`,
    "",
    `> Generated by **DevWatch AI — Website Testing** on ${new Date().toISOString()}`,
    "",
    `| | |`,
    `| --- | --- |`,
    `| Final URL | ${result.finalUrl} |`,
    `| Reachable | ${result.reachable ? "✅ yes" : "❌ no"} |`,
    `| HTTPS | ${result.https ? "✅ yes" : "❌ no"} |`,
    `| Health score | **${result.score}/100** |`,
    `| TTFB / total | ${result.timings.ttfbMs ?? "—"} ms / ${result.timings.totalMs} ms |`,
    `| Page title | ${result.pageMeta.title ?? "—"} |`,
    "",
    "## Issues",
    "",
    issues.length
      ? ["| Severity | Category | Issue | Recommendation |", "| --- | --- | --- | --- |", ...issues.map(line)].join("\n")
      : "_No issues found._",
    "",
    "## Passed checks",
    "",
    passed.length ? passed.map((f) => `- ✅ ${f.title}`).join("\n") : "_—_",
    "",
    "## Exploit validation (safe, non-destructive probes)",
    "",
    result.validations.length
      ? [
          "| Probe | Result | Evidence |",
          "| --- | --- | --- |",
          ...result.validations.map((v) =>
            `| ${v.probe} | ${v.status === "exploited" ? "🔴 EXPLOITED" : v.status === "mitigated" ? "🟢 mitigated" : "⚪ inconclusive"} | ${(v.evidence ?? "—").slice(0, 200)} |`
          ),
        ].join("\n")
      : "_No exploit probes were run._",
    "",
    "## Fix plan (problem → fix → verification)",
    "",
    result.fixPlan.length
      ? result.fixPlan
          .map(
            (p, i) =>
              `### ${i + 1}. ${p.findingTitle} (${p.severity.toUpperCase()}${p.validated ? ", validated by exploit probe" : ""})\n\n` +
              `**Problem.** ${p.problem}\n\n**Fix.** ${p.fix}\n\n**Verification.** ${p.verification}`
          )
          .join("\n\n")
      : "_Nothing to fix._",
    "",
    "## Exposed-path probe results",
    "",
    ["| Path | Status |", "| --- | --- |", ...result.checkedPaths.map((p) => `| ${p.path} | ${p.status ?? "no answer"} |`)].join("\n"),
    "",
    "---",
    "_Read-only, non-destructive audit. No exploitation was performed._",
  ].join("\n");
}
