"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  GitPullRequest,
  GitCommit,
  Shield,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Clock,
} from "lucide-react";
import Link from "next/link";

const repo = {
  id: "1",
  name: "acme-platform",
  fullName: "acme-corp/acme-platform",
  description: "Main platform application - the core product",
  language: "TypeScript",
  defaultBranch: "main",
  isPrivate: true,
  openPRs: 2,
  mergedPRs: 12,
  totalCommits: 342,
  securityIssues: 3,
  vulnerabilities: 2,
  ciSuccessRate: 87,
};

const recentCommits = [
  {
    sha: "abc123",
    message: "feat(auth): implement OAuth2 flow with refresh tokens",
    author: "Sarah Chen",
    branch: "main",
    time: "2 hours ago",
    additions: 245,
    deletions: 18,
  },
  {
    sha: "def456",
    message: "fix(dashboard): resolve chart rendering on Safari",
    author: "Alex Rodriguez",
    branch: "feat/dashboard",
    time: "5 hours ago",
    additions: 32,
    deletions: 8,
  },
  {
    sha: "ghi789",
    message: "fix(security): patch XSS vulnerability in user input",
    author: "Jordan Kim",
    branch: "fix/security",
    time: "1 day ago",
    additions: 15,
    deletions: 3,
  },
  {
    sha: "jkl012",
    message: "feat(ui): add dark mode support with system preference",
    author: "Priya Patel",
    branch: "main",
    time: "2 days ago",
    additions: 189,
    deletions: 45,
  },
];

const openPRs = [
  {
    number: 103,
    title: "Migrate API to GraphQL",
    author: "Marcus Johnson",
    riskScore: 72,
    ciStatus: "success",
    additions: 456,
    deletions: 123,
    changedFiles: 12,
    time: "3 days ago",
  },
  {
    number: 105,
    title: "Optimize dashboard query performance",
    author: "Emma Wilson",
    riskScore: 35,
    ciStatus: "failure",
    additions: 89,
    deletions: 23,
    changedFiles: 5,
    time: "1 day ago",
  },
];

const vulnerabilities = [
  {
    package: "lodash",
    version: "4.17.19",
    severity: "high",
    title: "Prototype Pollution",
    cve: "CVE-2021-23337",
  },
  {
    package: "express",
    version: "4.17.1",
    severity: "medium",
    title: "Open Redirect",
    cve: "CVE-2022-24999",
  },
];

function getRiskColor(score: number) {
  if (score <= 30) return "bg-green-500";
  if (score <= 60) return "bg-yellow-500";
  if (score <= 80) return "bg-orange-500";
  return "bg-red-500";
}

export default function RepositoryDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
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
              {repo.isPrivate && (
                <Badge variant="outline">Private</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {repo.description}
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Open PRs</p>
            <p className="text-2xl font-bold">{repo.openPRs}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Merged PRs</p>
            <p className="text-2xl font-bold">{repo.mergedPRs}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Total Commits</p>
            <p className="text-2xl font-bold">{repo.totalCommits}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Security Issues</p>
            <p className="text-2xl font-bold text-red-500">
              {repo.securityIssues}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Vulnerabilities</p>
            <p className="text-2xl font-bold text-orange-500">
              {repo.vulnerabilities}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">CI Success Rate</p>
            <p className="text-2xl font-bold text-green-500">
              {repo.ciSuccessRate}%
            </p>
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
            <div className="space-y-3">
              {recentCommits.map((commit) => (
                <div key={commit.sha} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{commit.message}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{commit.author}</span>
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          {commit.branch}
                        </span>
                        <span>{commit.time}</span>
                      </div>
                    </div>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {commit.sha.substring(0, 7)}
                    </code>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs">
                    <span className="text-green-500">
                      +{commit.additions}
                    </span>
                    <span className="text-red-500">
                      -{commit.deletions}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Open PRs */}
        <Card>
          <CardHeader>
            <CardTitle>Open Pull Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {openPRs.map((pr) => (
                <Link key={pr.number} href={`/pull-requests/${pr.number}`}>
                  <div className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          #{pr.number} {pr.title}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{pr.author}</span>
                          <span>{pr.time}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${getRiskColor(
                            pr.riskScore
                          )}`}
                          title={`Risk Score: ${pr.riskScore}`}
                        />
                        <Badge
                          variant={
                            pr.ciStatus === "success" ? "secondary" : "destructive"
                          }
                        >
                          {pr.ciStatus}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="text-green-500">
                        +{pr.additions}
                      </span>
                      <span className="text-red-500">
                        -{pr.deletions}
                      </span>
                      <span className="text-muted-foreground">
                        {pr.changedFiles} files
                      </span>
                      <span className="text-muted-foreground">
                        Risk: {pr.riskScore}/100
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vulnerabilities */}
      <Card>
        <CardHeader>
          <CardTitle>Vulnerabilities</CardTitle>
          <CardDescription>Known vulnerabilities in dependencies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {vulnerabilities.map((v) => (
              <div key={v.cve} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-4 w-4 ${
                    v.severity === "high" ? "text-orange-500" : "text-yellow-500"
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{v.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.package}@{v.version} • {v.cve}
                    </p>
                  </div>
                </div>
                <Badge variant={v.severity === "high" ? "destructive" : "secondary"}>
                  {v.severity}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
