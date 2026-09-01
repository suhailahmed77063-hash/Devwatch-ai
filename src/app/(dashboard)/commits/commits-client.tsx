"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  GitCommit,
  GitBranch,
  Plus,
  Minus,
  Shield,
  CheckCircle,
} from "lucide-react";

interface Commit {
  id: string;
  sha: string | null;
  message: string | null;
  branch: string | null;
  additions: number | null;
  deletions: number | null;
  committedAt: Date | null;
  repoName: string | null;
}

function formatTime(date: Date | null) {
  if (!date) return "Unknown";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

export default function CommitsClient({ commits }: { commits: Commit[] }) {
  const totalAdditions = commits.reduce((a, c) => a + (c.additions || 0), 0);
  const totalDeletions = commits.reduce((a, c) => a + (c.deletions || 0), 0);

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
            <p className="text-xs text-muted-foreground">Lines Added</p>
            <p className="text-2xl font-bold text-green-500">
              +{totalAdditions.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Lines Removed</p>
            <p className="text-2xl font-bold text-red-500">
              -{totalDeletions.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Repositories</p>
            <p className="text-2xl font-bold">
              {new Set(commits.map((c) => c.repoName).filter(Boolean)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {commits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No commits yet. Connect your repositories to start tracking.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {commits.map((commit) => (
            <Card key={commit.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                        {commit.sha?.substring(0, 7) || "N/A"}
                      </code>
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <p className="text-sm font-medium">{commit.message || "No message"}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{commit.repoName || "Unknown repo"}</span>
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {commit.branch || "unknown"}
                      </span>
                      <span>{formatTime(commit.committedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-green-500">
                      <Plus className="h-3 w-3" />
                      {commit.additions || 0}
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <Minus className="h-3 w-3" />
                      {commit.deletions || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
