"use client";

/**
 * AI Security Agent dashboard — /security/agent
 *
 * Security overview, repo-link scan launcher with live SSE stream,
 * findings table, agent activity feed. Uses the existing DevWatch design
 * system (Card/Badge/Button/Input/Tabs).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Play, Loader2, Activity, FileSearch, Bug, Key, ScanSearch, Globe, Download } from "lucide-react";

interface WebAuditRow {
  id: string;
  url: string;
  status: string;
  score: number | null;
  summary: string | null;
  createdAt: string;
}

interface Finding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  category: string | null;
  description: string;
  file: string | null;
  line: number | null;
  verdict: string | null;
  agentStatus: string | null;
  confidence: number | null;
  cweId: string | null;
  cveId: string | null;
  createdAt: string;
}

interface AgentRun {
  id: string;
  repoLink: string | null;
  status: string;
  fileCount: number | null;
  findingCount: number | null;
  summary: string | null;
  error: string | null;
  startedAt: string;
}

interface AgentActivity {
  id: string;
  tool: string;
  action: string;
  status: string;
  findingId: string | null;
  environment: string | null;
  createdAt: string;
}

interface DashboardData {
  overview: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    confirmedExploitable: number;
    potential: number;
    fixed: number;
    pendingVerification: number;
  };
  findings: Finding[];
  runs: AgentRun[];
  activity: AgentActivity[];
}

const STATUS_FLOW = ["queued", "investigating", "validation_required", "validating", "confirmed", "remediation_ready", "fixed", "verified"];

function severityBadge(severity: string) {
  switch (severity) {
    case "critical": return <Badge variant="destructive">🔴 Critical</Badge>;
    case "high": return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">🟠 High</Badge>;
    case "medium": return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">🟡 Medium</Badge>;
    case "low": return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">🔵 Low</Badge>;
    default: return <Badge variant="outline">ℹ️ Info</Badge>;
  }
}

function statusBadge(status: string | null) {
  switch (status) {
    case "queued": return <Badge variant="outline">Queued</Badge>;
    case "investigating": return <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">Investigating</Badge>;
    case "validation_required": return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">Validation Required</Badge>;
    case "validating": return <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">Validating</Badge>;
    case "confirmed": return <Badge variant="destructive">Confirmed</Badge>;
    case "remediation_ready": return <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-500">Remediation Ready</Badge>;
    case "fixed": return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Fixed</Badge>;
    case "verified": return <Badge variant="secondary" className="bg-green-500/10 text-green-500">✅ Verified</Badge>;
    case "false_positive": return <Badge variant="outline">False Positive</Badge>;
    default: return null;
  }
}

interface WebAuditResponse {
  audit: { id: string; url: string; finalUrl: string; status: string; score: number; summary: string };
  findings: Array<{
    category: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    checkId: string;
    title: string;
    detail?: string;
    evidence?: string;
    recommendation?: string;
  }>;
  validations: Array<{
    findingCheckId: string;
    probe: string;
    request: string;
    status: "exploited" | "mitigated" | "inconclusive";
    evidence?: string;
  }>;
  fixPlan: Array<{
    findingTitle: string;
    severity: string;
    validated: boolean;
    problem: string;
    fix: string;
    verification: string;
  }>;
  timings: { totalMs: number; ttfbMs: number | null };
  pageMeta: { title?: string; description?: string; h1Count: number; imgWithoutAlt: number };
  checkedPaths: Array<{ path: string; status: number | null }>;
}

function verdictBadge(verdict: string | null) {
  switch (verdict) {
    case "confirmed": return <Badge variant="destructive">Confirmed exploitable</Badge>;
    case "likely": return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">Likely</Badge>;
    case "potential": return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">Potential</Badge>;
    case "false_positive": return <Badge variant="outline">False positive</Badge>;
    default: return <Badge variant="outline">Unassessed</Badge>;
  }
}

function categoryIcon(category: string | null) {
  switch (category) {
    case "dependency": return <Bug className="h-4 w-4 text-orange-500" />;
    case "secret": return <Key className="h-4 w-4 text-red-500" />;
    case "config": return <ScanSearch className="h-4 w-4 text-yellow-500" />;
    default: return <FileSearch className="h-4 w-4 text-primary" />;
  }
}

export default function AgentClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [repoLink, setRepoLink] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamLog, setStreamLog] = useState<string[]>([]);
  const streamBuf = useRef("");
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Website testing state
  const [siteUrl, setSiteUrl] = useState("");
  const [webAuditing, setWebAuditing] = useState(false);
  const [webResult, setWebResult] = useState<WebAuditResponse | null>(null);
  const [webError, setWebError] = useState<string | null>(null);
  const [webHistory, setWebHistory] = useState<WebAuditRow[]>([]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/security/agent/dashboard", { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) setData(await res.json());
        else {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? "Failed to load dashboard");
        }
        fetch("/api/security/agent/web-audits")
          .then((r) => (r.ok ? r.json() : null))
          .then((b) => {
            if (!cancelled && b?.audits) setWebHistory(b.audits);
          })
          .catch(() => undefined);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const runWebAuditNow = async () => {
    if (!siteUrl.trim()) return;
    setWebAuditing(true);
    setWebError(null);
    setWebResult(null);
    try {
      const res = await fetch("/api/security/agent/web-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: siteUrl.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Audit failed");
      setWebResult(body);
      refresh();
      fetch("/api/security/agent/web-audits")
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => setWebHistory(b?.audits ?? []))
        .catch(() => undefined);
    } catch (err) {
      setWebError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setWebAuditing(false);
    }
  };

  const startScan = async () => {
    if (!repoLink.trim()) return;
    setStreaming(true);
    setError(null);
    setStreamLog(["Starting security agent…"]);
    try {
      const res = await fetch("/api/security/agent/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoLink: repoLink.trim() }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to start agent");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBuf.current += decoder.decode(value, { stream: true });
        const parts = streamBuf.current.split("\n\n");
        streamBuf.current = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "stage") setStreamLog((log) => [...log, `▸ ${event.label}`]);
            else if (event.type === "finding")
              setStreamLog((log) => [
                ...log,
                `  ${event.finding.severity === "critical" ? "🔴" : event.finding.severity === "high" ? "🟠" : "🟡"} ${event.finding.title}${event.finding.filePath ? ` — ${event.finding.filePath}` : ""}`,
              ]);
            else if (event.type === "reply") setStreamLog((log) => [...log, `✅ ${event.text}`]);
            else if (event.type === "error") setStreamLog((log) => [...log, `❌ ${event.message}`]);
          } catch {
            // ignore malformed chunk
          }
        }
      }
      refresh();
    } catch (err) {
      setStreamLog((log) => [...log, `❌ ${err instanceof Error ? err.message : "Scan failed"}`]);
    } finally {
      setStreaming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-bold">Security Agent</h1>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const o = data?.overview;
  const openFindings = (data?.findings ?? []).filter((f) => !["verified", "false_positive"].includes(f.agentStatus ?? ""));
  const resolvedFindings = (data?.findings ?? []).filter((f) => ["verified", "fixed", "false_positive"].includes(f.agentStatus ?? ""));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold">
            <Shield className="h-6 w-6 text-primary" /> Security Agent
          </h1>
          <p className="text-sm text-muted-foreground">
            Detect → Investigate → Safely Validate → Remediate → Verify — with complete auditability
          </p>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        {[
          { label: "Total", value: o?.total ?? 0, cls: "" },
          { label: "Critical", value: o?.critical ?? 0, cls: "text-red-500" },
          { label: "High", value: o?.high ?? 0, cls: "text-orange-500" },
          { label: "Medium", value: o?.medium ?? 0, cls: "text-yellow-500" },
          { label: "Low", value: o?.low ?? 0, cls: "text-blue-500" },
          { label: "Confirmed exploitable", value: o?.confirmedExploitable ?? 0, cls: "text-red-500" },
          { label: "Fixed", value: o?.fixed ?? 0, cls: "text-green-500" },
          { label: "Pending verification", value: o?.pendingVerification ?? 0, cls: "text-purple-500" },
        ].map((s) => (
          <Card key={s.label} size="sm">
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scan launcher */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scan a repository</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="https://github.com/owner/repo"
              value={repoLink}
              onChange={(e) => setRepoLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !streaming && startScan()}
              disabled={streaming}
            />
            <Button onClick={startScan} disabled={streaming || !repoLink.trim()} className="sm:w-40">
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {streaming ? "Scanning…" : "Run Security Agent"}
            </Button>
          </div>
          {streamLog.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
              {streamLog.map((line, i) => (
                <div key={i} className={line.startsWith("❌") ? "text-red-500" : line.startsWith("✅") ? "text-green-500" : ""}>
                  {line}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            The agent fetches a capped set of repository files via the GitHub API, runs deterministic scanners
            (SAST · secrets · dependencies · configuration), then investigates every finding with AI. Sandbox
            validation is separate and always requires explicit authorization.
          </p>
        </CardContent>
      </Card>

      {/* Website testing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" /> Website Testing — test any site link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="https://example.com — enter any website URL to test"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !webAuditing && runWebAuditNow()}
              disabled={webAuditing}
            />
            <Button onClick={runWebAuditNow} disabled={webAuditing || !siteUrl.trim()} className="sm:w-44">
              {webAuditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              {webAuditing ? "Testing…" : "Test Website"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Read-only end-to-end checks: availability, HTTPS, security headers, cookies, mixed content, exposed
            sensitive paths, SEO, accessibility and performance — then a final download-ready report. No
            exploitation, no destructive actions.
          </p>

          {webError && (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">{webError}</div>
          )}

          {webResult && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 text-lg font-bold
                  ${webResult.audit.score >= 90 ? 'text-green-500 border-green-500' : webResult.audit.score >= 75 ? 'text-yellow-500 border-yellow-500' : 'text-red-500 border-red-500'}">
                  {webResult.audit.score}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{webResult.audit.summary}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{webResult.audit.finalUrl}</p>
                </div>
                <a
                  href={`/api/security/agent/web-audit/${webResult.audit.id}/report`}
                  className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted"
                >
                  <Download className="h-4 w-4" /> Download Report
                </a>
              </div>
              <div className="space-y-1.5">
                {webResult.findings.filter((f) => f.severity !== "info").map((f, i) => {
                  const exploited = webResult?.validations.some(
                    (v) => v.status === "exploited" &&
                      (v.findingCheckId === f.checkId ||
                        (f.checkId === "xss.reflection" && v.findingCheckId === "exploit.xss-reflection") ||
                        (f.checkId === "sqli.error-leak" && v.findingCheckId === "exploit.sqli-errors") ||
                        (f.checkId === "redirect.open" && v.findingCheckId === "exploit.open-redirect") ||
                        (f.checkId === "cors.permissive" && v.findingCheckId === "exploit.cors") ||
                        (f.checkId === "exposure.dir-listing" && v.findingCheckId === "exploit.dir-listing") ||
                        (f.checkId === "methods.dangerous" && v.findingCheckId === "exploit.http-methods"))
                  );
                  return (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                      {severityBadge(f.severity === "info" ? "low" : f.severity)}
                      <Badge variant="outline" className="text-xs">{f.category}</Badge>
                      <span>{f.title}</span>
                      {exploited && <Badge variant="destructive" className="text-xs">🔴 exploit validated</Badge>}
                      {f.recommendation && <span className="text-xs text-muted-foreground">→ {f.recommendation}</span>}
                    </div>
                  );
                })}
              </div>

              {/* Exploit validation results */}
              {webResult.validations.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Exploit validation (safe, non-destructive probes)</p>
                  {webResult.validations.map((v, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-xs">
                      <Badge
                        variant={v.status === "exploited" ? "destructive" : v.status === "mitigated" ? "secondary" : "outline"}
                        className={v.status === "mitigated" ? "bg-green-500/10 text-green-500" : "text-xs"}
                      >
                        {v.status === "exploited" ? "🔴 EXPLOITED" : v.status === "mitigated" ? "🟢 mitigated" : "⚪ inconclusive"}
                      </Badge>
                      <span className="font-mono">{v.probe}</span>
                      {v.evidence && <span className="text-muted-foreground">— {v.evidence.slice(0, 140)}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Fix plan */}
              {webResult.fixPlan.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Fix plan (problem → fix → verification)</p>
                  {webResult.fixPlan.map((p, i) => (
                    <div key={i} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        {severityBadge(p.severity === "info" ? "low" : p.severity)}
                        <span className="font-medium">{p.findingTitle}</span>
                        {p.validated && <Badge variant="destructive" className="text-xs">exploit validated</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Problem:</span> {p.problem}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground"><span className="font-medium text-foreground">Fix:</span> {p.fix}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground"><span className="font-medium text-foreground">Verification:</span> {p.verification}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {webHistory.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Recent audits</p>
              {webHistory.slice(0, 5).map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={a.status === "completed" ? "secondary" : "destructive"} className="text-xs">{a.status}</Badge>
                  <span className="font-mono">{a.url}</span>
                  {a.score !== null && <span>score {a.score}/100</span>}
                  <a href={`/api/security/agent/web-audit/${a.id}/report`} className="text-primary hover:underline">report</a>
                  <span className="ml-auto">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Findings + activity */}
      <Tabs defaultValue="findings">
        <TabsList>
          <TabsTrigger value="findings">Findings ({openFindings.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolvedFindings.length})</TabsTrigger>
          <TabsTrigger value="activity">Agent Activity</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
        </TabsList>

        <TabsContent value="findings" className="space-y-3">
          {openFindings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No open findings. Run the agent on a repository to start.</p>
              </CardContent>
            </Card>
          ) : (
            openFindings.map((f) => (
              <Link key={f.id} href={`/security/agent/finding/${f.id}`} className="block">
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-start gap-3 pt-4">
                    <div className="mt-0.5">{categoryIcon(f.category)}</div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {severityBadge(f.severity)}
                        {statusBadge(f.agentStatus)}
                        {verdictBadge(f.verdict)}
                        {f.cweId && <code className="text-xs text-muted-foreground">{f.cweId}</code>}
                        {f.cveId && <code className="text-xs text-muted-foreground">{f.cveId}</code>}
                        {typeof f.confidence === "number" && <span className="text-xs text-muted-foreground">confidence {f.confidence}%</span>}
                      </div>
                      <p className="text-sm font-medium">{f.description}</p>
                      {f.file && (
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {f.file}{f.line ? `:${f.line}` : ""}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-3">
          {resolvedFindings.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nothing resolved yet.</CardContent></Card>
          ) : (
            resolvedFindings.map((f) => (
              <Link key={f.id} href={`/security/agent/finding/${f.id}`} className="block">
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center gap-3 pt-4">
                    {categoryIcon(f.category)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.description}</p>
                      {f.file && <p className="truncate font-mono text-xs text-muted-foreground">{f.file}</p>}
                    </div>
                    {statusBadge(f.agentStatus)}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-4">
              {(data?.activity ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  <Activity className="mx-auto mb-2 h-6 w-6" />
                  No agent activity yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {(data?.activity ?? []).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 border-b pb-2 text-sm last:border-0">
                      <Badge variant="outline" className="font-mono text-xs">{a.tool}</Badge>
                      <span>{a.action}</span>
                      {a.environment && <Badge variant="secondary" className="text-xs">Isolated Sandbox</Badge>}
                      {a.findingId && (
                        <Link href={`/security/agent/finding/${a.findingId}`} className="text-xs text-primary hover:underline">
                          view finding
                        </Link>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs" className="space-y-3">
          {(data?.runs ?? []).length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No agent runs yet.</CardContent></Card>
          ) : (
            (data?.runs ?? []).map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center gap-3 pt-4">
                  <Badge
                    variant={r.status === "completed" ? "secondary" : r.status === "failed" ? "destructive" : "outline"}
                    className={r.status === "completed" ? "bg-green-500/10 text-green-500" : ""}
                  >
                    {r.status}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.repoLink ?? "repository scan"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.summary ?? r.error ?? "—"} · {r.fileCount ?? 0} files · {r.findingCount ?? 0} findings
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(r.startedAt).toLocaleString()}</span>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Status pipeline legend */}
      <Card>
        <CardContent className="pt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Finding lifecycle</p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {STATUS_FLOW.map((s, i) => (
              <span key={s} className="flex items-center gap-1.5">
                {i > 0 && <span>→</span>}
                <code className="rounded bg-muted px-1.5 py-0.5">{s}</code>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
