"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  GitPullRequest,
  GitMerge,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useState } from "react";

interface PR {
  id: string;
  number: number | null;
  title: string | null;
  state: string | null;
  branch: string | null;
  baseBranch: string | null;
  additions: number | null;
  deletions: number | null;
  changedFiles: number | null;
  riskScore: number | null;
  ciStatus: string | null;
  createdAt: Date | null;
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

function getRiskBadge(score: number | null) {
  if (!score) return <Badge variant="outline">N/A</Badge>;
  if (score <= 30) return <Badge variant="secondary" className="bg-green-500/10 text-green-500">🟢 {score}</Badge>;
  if (score <= 60) return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">🟡 {score}</Badge>;
  if (score <= 80) return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">🟠 {score}</Badge>;
  return <Badge variant="destructive">🔴 {score}</Badge>;
}

function getStateBadge(state: string | null) {
  if (state === "open") return <Badge variant="secondary" className="bg-green-500/10 text-green-500"><GitPullRequest className="mr-1 h-3 w-3" />Open</Badge>;
  if (state === "merged") return <Badge variant="secondary" className="bg-purple-500/10 text-purple-500"><GitMerge className="mr-1 h-3 w-3" />Merged</Badge>;
  return <Badge variant="outline">{state || "unknown"}</Badge>;
}

export default function PRsClient({ pullRequests }: { pullRequests: PR[] }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? pullRequests : pullRequests.filter((pr) => pr.state === filter);

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
          {["all", "open", "merged"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Open</p>
            <p className="text-2xl font-bold text-green-500">{pullRequests.filter((p) => p.state === "open").length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Merged</p>
            <p className="text-2xl font-bold text-purple-500">{pullRequests.filter((p) => p.state === "merged").length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">High Risk</p>
            <p className="text-2xl font-bold text-orange-500">{pullRequests.filter((p) => (p.riskScore || 0) > 60).length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{pullRequests.length}</p>
          </CardContent>
        </Card>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No pull requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((pr) => (
            <Link key={pr.id} href={`/pull-requests/${pr.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getStateBadge(pr.state)}
                        <span className="text-sm font-semibold">#{pr.number}</span>
                        <h3 className="text-sm font-medium">{pr.title}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{pr.repoName || "Unknown repo"}</span>
                        <span className="flex items-center gap-1">
                          <GitPullRequest className="h-3 w-3" />
                          {pr.branch} → {pr.baseBranch}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(pr.createdAt)}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="text-green-500">+{pr.additions || 0}</span>
                        <span className="text-red-500">-{pr.deletions || 0}</span>
                        <span className="text-muted-foreground">{pr.changedFiles || 0} files</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getRiskBadge(pr.riskScore)}
                      <Badge variant={pr.ciStatus === "success" ? "secondary" : "destructive"}>
                        {pr.ciStatus === "success" ? <CheckCircle className="mr-1 h-3 w-3" /> : <AlertTriangle className="mr-1 h-3 w-3" />}
                        CI {pr.ciStatus || "unknown"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
