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
  Eye,
  CheckCircle,
  AlertTriangle,
  Shield,
  Clock,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const dev = {
  name: "Sarah Chen",
  githubUsername: "sarah-chen",
  email: "sarah@acme.com",
  isActive: true,
  joinedAt: "2024-01-15",
};

const stats = {
  totalCommits: 245,
  commitsThisWeek: 12,
  pullRequests: 34,
  openPRs: 1,
  mergedPRs: 30,
  reviews: 56,
  prMergeRate: 88,
  ciFailures: 2,
  securityFindings: 0,
};

const weeklyActivity = [
  { week: "W30", commits: 8, prs: 2, reviews: 3 },
  { week: "W31", commits: 15, prs: 3, reviews: 5 },
  { week: "W32", commits: 10, prs: 2, reviews: 4 },
  { week: "W33", commits: 12, prs: 4, reviews: 6 },
  { week: "W34", commits: 12, prs: 3, reviews: 5 },
];

const recentCommits = [
  { sha: "abc123", message: "feat(auth): implement OAuth2 flow with refresh tokens", repo: "acme-platform", time: "2 hours ago", additions: 245, deletions: 18 },
  { sha: "bcd890", message: "feat(search): implement full-text search with Elasticsearch", repo: "acme-platform", time: "5 days ago", additions: 523, deletions: 67 },
  { sha: "cde123", message: "feat(auth): add two-factor authentication support", repo: "acme-platform", time: "1 week ago", additions: 189, deletions: 34 },
];

const recentPRs = [
  { number: 107, title: "Implement full-text search", state: "open", repo: "acme-platform", riskScore: 58 },
  { number: 101, title: "Implement OAuth2 authentication flow", state: "merged", repo: "acme-platform", riskScore: 42 },
  { number: 99, title: "Add user profile settings", state: "merged", repo: "acme-platform", riskScore: 22 },
];

const assignedTasks = [
  { title: "Redesign dashboard layout", status: "done", project: "Platform v2.0" },
  { title: "Implement full-text search", status: "in_progress", project: "Platform v2.0" },
];

export default function DeveloperDetailPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/developers"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Developers
        </Link>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
              {dev.name.split(" ").map((n) => n[0]).join("")}
            </div>
            {dev.isActive && (
              <div className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-card bg-green-500" />
            )}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">{dev.name}</h1>
            <p className="text-sm text-muted-foreground">
              @{dev.githubUsername} • {dev.email}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-yellow-700 dark:text-yellow-400">
        ℹ️ <strong>Note:</strong> Activity metrics below represent engineering activity, not performance or productivity judgments.
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Total Commits</p>
            <p className="text-2xl font-bold">{stats.totalCommits}</p>
            <p className="text-xs text-muted-foreground">+{stats.commitsThisWeek} this week</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Pull Requests</p>
            <p className="text-2xl font-bold">{stats.pullRequests}</p>
            <p className="text-xs text-muted-foreground">{stats.openPRs} open, {stats.mergedPRs} merged</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Reviews</p>
            <p className="text-2xl font-bold">{stats.reviews}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">PR Merge Rate</p>
            <p className="text-2xl font-bold text-green-500">{stats.prMergeRate}%</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">CI Failures</p>
            <p className={`text-2xl font-bold ${stats.ciFailures > 0 ? "text-red-500" : ""}`}>
              {stats.ciFailures}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="week" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="commits" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Commits" />
              <Bar dataKey="prs" fill="#f97316" radius={[4, 4, 0, 0]} name="PRs" />
              <Bar dataKey="reviews" fill="#22c55e" radius={[4, 4, 0, 0]} name="Reviews" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
                        <span>{commit.repo}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {commit.time}
                        </span>
                      </div>
                    </div>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {commit.sha}
                    </code>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs">
                    <span className="text-green-500">+{commit.additions}</span>
                    <span className="text-red-500">-{commit.deletions}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent PRs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Pull Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPRs.map((pr) => (
                <Link key={pr.number} href={`/pull-requests/${pr.number}`}>
                  <div className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          #{pr.number} {pr.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{pr.repo}</p>
                      </div>
                      <Badge variant={pr.state === "merged" ? "secondary" : "outline"}>
                        {pr.state}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {assignedTasks.map((task, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.project}</p>
                </div>
                <Badge variant={task.status === "done" ? "secondary" : "outline"}>
                  {task.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
