"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, ScanSearch, Brain, FlaskConical, Wrench, ChevronRight,
  AlertTriangle, Bug, FileCode2, CircleCheck, Loader2, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner, StatusPill, EmptyState } from "@/components/ui/misc";
import { apiFetch, streamPost } from "@/lib/client/api";

// ── Types ───────────────────────────────────────────────────────────────────

interface ProjectLite { id: string; name: string }

interface Finding {
  id: string; ruleId: string; title: string; category: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number; cwe?: string | null; cve?: string | null;
  filePath?: string | null; lineStart?: number | null;
  verdict?: string | null; status: string;
}

interface Overview {
  total: number;
  bySeverity: { critical: number; high: number; medium: number; low: number };
  byStatus: Record<string, number>;
  byVerdict: Record<string, number>;
  confirmedExploitable: number;
  fixed: number;
  falsePositives: number;
  pendingVerification: number;
}

interface RunRow {
  id: string; kind: string; status: string; repoSource: string; repoUrl: string | null;
  fileCount: number; findingCount: number; summary: string | null;
  startedAt: string; createdBy?: string | null;
}

interface ActionRow {
  id: string; tool: string; action: string; status: string;
  environment?: string | null; authorized: boolean; createdAt: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const SEVERITY_TONE: Record<string, "red" | "amber" | "zinc" | "rose"> = {
  critical: "red", high: "red", medium: "amber", low: "zinc",
};

const STATUS_FLOW = ["QUEUED", "INVESTIGATING", "VALIDATION_REQUIRED", "VALIDATING", "CONFIRMED", "REMEDIATION_READY", "FIXED", "VERIFIED"];

// ── Component ───────────────────────────────────────────────────────────────

export function SecurityAgentClient() {
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [repoLink, setRepoLink] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [streamLines, setStreamLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ projects: ProjectLite[] }>("/api/projects");
        setProjects(data.projects ?? []);
        if (data.projects?.length) setProjectId((p) => p || data.projects[0].id);
      } catch {
        setError("Could not load projects.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refresh = useCallback(async (pid: string) => {
    if (!pid) return;
    try {
      const [dash, finds, runsData] = await Promise.all([
        apiFetch<{ overview: Overview; recentActions: ActionRow[]; recentRuns: RunRow[] }>(
          `/api/security/agent/dashboard?projectId=${pid}`
        ),
        apiFetch<{ findings: Finding[] }>(`/api/security/agent/findings?projectId=${pid}`),
        apiFetch<{ runs: RunRow[] }>(`/api/security/agent/runs?projectId=${pid}`),
      ]);
      setOverview(dash.overview);
      setActions(dash.recentActions);
      setRuns(runsData.runs);
      setFindings(finds.findings);
      setError(null);
    } catch {
      setError("Could not load security data for this project.");
    }
  }, []);

  useEffect(() => {
    if (projectId) void refresh(projectId);
  }, [projectId, refresh]);

  const startScan = useCallback(async () => {
    if (!projectId) return;
    setScanning(true);
    setStreamLines([]);
    setError(null);
    await streamPost(
      "/api/security/agent/investigate",
      { projectId, repoLink: repoLink || undefined },
      {
        onEvent: (_e, data) => {
          const d = data as { type: string; label?: string; text?: string; message?: string };
          if (d.type === "stage" && d.label) setStreamLines((l) => [...l.slice(-40), String(d.label)]);
          if (d.type === "reply" && d.text) setStreamLines((l) => [...l.slice(-40), String(d.text)]);
          if (d.type === "error" && d.message) setError(String(d.message));
          if (d.type === "done") void refresh(projectId);
        },
        onDone: () => {
          setScanning(false);
          void refresh(projectId);
        },
        onError: (err) => {
          setError(err.message);
          setScanning(false);
        },
      }
    );
  }, [projectId, repoLink, refresh]);

  const grouped = useMemo(() => {
    const open = findings.filter((f) => !["FALSE_POSITIVE", "VERIFIED", "FIXED"].includes(f.status));
    return { open, resolved: findings.filter((f) => ["FALSE_POSITIVE", "VERIFIED", "FIXED"].includes(f.status)) };
  }, [findings]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-16 flex items-center gap-3 text-zinc-400">
        <Spinner /> Loading security agent...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl btn-acc flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </span>
            AI Security Agent
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Detect → Investigate → Safely Validate → Explain → Remediate → Verify
          </p>
        </div>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="glass rounded-xl px-3 py-2 text-sm text-zinc-200 bg-panel"
        >
          {projects.length === 0 && <option value="">No projects yet</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="glass rounded-xl border-red-500/30 text-red-300 text-sm px-4 py-3 mb-5">{error}</div>
      )}

      {projects.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="w-6 h-6 text-acc-soft" />} title="No projects"
          desc="Create a project first — the Security Agent scans project workspaces and linked repositories.">
          <Link href="/projects"><Button>Create a project</Button></Link>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {/* Scan launcher */}
          <div className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Repository link (optional)</label>
                <Input
                  placeholder="https://github.com/owner/repo — leave empty to scan the project workspace / linked repo"
                  value={repoLink}
                  onChange={(e) => setRepoLink(e.target.value)}
                />
              </div>
              <Button onClick={startScan} disabled={scanning || !projectId}>
                {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</> : <><ScanSearch className="w-4 h-4" /> Scan & Investigate</>}
              </Button>
            </div>
            {streamLines.length > 0 && (
              <div className="mt-3 rounded-xl bg-black/40 border border-white/5 p-3 font-mono text-[11px] text-zinc-400 max-h-40 overflow-y-auto">
                {streamLines.map((l, i) => <div key={i}>› {l}</div>)}
              </div>
            )}
          </div>

          {/* Overview stats */}
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
              <StatCard label="Total" value={overview.total} tone="rose" />
              <StatCard label="Critical" value={overview.bySeverity.critical} tone="red" />
              <StatCard label="High" value={overview.bySeverity.high} tone="red" />
              <StatCard label="Medium" value={overview.bySeverity.medium} tone="amber" />
              <StatCard label="Confirmed exploitable" value={overview.confirmedExploitable} tone="red" />
              <StatCard label="Fixed / Verified" value={overview.fixed} tone="green" />
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Findings */}
            <div className="lg:col-span-2 space-y-4">
              <SectionCard title={`Open findings (${grouped.open.length})`}>
                {grouped.open.length === 0 ? (
                  <p className="text-sm text-zinc-500 py-8 text-center">No open findings. Run a scan to analyze a repository.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {grouped.open.map((f) => (
                      <li key={f.id}>
                        <Link href={`/security/agent/finding/${f.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition group">
                          <StatusPill tone={SEVERITY_TONE[f.severity] ?? "zinc"}>{f.severity}</StatusPill>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-zinc-100 font-medium truncate">{f.title}</p>
                            <p className="text-[11px] text-zinc-500 font-mono truncate">
                              {f.filePath ? `${f.filePath}${f.lineStart ? `:${f.lineStart}` : ""}` : f.ruleId}
                              {f.cwe ? ` · ${f.cwe}` : ""}{f.cve ? ` · ${f.cve}` : ""}
                            </p>
                          </div>
                          <StatusPill tone="zinc">{f.status.replace(/_/g, " ").toLowerCase()}</StatusPill>
                          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-acc-soft transition" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              {grouped.resolved.length > 0 && (
                <SectionCard title={`Resolved (${grouped.resolved.length})`}>
                  <ul className="divide-y divide-white/5">
                    {grouped.resolved.slice(0, 10).map((f) => (
                      <li key={f.id}>
                        <Link href={`/security/agent/finding/${f.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition">
                          <CircleCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-zinc-400 truncate flex-1">{f.title}</span>
                          <StatusPill tone="green">{f.status.toLowerCase()}</StatusPill>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}
            </div>

            {/* Activity + runs */}
            <div className="space-y-4">
              <SectionCard title="Agent activity">
                {actions.length === 0 ? (
                  <p className="text-sm text-zinc-500 py-6 text-center">No agent operations yet.</p>
                ) : (
                  <ul className="space-y-2.5 px-4 py-3">
                    {actions.slice(0, 10).map((a) => (
                      <li key={a.id} className="flex items-start gap-2.5 text-xs">
                        <AgentToolIcon tool={a.tool} />
                        <div className="min-w-0 flex-1">
                          <p className="text-zinc-300 truncate">{a.action}</p>
                          <p className="text-zinc-600 text-[10px] font-mono">
                            {a.tool}{a.environment ? ` · ${a.environment}` : ""} · {new Date(a.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        {a.status !== "OK" && <StatusPill tone="red">{a.status}</StatusPill>}
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard title="Recent runs">
                {runs.length === 0 ? (
                  <p className="text-sm text-zinc-500 py-6 text-center">No runs yet.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {runs.slice(0, 6).map((r) => (
                      <li key={r.id} className="px-4 py-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-zinc-300 font-medium">{r.kind}</span>
                          <StatusPill tone={r.status === "COMPLETED" ? "green" : r.status === "FAILED" ? "red" : "amber"}>{r.status.toLowerCase()}</StatusPill>
                        </div>
                        <p className="text-zinc-600 mt-0.5">
                          {r.findingCount} finding(s) · {r.fileCount} files{r.repoUrl ? ` · ${r.repoUrl}` : ""} · {new Date(r.startedAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard title="Status pipeline">
                <ul className="px-4 py-3 space-y-1.5 text-[11px]">
                  {STATUS_FLOW.map((s, i) => (
                    <li key={s} className="flex items-center gap-2 text-zinc-400">
                      <span className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center font-bold text-[9px]">{i + 1}</span>
                      {s.replace(/_/g, " ")}
                      {byStatusCount(overview, s) > 0 && (
                        <span className="ml-auto text-acc-soft font-semibold">{byStatusCount(overview, s)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function byStatusCount(overview: Overview | null, status: string): number {
  return overview?.byStatus[status] ?? 0;
}

// ── Small presentational helpers ────────────────────────────────────────────

function StatCard({ label, value, tone }: { label: string; value: number; tone: "red" | "amber" | "green" | "rose" }) {
  const tones: Record<string, string> = {
    red: "text-red-400", amber: "text-amber-400", green: "text-emerald-400", rose: "text-acc-soft",
  };
  return (
    <div className="glass rounded-xl px-4 py-3">
      <p className={`font-display font-bold text-2xl ${tones[tone]}`}>{value}</p>
      <p className="text-[11px] text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <h2 className="font-display font-semibold text-sm text-zinc-300 px-4 py-3 border-b border-white/5">{title}</h2>
      {children}
    </div>
  );
}

export function AgentToolIcon({ tool }: { tool: string }) {
  const map: Record<string, React.ReactNode> = {
    READ_REPOSITORY: <FileCode2 className="w-3.5 h-3.5 text-zinc-400" />,
    RUN_STATIC_SCAN: <ScanSearch className="w-3.5 h-3.5 text-zinc-400" />,
    READ_DEPENDENCIES: <Bug className="w-3.5 h-3.5 text-zinc-400" />,
    ANALYZE_CODE: <Brain className="w-3.5 h-3.5 text-zinc-400" />,
    RUN_SANDBOX_TEST: <FlaskConical className="w-3.5 h-3.5 text-acc-soft" />,
    GENERATE_PATCH: <Wrench className="w-3.5 h-3.5 text-zinc-400" />,
    CREATE_GITHUB_ISSUE: <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />,
    COMMENT_ON_PR: <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />,
  };
  return <span className="mt-0.5">{map[tool] ?? <AlertTriangle className="w-3.5 h-3.5 text-zinc-500" />}</span>;
}
