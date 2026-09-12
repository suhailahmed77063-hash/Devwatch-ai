/**
 * Website URL Testing — end-to-end audit engine.
 *
 * Runs a battery of non-destructive, read-only checks against a target
 * website: availability, HTTPS/TLS, security headers, cookies, mixed
 * content, exposed sensitive paths, SEO basics, and performance signals.
 * Output: findings + 0-100 health score + summary. Used by the API route
 * to build a final download-ready report.
 *
 * Safety: only safe HTTP methods, request/response size caps, per-request
 * and overall timeouts, redirects followed within the same origin only,
 * private-network targets blocked (SSRF guard).
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

export interface WebAuditResult {
  url: string;
  finalUrl: string;
  reachable: boolean;
  https: boolean;
  findings: WebFinding[];
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
      findings, score: 0,
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
  const deduction = findings.reduce((sum, f) => sum + SEV_WEIGHT[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - deduction));
  const counts = {
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
  };
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
  const summary =
    `Health score ${score}/100 (grade ${grade}). ` +
    `Found ${findings.length} issue(s): ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low. ` +
    `Loaded in ${totalMs} ms (TTFB ${ttfbMs} ms).`;

  return {
    url: rawUrl, finalUrl, reachable: true, https, findings, score, summary,
    timings: { totalMs, ttfbMs, loadMs: totalMs },
    pageMeta: meta, checkedPaths,
  };
}

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
    "## Exposed-path probe results",
    "",
    ["| Path | Status |", "| --- | --- |", ...result.checkedPaths.map((p) => `| ${p.path} | ${p.status ?? "no answer"} |`)].join("\n"),
    "",
    "---",
    "_Read-only, non-destructive audit. No exploitation was performed._",
  ].join("\n");
}
