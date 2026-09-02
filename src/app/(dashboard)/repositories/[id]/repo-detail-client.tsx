"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  GitPullRequest,
  Shield,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface RepoData {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string | null;
  isPrivate: boolean | null;
  openPRs: number;
  mergedPRs: number;
  totalCommits: number;
  securityIssues: number;
  vulnerabilities: number;
  ciSuccessRate: number;
}

interface Commit {
  id: string;
  sha: string;
  message: string | null;
  authorName: string | null;
  branch: string | null;
  additions: number | null;
  deletions: number | null;
  committedAt: Date | null;
}

interface PR {
  id: string;
  number: number;
  title: string;
  state: string;
  riskScore: number | null;
  ciStatus: string | null;
  additions: number | null;
  deletions: number | null;
  changedFiles: number | null;
  createdAt: Date | null;
}

interface Vuln {
  id: string;
  package: string;
  version: string | null;
  severity: string;
  title: string;
  cveId: string | null;
}

interface SecFinding {
  id: string;
  severity: string;
  description: string;
  file: string | null;
  line: number | null;
  category: string | null;
}

interface CIRun {
  id: string;
  name: string | null;
  status: string;
  conclusion: string | null;
  startedAt: Date | null;
}

function getRiskColor(score: number) {
  if (score <= 30) return "bg-green-500";
  if (score <= 60) return "bg-yellow-500";
  if (score <= 80) return "bg-orange-500";
  return "bg-red-500";
}

function timeAgo(date: Date | null) {
  if (!date) return "Unknown";
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  repo: RepoData;
  recentCommits: Commit[];
  recentPRs: PR[];
  vulnerabilities: Vuln[];
  securityFindings: SecFinding[];
  ciRuns: CIRun[];
}

export default function RepoDetailClient({
  repo,
  recentCommits,
  recentPRs,
  vulnerabilities,
  securityFindings,
  ciRuns,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/repositories"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Repositories
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold">{repo.name}</h1>
              {repo.isPrivate && <Badge variant="outline">Private</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {repo.description || "No description"}
            </p>
          </div>
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Open in GitHub <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Open PRs</p>
            <p className="text-2xl font-bold">{repo.openPRs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Merged PRs</p>
            <p className="text-2xl font-bold">{repo.mergedPRs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Commits</p>
            <p className="text-2xl font-bold">{repo.totalCommits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Security Issues</p>
            <p className="text-2xl font-bold text-red-500">{repo.securityIssues}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Vulnerabilities</p>
            <p className="text-2xl font-bold text-orange-500">{repo.vulnerabilities}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">CI Success Rate</p>
            <p className="text-2xl font-bold text-green-500">{repo.ciSuccessRate}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Commits */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Commits</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCommits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No commits yet</p>
            ) : (
              <div className="space-y-3">
                {recentCommits.map((commit) => (
                  <div key={commit.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{commit.message || "No message"}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{commit.authorName || "Unknown"}</span>
                          {commit.branch && (
                            <span className="flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              {commit.branch}
                            </span>
                          )}
                          <span>{timeAgo(commit.committedAt)}</span>
                        </div>
                      </div>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {commit.sha?.substring(0, 7)}
                      </code>
                    </div>
                    {(commit.additions || commit.deletions) ? (
                      <div className="mt-2 flex gap-3 text-xs">
                        {commit.additions ? <span className="text-green-500">+{commit.additions}</span> : null}
                        {commit.deletions ? <span className="text-red-500">-{commit.deletions}</span> : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent PRs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Pull Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPRs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No pull requests yet</p>
            ) : (
              <div className="space-y-3">
                {recentPRs.map((pr) => (
                  <Link key={pr.id} href={`/pull-requests/${pr.id}`}>
                    <div className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">#{pr.number} {pr.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{timeAgo(pr.createdAt)}</span>
                            <Badge variant={pr.state === "merged" ? "secondary" : pr.state === "open" ? "default" : "outline"} className="text-xs">
                              {pr.state}
                            </Badge>
                          </div>
                        </div>
                        {pr.riskScore != null && (
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2.5 w-2.5 rounded-full ${getRiskColor(pr.riskScore)}`}
                              title={`Risk: ${pr.riskScore}`}
                            />
                            {pr.ciStatus && (
                              <Badge variant={pr.ciStatus === "success" ? "secondary" : "destructive"} className="text-xs">
                                {pr.ciStatus}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex gap-3 text-xs">
                        {pr.additions ? <span className="text-green-500">+{pr.additions}</span> : null}
                        {pr.deletions ? <span className="text-red-500">-{pr.deletions}</span> : null}
                        {pr.changedFiles ? <span className="text-muted-foreground">{pr.changedFiles} files</span> : null}
                        {pr.riskScore != null && <span className="text-muted-foreground">Risk: {pr.riskScore}/100</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CI Runs */}
      {ciRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>CI/CD Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ciRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    {run.status === "success" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : run.status === "failure" ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{run.name || "CI Run"}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(run.startedAt)}</p>
                    </div>
                  </div>
                  <Badge variant={run.status === "success" ? "secondary" : "destructive"}>
                    {run.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security + Vulnerabilities */}
      {(securityFindings.length > 0 || vulnerabilities.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {securityFindings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  Security Findings ({securityFindings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {securityFindings.map((f) => (
                    <div key={f.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">{f.severity}</Badge>
                        {f.category && <Badge variant="outline" className="text-xs">{f.category}</Badge>}
                      </div>
                      <p className="text-sm font-medium mt-1">{f.description}</p>
                      {f.file && <p className="text-xs text-muted-foreground mt-1">{f.file}:{f.line}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {vulnerabilities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Vulnerabilities ({vulnerabilities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vulnerabilities.map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={`h-4 w-4 ${v.severity === "high" || v.severity === "critical" ? "text-orange-500" : "text-yellow-500"}`} />
                        <div>
                          <p className="text-sm font-medium">{v.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {v.package}@{v.version} {v.cveId && `• ${v.cveId}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant={v.severity === "high" || v.severity === "critical" ? "destructive" : "secondary"}>
                        {v.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
