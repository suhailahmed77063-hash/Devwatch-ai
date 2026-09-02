"use client";

import { useState } from "react";
import {
  History,
  GitBranch,
  Clock,
  RotateCcw,
  ArrowRight,
  GitCompare,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Release {
  id: string;
  version: string;
  title: string;
  status: string;
  readinessScore: number;
  scoreLabel: string;
  previousVersion: string;
  targetBranch: string;
  deployedAt: string;
  releaseSummary: string;
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
}

interface Props {
  releases: Release[];
  deployments: Deployment[];
}

export default function ReleaseHistoryClient({ releases, deployments }: Props) {
  const [compareMode, setCompareMode] = useState(false);
  const [selectedReleases, setSelectedReleases] = useState<string[]>([]);

  const scoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    if (score >= 50) return "text-orange-500";
    return "text-red-500";
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

  const toggleSelect = (id: string) => {
    setSelectedReleases((prev) => {
      if (prev.includes(id)) return prev.filter((r) => r !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const selectedData = selectedReleases.map((id) => releases.find((r) => r.id === id)).filter(Boolean);
  const selectedDeployments = selectedReleases.map((id) =>
    deployments.filter((d) => d.releaseId === id)
  );

  const getReleaseDeployments = (releaseId: string) =>
    deployments.filter((d) => d.releaseId === releaseId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Release History
          </h1>
          <p className="text-muted-foreground">View all releases and compare changes</p>
        </div>
        <Button
          variant={compareMode ? "default" : "outline"}
          onClick={() => {
            setCompareMode(!compareMode);
            setSelectedReleases([]);
          }}
        >
          <GitCompare className="h-4 w-4 mr-2" />
          {compareMode ? "Exit Compare" : "Compare Releases"}
        </Button>
      </div>

      {/* Compare Mode */}
      {compareMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Compare Releases
            </CardTitle>
            <CardDescription>
              {selectedReleases.length === 0
                ? "Select two releases to compare"
                : selectedReleases.length === 1
                ? "Select one more release to compare"
                : "Comparing selected releases"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedData.length === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedData.map((release, i) => {
                  if (!release) return null;
                  const relDeployments = getReleaseDeployments(release.id);
                  return (
                    <div key={release.id} className="space-y-4">
                      <div className="flex items-center gap-2">
                        {i > 0 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                        <h3 className="font-mono font-bold text-lg">{release.version}</h3>
                        <Badge variant="outline" className={`text-xs ${statusBadge(release.status)}`}>
                          {release.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Score</span>
                          <div className={`font-mono font-bold text-lg ${scoreColor(release.readinessScore)}`}>
                            {release.readinessScore}/100
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Label</span>
                          <div className="font-medium">{release.scoreLabel || "N/A"}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created</span>
                          <div>{new Date(release.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Deployed</span>
                          <div>{release.deployedAt ? new Date(release.deployedAt).toLocaleDateString() : "Not yet"}</div>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-sm">Deployments</span>
                        <div className="mt-1 space-y-1">
                          {relDeployments.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No deployments</span>
                          ) : (
                            relDeployments.map((d) => (
                              <div key={d.id} className="flex items-center gap-2 text-xs">
                                <Badge variant="outline" className={`text-xs ${statusBadge(d.status)}`}>
                                  {d.status}
                                </Badge>
                                <span className="text-muted-foreground">{d.environment}</span>
                                {d.duration && <span className="font-mono">{d.duration}s</span>}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      {release.releaseSummary && (
                        <div>
                          <span className="text-muted-foreground text-sm">Summary</span>
                          <pre className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {release.releaseSummary}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {selectedData.length < 2 && (
              <p className="text-center text-muted-foreground py-4">
                Click on releases in the history table below to select them for comparison.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Releases</CardTitle>
          <CardDescription>
            {releases.length} release(s) found
            {compareMode && " — click rows to select for comparison"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {releases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No releases yet. Create your first release on the main releases page.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    {compareMode && <th className="pb-2 w-8"></th>}
                    <th className="pb-2 font-medium text-muted-foreground">Version</th>
                    <th className="pb-2 font-medium text-muted-foreground">Title</th>
                    <th className="pb-2 font-medium text-muted-foreground">Score</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 font-medium text-muted-foreground">Branch</th>
                    <th className="pb-2 font-medium text-muted-foreground">Deployments</th>
                    <th className="pb-2 font-medium text-muted-foreground">Created</th>
                    <th className="pb-2 font-medium text-muted-foreground">Deployed</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((r) => {
                    const relDeployments = getReleaseDeployments(r.id);
                    const isSelected = selectedReleases.includes(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`border-b last:border-0 hover:bg-muted/50 ${compareMode ? "cursor-pointer" : ""} ${isSelected ? "bg-primary/5" : ""}`}
                        onClick={() => compareMode && toggleSelect(r.id)}
                      >
                        {compareMode && (
                          <td className="py-3">
                            <div
                              className={`h-4 w-4 rounded border ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}
                            />
                          </td>
                        )}
                        <td className="py-3 font-mono font-semibold">{r.version}</td>
                        <td className="py-3 text-muted-foreground max-w-[200px] truncate">{r.title}</td>
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
                        <td className="py-3 font-mono text-xs">
                          <GitBranch className="inline h-3 w-3 mr-1" />
                          {r.targetBranch}
                        </td>
                        <td className="py-3">
                          {relDeployments.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {relDeployments.slice(0, 3).map((d) => (
                                <Badge key={d.id} variant="outline" className={`text-xs ${statusBadge(d.status)}`}>
                                  {d.environment}
                                </Badge>
                              ))}
                              {relDeployments.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{relDeployments.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 text-xs">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-xs">
                          {r.deployedAt ? (
                            <span className="text-green-400">
                              {new Date(r.deployedAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Deployments */}
      {deployments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Recent Deployments
            </CardTitle>
            <CardDescription>Last 50 deployment events across all releases</CardDescription>
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
                  {deployments.map((d) => (
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
                      <td className="py-3 text-xs font-mono">{d.duration ? `${d.duration}s` : "—"}</td>
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
