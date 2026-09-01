"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitMerge,
  Shield,
  Bug,
  FolderKanban,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface DashboardStats {
  totalDevelopers: number;
  totalRepos: number;
  totalCommits: number;
  totalPRs: number;
  openPRs: number;
  mergedPRs: number;
  securityIssues: number;
  vulnerabilities: number;
  projects: number;
}

interface Alert {
  id: string;
  title: string;
  severity: string;
  message: string;
  createdAt: Date | null;
}

interface CIStats {
  success: number;
  failure: number;
}

interface Props {
  stats: DashboardStats;
  alerts: Alert[];
  ciStats: CIStats;
}

export default function DashboardClient({ stats, alerts, ciStats }: Props) {
  const totalCI = ciStats.success + ciStats.failure;
  const ciSuccessRate = totalCI > 0 ? Math.round((ciStats.success / totalCI) * 100) : 0;

  const statCards = [
    { label: "Total Developers", value: stats.totalDevelopers, icon: Users, color: "text-blue-500" },
    { label: "Repositories", value: stats.totalRepos, icon: GitBranch, color: "text-green-500" },
    { label: "Total Commits", value: stats.totalCommits, icon: GitCommit, color: "text-violet-500" },
    { label: "Pull Requests", value: stats.totalPRs, icon: GitPullRequest, color: "text-orange-500" },
    { label: "Open PRs", value: stats.openPRs, icon: TrendingUp, color: "text-yellow-500" },
    { label: "Merged PRs", value: stats.mergedPRs, icon: GitMerge, color: "text-emerald-500" },
    { label: "Security Issues", value: stats.securityIssues, icon: Shield, color: "text-rose-500" },
    { label: "Vulnerabilities", value: stats.vulnerabilities, icon: Bug, color: "text-amber-500" },
    { label: "Projects", value: stats.projects, icon: FolderKanban, color: "text-cyan-500" },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      default: return "bg-blue-500";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "secondary";
      default: return "outline";
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "Unknown";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Engineering team overview and key metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CI/CD Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>CI/CD Status</CardTitle>
            <CardDescription>Pipeline success rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative h-32 w-32">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="8" strokeDasharray={`${(ciSuccessRate / 100) * 251.2} 251.2`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-green-500">{ciSuccessRate}%</span>
                  <span className="text-xs text-muted-foreground">Success</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span>Success: {ciStats.success}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span>Failed: {ciStats.failure}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Latest alerts from your engineering team</CardDescription>
              </div>
              <a href="/alerts" className="text-sm text-primary hover:underline">
                View all →
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No alerts yet. Connect your repositories to start monitoring.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${getSeverityColor(alert.severity)}`} />
                      <div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(alert.createdAt)}</p>
                      </div>
                    </div>
                    <Badge variant={getSeverityBadge(alert.severity) as "destructive" | "secondary" | "outline"}>
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empty State for Charts */}
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            📊 Charts and trends will appear here once you have more data.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Connect your GitHub repositories to start tracking commits, PRs, and developer activity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
