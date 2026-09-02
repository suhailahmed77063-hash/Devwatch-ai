"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  GitCommit,
  GitPullRequest,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface DevData {
  id: string;
  name: string | null;
  githubUsername: string;
  email: string | null;
  avatarUrl: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  totalCommits: number;
  totalPRs: number;
  openPRs: number;
  mergedPRs: number;
}

interface Commit {
  id: string;
  sha: string;
  message: string | null;
  repoId: string;
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
  createdAt: Date | null;
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
  dev: DevData;
  recentCommits: Commit[];
  recentPRs: PR[];
}

export default function DevDetailClient({ dev, recentCommits, recentPRs }: Props) {
  const initials = (dev.name || dev.githubUsername)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/developers"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Developers
        </Link>
        <div className="flex items-center gap-4">
          <div className="relative">
            {dev.avatarUrl ? (
              <img src={dev.avatarUrl} alt={dev.name || ""} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                {initials}
              </div>
            )}
            {dev.isActive && (
              <div className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-card bg-green-500" />
            )}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">{dev.name || dev.githubUsername}</h1>
            <p className="text-sm text-muted-foreground">
              @{dev.githubUsername} {dev.email && `• ${dev.email}`}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-yellow-700 dark:text-yellow-400">
        ℹ️ <strong>Note:</strong> Activity metrics below represent engineering activity, not performance or productivity judgments.
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Commits</p>
            <p className="text-2xl font-bold">{dev.totalCommits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pull Requests</p>
            <p className="text-2xl font-bold">{dev.totalPRs}</p>
            <p className="text-xs text-muted-foreground">{dev.openPRs} open, {dev.mergedPRs} merged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Open PRs</p>
            <p className="text-2xl font-bold text-green-500">{dev.openPRs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Merged PRs</p>
            <p className="text-2xl font-bold text-purple-500">{dev.mergedPRs}</p>
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
                          {commit.branch && (
                            <span className="flex items-center gap-1">
                              <GitCommit className="h-3 w-3" /> {commit.branch}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {timeAgo(commit.committedAt)}
                          </span>
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
                        <div>
                          <p className="text-sm font-medium">#{pr.number} {pr.title}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo(pr.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {pr.riskScore != null && (
                            <span className="text-xs text-muted-foreground">Risk: {pr.riskScore}</span>
                          )}
                          <Badge variant={pr.state === "merged" ? "secondary" : pr.state === "open" ? "default" : "outline"}>
                            {pr.state}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
