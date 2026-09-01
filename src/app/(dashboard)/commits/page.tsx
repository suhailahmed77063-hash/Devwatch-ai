"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GitCommit,
  GitBranch,
  Plus,
  Minus,
  Shield,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

const commits = [
  {
    sha: "abc123f",
    message: "feat(auth): implement OAuth2 flow with refresh tokens",
    author: "Sarah Chen",
    email: "sarah@acme.com",
    repo: "acme-platform",
    branch: "main",
    additions: 245,
    deletions: 18,
    filesChanged: 8,
    verified: true,
    securityFindings: 0,
    committedAt: "2 hours ago",
  },
  {
    sha: "def456a",
    message: "fix(dashboard): resolve chart rendering on Safari",
    author: "Alex Rodriguez",
    email: "alex@acme.com",
    repo: "acme-platform",
    branch: "feat/dashboard",
    additions: 32,
    deletions: 8,
    filesChanged: 2,
    verified: true,
    securityFindings: 0,
    committedAt: "5 hours ago",
  },
  {
    sha: "ghi789b",
    message: "fix(security): patch XSS vulnerability in user input",
    author: "Jordan Kim",
    email: "jordan@acme.com",
    repo: "acme-platform",
    branch: "fix/security",
    additions: 15,
    deletions: 3,
    filesChanged: 1,
    verified: true,
    securityFindings: 0,
    committedAt: "1 day ago",
  },
  {
    sha: "jkl012c",
    message: "feat(ui): add dark mode support with system preference",
    author: "Priya Patel",
    email: "priya@acme.com",
    repo: "acme-platform",
    branch: "main",
    additions: 189,
    deletions: 45,
    filesChanged: 11,
    verified: true,
    securityFindings: 0,
    committedAt: "2 days ago",
  },
  {
    sha: "mno345d",
    message: "feat(api): add GraphQL query batching support",
    author: "Marcus Johnson",
    email: "marcus@acme.com",
    repo: "acme-api",
    branch: "feat/api",
    additions: 312,
    deletions: 67,
    filesChanged: 9,
    verified: true,
    securityFindings: 1,
    committedAt: "2 days ago",
  },
  {
    sha: "pqr678e",
    message: "refactor(db): optimize query performance for dashboard",
    author: "Emma Wilson",
    email: "emma@acme.com",
    repo: "acme-api",
    branch: "main",
    additions: 78,
    deletions: 134,
    filesChanged: 4,
    verified: true,
    securityFindings: 0,
    committedAt: "3 days ago",
  },
  {
    sha: "stu901f",
    message: "feat(mobile): implement push notifications",
    author: "Priya Patel",
    email: "priya@acme.com",
    repo: "acme-mobile",
    branch: "feat/mobile",
    additions: 245,
    deletions: 34,
    filesChanged: 7,
    verified: false,
    securityFindings: 0,
    committedAt: "3 days ago",
  },
  {
    sha: "vwx234g",
    message: "fix(security): update vulnerable dependencies",
    author: "David Brown",
    email: "david@acme.com",
    repo: "acme-platform",
    branch: "fix/security",
    additions: 8,
    deletions: 8,
    filesChanged: 1,
    verified: true,
    securityFindings: 0,
    committedAt: "4 days ago",
  },
  {
    sha: "yza567h",
    message: "feat(auth): add two-factor authentication support",
    author: "Lisa Nguyen",
    email: "lisa@acme.com",
    repo: "acme-platform",
    branch: "feat/auth",
    additions: 456,
    deletions: 89,
    filesChanged: 14,
    verified: true,
    securityFindings: 1,
    committedAt: "5 days ago",
  },
  {
    sha: "bcd890i",
    message: "feat(search): implement full-text search with Elasticsearch",
    author: "Sarah Chen",
    email: "sarah@acme.com",
    repo: "acme-platform",
    branch: "feat/search",
    additions: 523,
    deletions: 67,
    filesChanged: 15,
    verified: true,
    securityFindings: 2,
    committedAt: "5 days ago",
  },
];

export default function CommitsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Commits</h1>
        <p className="text-sm text-muted-foreground">
          Recent commits across all monitored repositories
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Total Commits</p>
            <p className="text-2xl font-bold">{commits.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Contributors</p>
            <p className="text-2xl font-bold">7</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Lines Added</p>
            <p className="text-2xl font-bold text-green-500">
              +{commits.reduce((a, c) => a + c.additions, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">With Security Findings</p>
            <p className="text-2xl font-bold text-red-500">
              {commits.filter((c) => c.securityFindings > 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {commits.map((commit) => (
          <Card key={commit.sha}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {commit.sha}
                    </code>
                    {commit.verified ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                    )}
                    {commit.securityFindings > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <Shield className="mr-1 h-3 w-3" />
                        {commit.securityFindings} finding{commit.securityFindings > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium">{commit.message}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{commit.author}</span>
                    <span>{commit.repo}</span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {commit.branch}
                    </span>
                    <span>{commit.committedAt}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-500">
                    <Plus className="h-3 w-3" />
                    {commit.additions}
                  </span>
                  <span className="flex items-center gap-1 text-red-500">
                    <Minus className="h-3 w-3" />
                    {commit.deletions}
                  </span>
                  <span className="text-muted-foreground">
                    {commit.filesChanged} files
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
