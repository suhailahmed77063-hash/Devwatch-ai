"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { useState } from "react";

interface Report {
  id: string;
  title: string;
  frequency: string;
  content: string;
  summary: string | null;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

interface LatestReport {
  title: string;
  period: string;
  teamActivity: {
    commits: number;
    prsOpened: number;
    prsMerged: number;
    ciSuccessRate: number;
  };
  security: {
    critical: number;
    high: number;
    vulnerabilities: number;
  };
  projects: Array<{
    name: string;
    progress: number;
    status: string;
  }>;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ReportsClient({
  reports,
  latestReport,
}: {
  reports: Report[];
  latestReport: LatestReport;
}) {
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
              tab === "view" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Latest Report
          </button>
          <button
            onClick={() => setTab("list")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "list" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
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
                  <CardTitle>{latestReport.title}</CardTitle>
                  <CardDescription>{latestReport.period}</CardDescription>
                </div>
                <Badge variant="secondary">Live</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Team Activity */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Team Activity</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{latestReport.teamActivity.commits}</p>
                    <p className="text-xs text-muted-foreground">Commits</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{latestReport.teamActivity.prsOpened}</p>
                    <p className="text-xs text-muted-foreground">Open PRs</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{latestReport.teamActivity.prsMerged}</p>
                    <p className="text-xs text-muted-foreground">Merged PRs</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">{latestReport.teamActivity.ciSuccessRate}%</p>
                    <p className="text-xs text-muted-foreground">CI Success</p>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Security Status</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-red-500/20 p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">{latestReport.security.critical}</p>
                    <p className="text-xs text-muted-foreground">Critical</p>
                  </div>
                  <div className="rounded-lg border border-orange-500/20 p-3 text-center">
                    <p className="text-2xl font-bold text-orange-500">{latestReport.security.high}</p>
                    <p className="text-xs text-muted-foreground">High</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{latestReport.security.vulnerabilities}</p>
                    <p className="text-xs text-muted-foreground">Vulnerabilities</p>
                  </div>
                </div>
              </div>

              {/* Projects */}
              {latestReport.projects.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">Project Progress</h3>
                  <div className="space-y-3">
                    {latestReport.projects.map((p) => (
                      <div key={p.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{p.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{p.progress}%</span>
                            <Badge variant={p.status === "on_track" ? "secondary" : "destructive"} className="text-xs">
                              {p.status === "on_track" ? "✓ On Track" : "⚠ At Risk"}
                            </Badge>
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No reports generated yet. Connect your GitHub repository to start generating reports.</p>
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => setTab("view")}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{report.title}</h3>
                        <Badge variant={report.frequency === "weekly" ? "secondary" : "outline"}>{report.frequency}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{report.summary || "No summary"}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
