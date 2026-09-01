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
  FileBarChart,
  Calendar,
  Download,
  Clock,
  TrendingUp,
  Shield,
  GitCommit,
  GitPullRequest,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

const reports = [
  {
    id: "1",
    title: "Engineering Report - Week 34",
    frequency: "weekly",
    summary: "Strong week with 45 commits, 8 PRs merged. 2 critical security issues flagged.",
    periodStart: "Aug 19, 2024",
    periodEnd: "Aug 25, 2024",
    createdAt: "Aug 25, 2024",
  },
  {
    id: "2",
    title: "Daily Report - Aug 24",
    frequency: "daily",
    summary: "12 commits, 3 PRs merged. XSS vulnerability patched. Dashboard Revamp milestone at risk.",
    periodStart: "Aug 24, 2024",
    periodEnd: "Aug 24, 2024",
    createdAt: "Aug 24, 2024",
  },
  {
    id: "3",
    title: "Daily Report - Aug 23",
    frequency: "daily",
    summary: "8 commits, 2 PRs opened. CI pipeline failure on acme-api resolved.",
    periodStart: "Aug 23, 2024",
    periodEnd: "Aug 23, 2024",
    createdAt: "Aug 23, 2024",
  },
  {
    id: "4",
    title: "Engineering Report - Week 33",
    frequency: "weekly",
    summary: "52 commits, 10 PRs merged. Authentication system milestone completed. New security scanner integrated.",
    periodStart: "Aug 12, 2024",
    periodEnd: "Aug 18, 2024",
    createdAt: "Aug 18, 2024",
  },
  {
    id: "5",
    title: "Daily Report - Aug 22",
    frequency: "daily",
    summary: "6 commits, 1 PR merged. Dependency vulnerabilities patched in acme-platform.",
    periodStart: "Aug 22, 2024",
    periodEnd: "Aug 22, 2024",
    createdAt: "Aug 22, 2024",
  },
];

const weeklyReport = {
  title: "Engineering Report - Week 34",
  period: "Aug 19 - Aug 25, 2024",
  teamActivity: {
    commits: 45,
    prsOpened: 8,
    prsMerged: 8,
    reviews: 12,
    ciSuccessRate: 87,
  },
  security: {
    critical: 2,
    high: 3,
    vulnerabilities: 5,
    resolved: 1,
  },
  projects: [
    { name: "Platform v2.0", progress: 72, status: "on_track" },
    { name: "API Redesign", progress: 45, status: "at_risk" },
    { name: "Mobile App", progress: 28, status: "on_track" },
  ],
  keyChanges: [
    "Implemented OAuth2 authentication flow with refresh tokens",
    "Started GraphQL API migration",
    "Added dark mode support with system preference detection",
    "Patched XSS vulnerability in search input",
    "Optimized dashboard database queries",
  ],
  recommendations: [
    "Address 2 critical security findings immediately",
    "Review high-risk GraphQL migration PR (#103)",
    "Focus on Dashboard Revamp milestone - deadline in 7 days",
    "Update vulnerable lodash and axios dependencies",
  ],
};

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>("1");
  const [tab, setTab] = useState<"list" | "view">("view");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Automated daily and weekly engineering reports
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("view")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "view"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Latest Report
          </button>
          <button
            onClick={() => setTab("list")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "list"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All Reports
          </button>
        </div>
      </div>

      {tab === "view" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{weeklyReport.title}</CardTitle>
                  <CardDescription>{weeklyReport.period}</CardDescription>
                </div>
                <Badge variant="secondary">Weekly</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Team Activity */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Team Activity</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{weeklyReport.teamActivity.commits}</p>
                    <p className="text-xs text-muted-foreground">Commits</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{weeklyReport.teamActivity.prsOpened}</p>
                    <p className="text-xs text-muted-foreground">PRs Opened</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{weeklyReport.teamActivity.prsMerged}</p>
                    <p className="text-xs text-muted-foreground">PRs Merged</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{weeklyReport.teamActivity.reviews}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">{weeklyReport.teamActivity.ciSuccessRate}%</p>
                    <p className="text-xs text-muted-foreground">CI Success</p>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Security Status</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border border-red-500/20 p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">{weeklyReport.security.critical}</p>
                    <p className="text-xs text-muted-foreground">Critical</p>
                  </div>
                  <div className="rounded-lg border border-orange-500/20 p-3 text-center">
                    <p className="text-2xl font-bold text-orange-500">{weeklyReport.security.high}</p>
                    <p className="text-xs text-muted-foreground">High</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{weeklyReport.security.vulnerabilities}</p>
                    <p className="text-xs text-muted-foreground">Vulnerabilities</p>
                  </div>
                  <div className="rounded-lg border border-green-500/20 p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">{weeklyReport.security.resolved}</p>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                  </div>
                </div>
              </div>

              {/* Projects */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Project Progress</h3>
                <div className="space-y-3">
                  {weeklyReport.projects.map((p) => (
                    <div key={p.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{p.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{p.progress}%</span>
                          <Badge
                            variant={p.status === "on_track" ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {p.status === "on_track" ? "✓ On Track" : "⚠ At Risk"}
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Changes */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Key Changes</h3>
                <ul className="space-y-2">
                  {weeklyReport.keyChanges.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1 text-primary">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                <h3 className="mb-3 text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                  Recommended Actions
                </h3>
                <ul className="space-y-2">
                  {weeklyReport.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1 text-yellow-500">⚠</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => {
                setSelectedReport(report.id);
                setTab("view");
              }}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{report.title}</h3>
                      <Badge variant={report.frequency === "weekly" ? "secondary" : "outline"}>
                        {report.frequency}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{report.summary}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {report.periodStart} - {report.periodEnd}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {report.createdAt}
                      </span>
                    </div>
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
