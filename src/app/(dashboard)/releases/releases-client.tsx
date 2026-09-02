"use client";

import { useState } from "react";
import {
  Rocket,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Activity,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Zap,
  Database,
  Server,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Release {
  id: string;
  version: string;
  title: string;
  description: string;
  status: string;
  readinessScore: number;
  scoreLabel: string;
  previousVersion: string;
  targetBranch: string;
  deployedAt: string;
  releaseSummary: string;
  aiAnalysis: Record<string, unknown> | null;
  deploymentChecklist: Array<{ name: string; passed: boolean; required: boolean; message: string }> | null;
  deploymentGate: { blocked: boolean; reasons: string[]; warnings: string[] } | null;
  _risks?: Array<{ id: string; category: string; severity: string; title: string; description: string }>;
  createdAt: string;
}

interface Deployment {
  id: string;
  releaseId: string;
  environment: string;
  provider: string;
  status: string;
  version: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  error: string;
}

interface Rollback {
  id: string;
  likelyCause: string;
  previousStableVersion: string;
  recommendedVersion: string;
  isImplemented: boolean;
}

interface Props {
  releases: Release[];
  latestRelease: Release | null;
  recentDeployments: Deployment[];
  recentRollbacks: Rollback[];
  repos: Array<{ id: string; name: string }>;
  orgId: string;
}

export default function ReleasesClient({
  releases,
  latestRelease: initialLatest,
  recentDeployments,
  recentRollbacks,
  repos,
  orgId,
}: Props) {
  const [latestRelease, setLatestRelease] = useState(initialLatest);
  const [showNewReleaseForm, setShowNewReleaseForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedRisks, setExpandedRisks] = useState<Record<string, boolean>>({});
  const [newVersion, setNewVersion] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");

  const scoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    if (score >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const scoreBg = (score: number) => {
    if (score >= 90) return "bg-green-500/10 border-green-500/20";
    if (score >= 70) return "bg-yellow-500/10 border-yellow-500/20";
    if (score >= 50) return "bg-orange-500/10 border-orange-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      ready: "bg-green-500/10 text-green-400 border-green-500/20",
      blocked: "bg-red-500/10 text-red-400 border-red-500/20",
      deploying: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      deployed: "bg-green-500/10 text-green-400 border-green-500/20",
      failed: "bg-red-500/10 text-red-400 border-red-500/20",
      rolled_back: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    };
    return colors[status] || colors.draft;
  };

  const severityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-500/10 text-red-400 border-red-500/20",
      high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      informational: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };
    return colors[severity] || colors.informational;
  };

  const createRelease = async () => {
    if (!newVersion) {
      toast.error("Version is required");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          repoId: selectedRepo || undefined,
          version: newVersion,
          title: newTitle || `Release ${newVersion}`,
        }),
      });

      if (!response.ok) throw new Error("Failed to create release");

      const data = await response.json();
      setLatestRelease(data.release);
      setShowNewReleaseForm(false);
      setNewVersion("");
      setNewTitle("");
      toast.success(`Release ${data.release.version} created! Score: ${data.analysis.score}/100`);
    } catch {
      toast.error("Failed to create release");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reAnalyze = async () => {
    if (!latestRelease) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/releases/${latestRelease.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "re-analyze" }),
      });

      if (!response.ok) throw new Error("Failed to re-analyze");

      const data = await response.json();
      setLatestRelease(data.release);
      toast.success("Release re-analyzed!");
    } catch {
      toast.error("Failed to re-analyze release");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startDeployment = async (environment: string) => {
    if (!latestRelease) return;

    try {
      const response = await fetch("/api/releases/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseId: latestRelease.id,
          environment,
          provider: "vercel",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to start deployment");
        return;
      }

      toast.success(`Deployment to ${environment} started!`);
    } catch {
      toast.error("Failed to start deployment");
    }
  };

  const score = latestRelease?.readinessScore || 0;
  const gate = latestRelease?.deploymentGate as { blocked: boolean; reasons: string[]; warnings: string[] } | null;
  const checklist = latestRelease?.deploymentChecklist as Array<{ name: string; passed: boolean; required: boolean; message: string }> | null;
  const risks = latestRelease?._risks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6" />
            Release Readiness
          </h1>
          <p className="text-muted-foreground">Analyze and manage release deployments</p>
        </div>
        <div className="flex gap-2">
          {latestRelease && (
            <Button variant="outline" onClick={reAnalyze} disabled={isAnalyzing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? "animate-spin" : ""}`} />
              Re-analyze
            </Button>
          )}
          <Button onClick={() => setShowNewReleaseForm(!showNewReleaseForm)}>
            <Plus className="h-4 w-4 mr-2" />
            New Release
          </Button>
        </div>
      </div>

      {/* New Release Form */}
      {showNewReleaseForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Release</CardTitle>
            <CardDescription>Enter release details and run readiness analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Version *</label>
                <input
                  type="text"
                  placeholder="v2.4.0"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <input
                  type="text"
                  placeholder="Release title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Repository</label>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">All repositories</option>
                  {repos.map((repo) => (
                    <option key={repo.id} value={repo.id}>{repo.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={createRelease} disabled={isAnalyzing || !newVersion}>
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Create & Analyze
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowNewReleaseForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No releases state */}
      {!latestRelease && releases.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Releases Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first release to get started with release readiness analysis.
            </p>
            <Button onClick={() => setShowNewReleaseForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Release
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard */}
      {latestRelease && (
        <>
          {/* Score + Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Readiness Score */}
            <Card className={`${scoreBg(score)} border`}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${scoreColor(score)}`}>{score}</div>
                  <div className="text-sm text-muted-foreground mt-1">/100</div>
                  <div className="text-sm font-medium mt-2">{latestRelease.scoreLabel || "No Score"}</div>
                  <Badge variant="outline" className={`mt-2 ${statusBadge(latestRelease.status)}`}>
                    {latestRelease.status.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Version Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Version</span>
                    <span className="font-mono font-semibold">{latestRelease.version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Previous</span>
                    <span className="font-mono text-sm">{latestRelease.previousVersion || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Branch</span>
                    <span className="font-mono text-sm">{latestRelease.targetBranch}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm">{new Date(latestRelease.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deployment Gate */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">Deployment Gate</span>
                  </div>
                  {gate?.blocked ? (
                    <div className="flex items-center gap-2 text-red-500">
                      <XCircle className="h-5 w-5" />
                      <span className="text-sm font-semibold">BLOCKED</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-semibold">PASSED</span>
                    </div>
                  )}
                  {gate?.reasons && gate.reasons.length > 0 && (
                    <div className="text-xs text-red-400 space-y-1">
                      {gate.reasons.map((r: string, i: number) => (
                        <div key={i}>• {r}</div>
                      ))}
                    </div>
                  )}
                  {gate?.warnings && gate.warnings.length > 0 && (
                    <div className="text-xs text-yellow-400 space-y-1">
                      {gate.warnings.map((w: string, i: number) => (
                        <div key={i}>⚠ {w}</div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm font-medium">Quick Stats</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <GitCommit className="h-3 w-3 text-blue-400" />
                      <span className="text-muted-foreground">Commits</span>
                    </div>
                    <div className="text-right font-mono">
                      {latestRelease.aiAnalysis ? (latestRelease.aiAnalysis as Record<string, unknown>).signals ? ((latestRelease.aiAnalysis as Record<string, unknown>).signals as Record<string, number>).totalCommits || 0 : 0 : 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <GitPullRequest className="h-3 w-3 text-purple-400" />
                      <span className="text-muted-foreground">PRs</span>
                    </div>
                    <div className="text-right font-mono">
                      {latestRelease.aiAnalysis ? (latestRelease.aiAnalysis as Record<string, unknown>).signals ? ((latestRelease.aiAnalysis as Record<string, unknown>).signals as Record<string, number>).totalPRs || 0 : 0 : 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-red-400" />
                      <span className="text-muted-foreground">Risks</span>
                    </div>
                    <div className="text-right font-mono">{risks.length}</div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-green-400" />
                      <span className="text-muted-foreground">Deployed</span>
                    </div>
                    <div className="text-right font-mono">
                      {latestRelease.deployedAt ? new Date(latestRelease.deployedAt).toLocaleDateString() : "Not yet"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deployment Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Deployment Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  onClick={() => startDeployment("staging")}
                  disabled={latestRelease.status === "blocked" || isAnalyzing}
                  variant="outline"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Deploy to Staging
                </Button>
                <Button
                  onClick={() => startDeployment("production")}
                  disabled={latestRelease.status === "blocked" || isAnalyzing}
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Deploy to Production
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Release Summary */}
          {latestRelease.releaseSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Release Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                    {latestRelease.releaseSummary}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checklist + Risks Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deployment Checklist */}
            {checklist && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Deployment Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {checklist.map((check, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                        {check.passed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${check.passed ? "text-green-400" : "text-red-400"}`}>
                              {check.name}
                            </span>
                            {check.required && (
                              <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/20">
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{check.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Release Risks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Release Risks ({risks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {risks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No risks identified</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {risks.map((risk) => (
                      <div key={risk.id} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${severityBadge(risk.severity)}`}>
                              {risk.severity}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {risk.category}
                            </Badge>
                          </div>
                          <button
                            onClick={() => setExpandedRisks((prev) => ({ ...prev, [risk.id]: !prev[risk.id] }))}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {expandedRisks[risk.id] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm font-medium mt-2">{risk.title}</p>
                        {expandedRisks[risk.id] && (
                          <p className="text-xs text-muted-foreground mt-1">{risk.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rollback Recommendations */}
          {recentRollbacks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Rollback Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentRollbacks.map((rb) => (
                    <div key={rb.id} className="p-4 rounded-lg border border-orange-500/20 bg-orange-500/5">
                      <div className="flex items-start gap-3">
                        <RotateCcw className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-orange-400">AI Assessment — Not Guaranteed Root Cause</p>
                          <p className="text-sm mt-1">{rb.likelyCause}</p>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Rollback to: <span className="font-mono">{rb.recommendedVersion}</span></span>
                            <span>Previous stable: <span className="font-mono">{rb.previousStableVersion}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Release History */}
      {releases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Release History
            </CardTitle>
            <CardDescription>All releases for this organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Version</th>
                    <th className="pb-2 font-medium text-muted-foreground">Score</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 font-medium text-muted-foreground">Branch</th>
                    <th className="pb-2 font-medium text-muted-foreground">Created</th>
                    <th className="pb-2 font-medium text-muted-foreground">Deployed</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 font-mono font-semibold">{r.version}</td>
                      <td className="py-3">
                        <span className={`font-mono font-bold ${scoreColor(r.readinessScore)}`}>
                          {r.readinessScore}
                        </span>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className={`text-xs ${statusBadge(r.status)}`}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 font-mono text-xs">{r.targetBranch}</td>
                      <td className="py-3 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 text-xs">
                        {r.deployedAt ? new Date(r.deployedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Deployments */}
      {recentDeployments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Recent Deployments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Version</th>
                    <th className="pb-2 font-medium text-muted-foreground">Environment</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 font-medium text-muted-foreground">Provider</th>
                    <th className="pb-2 font-medium text-muted-foreground">Duration</th>
                    <th className="pb-2 font-medium text-muted-foreground">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeployments.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 font-mono font-semibold">{d.version}</td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-xs">{d.environment}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className={`text-xs ${statusBadge(d.status)}`}>
                          {d.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs">{d.provider || "—"}</td>
                      <td className="py-3 text-xs font-mono">
                        {d.duration ? `${d.duration}s` : "—"}
                      </td>
                      <td className="py-3 text-xs">
                        {d.startedAt ? new Date(d.startedAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
