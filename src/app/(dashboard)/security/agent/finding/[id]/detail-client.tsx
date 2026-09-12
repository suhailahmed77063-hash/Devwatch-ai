"use client";

/**
 * Finding detail — /security/agent/finding/[id]
 *
 * Overview, severity/confidence, CWE/CVE, source evidence, root cause,
 * attack path (clickable steps), sandbox validation with an explicit
 * authorization dialog, AI analysis, recommended fix, generated patch,
 * verification results, audit history.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ArrowLeft,
  ShieldAlert,
  ChevronRight,
  Wrench,
  RefreshCcw,
  Lock,
  FileCode2,
  ExternalLink,
} from "lucide-react";

interface Evidence {
  file: string;
  line?: number;
  excerpt: string;
}

interface AttackStep {
  label: string;
  detail: string;
  file?: string;
  line?: number;
}

interface Finding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  category: string | null;
  description: string;
  file: string | null;
  line: number | null;
  lineEnd: number | null;
  snippet: string | null;
  recommendation: string | null;
  rootCause: string | null;
  impact: string | null;
  evidence: Evidence[] | null;
  attackPath: AttackStep[] | null;
  verdict: string | null;
  verdictReason: string | null;
  aiAnalysis: string | null;
  agentStatus: string | null;
  confidence: number | null;
  cweId: string | null;
  cveId: string | null;
  components: Array<{ name: string; version?: string; fixedVersion?: string; summary?: string }> | null;
  createdAt: string;
  fixedAt: string | null;
}

interface Validation {
  id: string;
  status: string;
  environment: string;
  authorized: boolean;
  pocScript: string | null;
  output: string | null;
  exploitReproduced: boolean;
  durationMs: number | null;
  error: string | null;
  startedAt: string;
}

interface Patch {
  id: string;
  status: string;
  summary: string | null;
  rootCause: string | null;
  strategy: string | null;
  diff: string;
  verificationPlan: string | null;
  createdAt: string;
}

interface Verification {
  id: string;
  status: string;
  summary: string | null;
  rescan: { fileCount?: number; remainingCount?: number; remaining?: Array<{ title: string; severity: string }> } | null;
  error: string | null;
  startedAt: string;
}

interface Action {
  id: string;
  tool: string;
  action: string;
  status: string;
  environment: string | null;
  authorized: boolean;
  error: string | null;
  createdAt: string;
}

interface DetailData {
  finding: Finding;
  validations: Validation[];
  patches: Patch[];
  verifications: Verification[];
  actions: Action[];
}

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
    case "validation_required": return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">Validation Required</Badge>;
    case "validating": return <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">Validating</Badge>;
    case "confirmed": return <Badge variant="destructive">Confirmed</Badge>;
    case "remediation_ready": return <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-500">Remediation Ready</Badge>;
    case "fixed": return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Fixed</Badge>;
    case "verified": return <Badge variant="secondary" className="bg-green-500/10 text-green-500">✅ Verified</Badge>;
    case "false_positive": return <Badge variant="outline">False Positive</Badge>;
    default: return <Badge variant="outline">Queued</Badge>;
  }
}

function CodeBlock({ text, className = "" }: { text: string; className?: string }) {
  return (
    <pre className={`overflow-x-auto rounded-md bg-muted/60 p-3 font-mono text-xs leading-relaxed ${className}`}>
      {text}
    </pre>
  );
}

/** Minimal unified-diff renderer (no external dependency). */
function DiffView({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  return (
    <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
      {lines.map((line, i) => {
        const cls = line.startsWith("+") && !line.startsWith("+++")
          ? "bg-green-500/10 text-green-600 dark:text-green-400"
          : line.startsWith("-") && !line.startsWith("---")
            ? "bg-red-500/10 text-red-600 dark:text-red-400"
            : line.startsWith("@@")
              ? "text-purple-500"
              : "";
        return (
          <div key={i} className={`px-1 ${cls}`}>{line || " "}</div>
        );
      })}
    </pre>
  );
}

export default function DetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Sandbox authorization dialog
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authConfirm, setAuthConfirm] = useState("");

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/security/agent/findings/${id}`, { cache: "no-store" });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(body.error ?? "Failed to load finding");
        setData(body);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load finding");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  const runAction = async (kind: "validate" | "remediate" | "verify" | "issue", authorized = false) => {
    if (!id) return;
    setBusy(kind);
    setNotice(null);
    try {
      let res: Response;
      if (kind === "validate") {
        res = await fetch("/api/security/agent/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ findingId: id, authorized }),
        });
      } else if (kind === "remediate") {
        res = await fetch("/api/security/agent/remediate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ findingId: id }),
        });
      } else if (kind === "verify") {
        res = await fetch("/api/security/agent/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ findingId: id }),
        });
      } else {
        res = await fetch("/api/security/agent/github-issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ findingId: id }),
        });
      }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Action failed");

      if (kind === "validate") {
        const r = body.validation?.exploitReproduced
          ? "🔴 Exploit REPRODUCED in the isolated sandbox — the vulnerability is real."
          : body.validation?.status === "not_exploitable"
            ? "🟢 Not reproduced — the finding did not reproduce in the sandbox."
            : `Validation finished: ${body.validation?.status ?? "inconclusive"}.`;
        setNotice({ kind: body.validation?.exploitReproduced ? "err" : "ok", text: r });
      } else if (kind === "remediate") {
        setNotice({ kind: "ok", text: "Patch generated — review it below. It is a proposal and is never merged automatically." });
      } else if (kind === "verify") {
        setNotice({
          kind: body.verification?.status === "fixed" ? "ok" : "err",
          text: body.verification?.summary ?? "Verification finished.",
        });
      } else {
        setNotice({ kind: "ok", text: `GitHub issue created: ${body.issueUrl}` });
      }
      refresh();
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof Error ? err.message : "Action failed" });
    } finally {
      setBusy(null);
      setShowAuthDialog(false);
      setAuthConfirm("");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/security/agent" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Security Agent
        </Link>
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent></Card>
      </div>
    );
  }

  const f = data.finding;
  const latestPatch = data.patches[0];
  const latestVerification = data.verifications[0];
  const latestValidation = data.validations[0];

  return (
    <div className="space-y-6">
      <Link href="/security/agent" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Security Agent
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {severityBadge(f.severity)}
          {statusBadge(f.agentStatus)}
          {f.verdict && <Badge variant="outline">AI verdict: {f.verdict.replace("_", " ")}</Badge>}
          {f.cweId && <code className="text-xs text-muted-foreground">{f.cweId}</code>}
          {f.cveId && <code className="text-xs text-muted-foreground">{f.cveId}</code>}
        </div>
        <h1 className="font-heading text-xl font-bold">{f.description}</h1>
        {f.file && (
          <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <FileCode2 className="h-3.5 w-3.5" /> {f.file}{f.line ? `:${f.line}` : ""}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => runAction("remediate")}>
          {busy === "remediate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />} Generate Fix
        </Button>
        <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => setShowAuthDialog(true)}>
          {busy === "validate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />} Validate in Sandbox
        </Button>
        <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => runAction("verify")}>
          {busy === "verify" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Run Verification
        </Button>
        <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => runAction("issue")}>
          {busy === "issue" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />} Create GitHub Issue
        </Button>
      </div>

      {notice && (
        <div className={`rounded-md border p-3 text-sm ${notice.kind === "ok" ? "border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400" : "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"}`}>
          {notice.text}
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attack">Attack Path</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="fix">Fix & Patch</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="audit">Audit History</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Severity</p>{severityBadge(f.severity)}</CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">AI confidence</p><p className="text-2xl font-bold">{f.confidence ?? "—"}{typeof f.confidence === "number" ? "%" : ""}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Category</p><p className="font-medium">{f.category ?? "—"}</p></CardContent></Card>
          </div>

          {f.rootCause && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Root cause</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{f.rootCause}</CardContent>
            </Card>
          )}
          {f.impact && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Potential impact</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{f.impact}</CardContent>
            </Card>
          )}
          {f.components && f.components.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Affected components</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {f.components.map((c, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <code>{c.name}{c.version ? `@${c.version}` : ""}</code>
                    {c.fixedVersion && <Badge variant="secondary" className="text-xs">fixed in {c.fixedVersion}</Badge>}
                    {c.summary && <span className="text-xs text-muted-foreground">{c.summary}</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {f.evidence && f.evidence.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Source-code evidence</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {f.evidence.map((e, i) => (
                  <div key={i}>
                    <p className="mb-1 font-mono text-xs text-muted-foreground">{e.file}{e.line ? `:${e.line}` : ""}</p>
                    <CodeBlock text={e.excerpt} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {f.aiAnalysis && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">AI investigation</CardTitle></CardHeader>
              <CardContent>
                <CodeBlock text={f.aiAnalysis} className="max-h-80 overflow-y-auto whitespace-pre-wrap" />
                {f.verdictReason && <p className="mt-2 text-xs text-muted-foreground">{f.verdictReason}</p>}
              </CardContent>
            </Card>
          )}

          {f.recommendation && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Recommended remediation</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{f.recommendation}</CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Attack path */}
        <TabsContent value="attack">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Attack path</CardTitle></CardHeader>
            <CardContent>
              {f.attackPath && f.attackPath.length > 0 ? (
                <div className="space-y-0">
                  {f.attackPath.map((step, i) => (
                    <div key={i}>
                      {i > 0 && (
                        <div className="ml-3 flex h-6 items-center">
                          <ChevronRight className="h-4 w-4 rotate-90 text-muted-foreground" />
                        </div>
                      )}
                      <div className="rounded-md border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">{i + 1}</Badge>
                          <span className="text-sm font-medium">{step.label}</span>
                          {step.file && (
                            <code className="text-xs text-muted-foreground">
                              {step.file}{step.line ? `:${step.line}` : ""}
                            </code>
                          )}
                        </div>
                        {step.detail && <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No attack path recorded for this finding.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation */}
        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4" /> Validation Environment: Isolated Sandbox
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Validation runs a non-destructive proof-of-concept against a locally generated fixture inside an
                isolated, ephemeral sandbox. No external or production systems are contacted; the sandbox is
                destroyed after the run. <span className="font-medium">Authorization Required.</span>
              </p>
              {latestValidation ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={latestValidation.status === "exploitable" ? "destructive" : latestValidation.status === "not_exploitable" ? "secondary" : "outline"}
                      className={latestValidation.status === "not_exploitable" ? "bg-green-500/10 text-green-500" : ""}
                    >
                      {latestValidation.status}
                    </Badge>
                    {typeof latestValidation.durationMs === "number" && <span className="text-xs text-muted-foreground">{latestValidation.durationMs} ms</span>}
                    <span className="text-xs text-muted-foreground">{new Date(latestValidation.startedAt).toLocaleString()}</span>
                  </div>
                  {latestValidation.pocScript && <p className="text-xs text-muted-foreground">PoC: {latestValidation.pocScript}</p>}
                  {latestValidation.output && <CodeBlock text={latestValidation.output} className="max-h-72 overflow-y-auto" />}
                  {latestValidation.error && <p className="text-xs text-red-500">{latestValidation.error}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not validated yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fix & Patch */}
        <TabsContent value="fix" className="space-y-4">
          {latestPatch ? (
            <>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Fix plan</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {latestPatch.summary && <p><span className="font-medium text-foreground">Problem:</span> {latestPatch.summary}</p>}
                  {latestPatch.rootCause && <p><span className="font-medium text-foreground">Root cause:</span> {latestPatch.rootCause}</p>}
                  {latestPatch.strategy && <p><span className="font-medium text-foreground">Fix:</span> {latestPatch.strategy}</p>}
                  {latestPatch.verificationPlan && <p><span className="font-medium text-foreground">Verification:</span> {latestPatch.verificationPlan}</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Generated patch (proposal — never merged automatically)</CardTitle>
                </CardHeader>
                <CardContent>
                  <DiffView diff={latestPatch.diff} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Review Patch → developer applies it in their workflow → run tests → Run Verification → merge via your normal GitHub process.
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
              No patch generated yet. Use <span className="font-medium text-foreground">Generate Fix</span> above.
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Verification */}
        <TabsContent value="verification" className="space-y-4">
          {latestVerification ? (
            <Card>
              <CardContent className="space-y-3 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={latestVerification.status === "fixed" ? "secondary" : latestVerification.status === "still_vulnerable" ? "destructive" : "outline"}
                    className={latestVerification.status === "fixed" ? "bg-green-500/10 text-green-500" : ""}
                  >
                    {latestVerification.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{new Date(latestVerification.startedAt).toLocaleString()}</span>
                </div>
                <p className="text-sm">{latestVerification.summary}</p>
                {latestVerification.rescan && (
                  <p className="text-xs text-muted-foreground">
                    Re-scan covered {latestVerification.rescan.fileCount ?? 0} files;{" "}
                    {latestVerification.rescan.remainingCount ?? 0} other finding(s) remain open.
                  </p>
                )}
                {latestVerification.error && <p className="text-xs text-red-500">{latestVerification.error}</p>}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
              No verification run yet. Apply a fix first, then use <span className="font-medium text-foreground">Run Verification</span>.
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit">
          <Card>
            <CardContent className="pt-4">
              {data.actions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No audit entries.</p>
              ) : (
                <div className="space-y-2">
                  {data.actions.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center gap-2 border-b pb-2 text-sm last:border-0">
                      <Badge variant="outline" className="font-mono text-xs">{a.tool}</Badge>
                      <span>{a.action}</span>
                      <Badge variant={a.status === "OK" ? "secondary" : "destructive"} className={a.status === "OK" ? "bg-green-500/10 text-green-500" : ""}>
                        {a.status}
                      </Badge>
                      {a.authorized && <Badge variant="outline" className="text-xs">authorized</Badge>}
                      {a.environment && <Badge variant="secondary" className="text-xs">{a.environment}</Badge>}
                      {a.error && <span className="text-xs text-red-500">{a.error}</span>}
                      <span className="ml-auto text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Authorization dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Authorization Required
            </DialogTitle>
            <DialogDescription>
              Validation Environment: <span className="font-medium text-foreground">Isolated Sandbox</span>.
              The agent will run a non-destructive proof-of-concept against a locally generated fixture. No external
              or production systems are contacted, secrets never enter the sandbox, and the environment is destroyed
              afterwards. Evidence is minimized and redacted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">
              Type <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">AUTHORIZE</code> to confirm:
            </p>
            <Input value={authConfirm} onChange={(e) => setAuthConfirm(e.target.value)} placeholder="AUTHORIZE" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuthDialog(false)}>Cancel</Button>
            <Button
              disabled={authConfirm !== "AUTHORIZE" || busy !== null}
              onClick={() => runAction("validate", true)}
            >
              {busy === "validate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              Run validation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
