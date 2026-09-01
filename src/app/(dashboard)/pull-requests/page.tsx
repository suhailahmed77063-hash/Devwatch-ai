"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  GitPullRequest,
  GitMerge,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
} from "lucide-react";
import { useState } from "react";

const pullRequests = [
  {
    id: "1",
    number: 103,
    title: "Migrate API to GraphQL",
    author: "Marcus Johnson",
    repo: "acme-api",
    state: "open",
    branch: "feat/api",
    baseBranch: "main",
    additions: 456,
    deletions: 123,
    changedFiles: 12,
    riskScore: 72,
    ciStatus: "success",
    reviews: 1,
    createdAt: "3 days ago",
  },
  {
    id: "2",
    number: 108,
    title: "Add 2FA support",
    author: "Lisa Nguyen",
    repo: "acme-platform",
    state: "open",
    branch: "feat/auth",
    baseBranch: "main",
    additions: 312,
    deletions: 45,
    changedFiles: 8,
    riskScore: 65,
    ciStatus: "success",
    reviews: 0,
    createdAt: "3 days ago",
  },
  {
    id: "3",
    number: 107,
    title: "Implement full-text search",
    author: "Sarah Chen",
    repo: "acme-platform",
    state: "open",
    branch: "feat/search",
    baseBranch: "main",
    additions: 523,
    deletions: 67,
    changedFiles: 15,
    riskScore: 58,
    ciStatus: "failure",
    reviews: 2,
    createdAt: "4 days ago",
  },
  {
    id: "4",
    number: 105,
    title: "Add push notifications for mobile",
    author: "Priya Patel",
    repo: "acme-mobile",
    state: "open",
    branch: "feat/mobile",
    baseBranch: "main",
    additions: 189,
    deletions: 34,
    changedFiles: 6,
    riskScore: 45,
    ciStatus: "success",
    reviews: 1,
    createdAt: "5 days ago",
  },
  {
    id: "5",
    number: 106,
    title: "Fix memory leak in image gallery",
    author: "Jordan Kim",
    repo: "acme-mobile",
    state: "open",
    branch: "fix/gallery",
    baseBranch: "main",
    additions: 45,
    deletions: 23,
    changedFiles: 3,
    riskScore: 35,
    ciStatus: "success",
    reviews: 2,
    createdAt: "2 days ago",
  },
  {
    id: "6",
    number: 102,
    title: "Add dark mode support",
    author: "Priya Patel",
    repo: "acme-platform",
    state: "merged",
    branch: "feat/ui",
    baseBranch: "main",
    additions: 312,
    deletions: 78,
    changedFiles: 11,
    riskScore: 28,
    ciStatus: "success",
    reviews: 3,
    createdAt: "1 week ago",
  },
  {
    id: "7",
    number: 101,
    title: "Implement OAuth2 authentication flow",
    author: "Sarah Chen",
    repo: "acme-platform",
    state: "merged",
    branch: "feat/auth",
    baseBranch: "main",
    additions: 456,
    deletions: 89,
    changedFiles: 14,
    riskScore: 42,
    ciStatus: "success",
    reviews: 4,
    createdAt: "2 weeks ago",
  },
  {
    id: "8",
    number: 100,
    title: "Fix XSS vulnerability in search",
    author: "Jordan Kim",
    repo: "acme-platform",
    state: "merged",
    branch: "fix/security",
    baseBranch: "main",
    additions: 23,
    deletions: 5,
    changedFiles: 2,
    riskScore: 18,
    ciStatus: "success",
    reviews: 2,
    createdAt: "2 weeks ago",
  },
];

function getRiskBadge(score: number) {
  if (score <= 30)
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
        🟢 {score}
      </Badge>
    );
  if (score <= 60)
    return (
      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
        🟡 {score}
      </Badge>
    );
  if (score <= 80)
    return (
      <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
        🟠 {score}
      </Badge>
    );
  return (
    <Badge variant="destructive">
      🔴 {score}
    </Badge>
  );
}

function getStateBadge(state: string) {
  switch (state) {
    case "open":
      return (
        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
          <GitPullRequest className="mr-1 h-3 w-3" />
          Open
        </Badge>
      );
    case "merged":
      return (
        <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
          <GitMerge className="mr-1 h-3 w-3" />
          Merged
        </Badge>
      );
    case "closed":
      return (
        <Badge variant="secondary">
          <XCircle className="mr-1 h-3 w-3" />
          Closed
        </Badge>
      );
    default:
      return <Badge variant="outline">{state}</Badge>;
  }
}

export default function PullRequestsPage() {
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all"
      ? pullRequests
      : pullRequests.filter((pr) => pr.state === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Pull Requests</h1>
          <p className="text-sm text-muted-foreground">
            Track and review pull requests across all repositories
          </p>
        </div>
        <div className="flex gap-2">
          {["all", "open", "merged", "closed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Open</p>
            <p className="text-2xl font-bold text-green-500">
              {pullRequests.filter((p) => p.state === "open").length}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Merged</p>
            <p className="text-2xl font-bold text-purple-500">
              {pullRequests.filter((p) => p.state === "merged").length}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Awaiting Review</p>
            <p className="text-2xl font-bold text-yellow-500">
              {pullRequests.filter((p) => p.state === "open" && p.reviews === 0).length}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">High Risk</p>
            <p className="text-2xl font-bold text-orange-500">
              {pullRequests.filter((p) => (p.riskScore || 0) > 60).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PR List */}
      <div className="space-y-3">
        {filtered.map((pr) => (
          <Link key={pr.id} href={`/pull-requests/${pr.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getStateBadge(pr.state)}
                      <span className="text-sm font-semibold">
                        #{pr.number}
                      </span>
                      <h3 className="text-sm font-medium">{pr.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{pr.author}</span>
                      <span>{pr.repo}</span>
                      <span className="flex items-center gap-1">
                        <GitPullRequest className="h-3 w-3" />
                        {pr.branch} → {pr.baseBranch}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {pr.createdAt}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-500">+{pr.additions}</span>
                      <span className="text-red-500">-{pr.deletions}</span>
                      <span className="text-muted-foreground">
                        {pr.changedFiles} files
                      </span>
                      <span className="text-muted-foreground">
                        {pr.reviews} reviews
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getRiskBadge(pr.riskScore)}
                    <Badge
                      variant={
                        pr.ciStatus === "success" ? "secondary" : "destructive"
                      }
                    >
                      {pr.ciStatus === "success" ? (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      ) : (
                        <AlertTriangle className="mr-1 h-3 w-3" />
                      )}
                      CI {pr.ciStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
