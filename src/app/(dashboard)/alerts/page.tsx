"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { useState } from "react";

const alerts = [
  {
    id: "1",
    type: "critical_security",
    title: "Critical Security Vulnerability Detected",
    message: "AWS access key found in CI configuration for acme-platform. Rotate immediately.",
    severity: "critical",
    isRead: false,
    createdAt: "2 hours ago",
    repo: "acme-platform",
  },
  {
    id: "2",
    type: "secret_detected",
    title: "Secret Detected in Commit",
    message: "Elasticsearch credentials found in src/search/index.ts by security scanner.",
    severity: "critical",
    isRead: false,
    createdAt: "2 hours ago",
    repo: "acme-platform",
  },
  {
    id: "3",
    type: "high_risk_pr",
    title: "High-Risk PR Opened",
    message: "PR #103 'Migrate API to GraphQL' has a risk score of 72. Review before merging.",
    severity: "high",
    isRead: false,
    createdAt: "5 hours ago",
    repo: "acme-api",
  },
  {
    id: "4",
    type: "milestone_at_risk",
    title: "Important Project Milestone at Risk",
    message: "Dashboard Revamp milestone is 65% complete with 7 days to deadline.",
    severity: "high",
    isRead: false,
    createdAt: "1 day ago",
  },
  {
    id: "5",
    type: "ci_failure",
    title: "CI Pipeline Failing Repeatedly",
    message: "CI Pipeline #103 has failed 3 times on feat/api branch. Check for flaky tests.",
    severity: "medium",
    isRead: true,
    createdAt: "1 day ago",
    repo: "acme-api",
  },
  {
    id: "6",
    type: "pr_stale",
    title: "PR Waiting for Review Too Long",
    message: "PR #108 'Add 2FA support' has been waiting for review for 3 days.",
    severity: "medium",
    isRead: false,
    createdAt: "2 days ago",
  },
  {
    id: "7",
    type: "dependency_vulnerability",
    title: "Vulnerable Dependencies Detected",
    message: "5 known vulnerabilities found across repositories. Update recommended.",
    severity: "medium",
    isRead: false,
    createdAt: "2 days ago",
  },
  {
    id: "8",
    type: "info",
    title: "Weekly Report Available",
    message: "Your weekly engineering report for Week 34 is ready to view.",
    severity: "informational",
    isRead: true,
    createdAt: "2 days ago",
  },
  {
    id: "9",
    type: "info",
    title: "New Repository Connected",
    message: "acme-docs has been successfully connected and initial scan completed.",
    severity: "informational",
    isRead: true,
    createdAt: "5 days ago",
  },
];

function getSeverityConfig(severity: string) {
  switch (severity) {
    case "critical":
      return { color: "text-red-500", bg: "bg-red-500", badge: "destructive" as const, icon: <Shield className="h-4 w-4" /> };
    case "high":
      return { color: "text-orange-500", bg: "bg-orange-500", badge: "secondary" as const, icon: <AlertTriangle className="h-4 w-4" /> };
    case "medium":
      return { color: "text-yellow-500", bg: "bg-yellow-500", badge: "secondary" as const, icon: <Bell className="h-4 w-4" /> };
    default:
      return { color: "text-blue-500", bg: "bg-blue-500", badge: "outline" as const, icon: <CheckCircle className="h-4 w-4" /> };
  }
}

export default function AlertsPage() {
  const [filter, setFilter] = useState("all");
  const [readState, setReadState] = useState<Record<string, boolean>>(
    Object.fromEntries(alerts.map((a) => [a.id, a.isRead]))
  );

  const filtered = filter === "all"
    ? alerts
    : filter === "unread"
    ? alerts.filter((a) => !readState[a.id])
    : alerts.filter((a) => a.severity === filter);

  const unreadCount = alerts.filter((a) => !readState[a.id]).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {["all", "unread", "critical", "high", "medium", "informational"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((alert) => {
          const config = getSeverityConfig(alert.severity);
          const isRead = readState[alert.id];

          return (
            <Card
              key={alert.id}
              className={`transition-opacity ${isRead ? "opacity-60" : ""}`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${config.color}`}>{config.icon}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{alert.title}</h3>
                      <Badge variant={config.badge}>
                        {alert.severity}
                      </Badge>
                      {!isRead && (
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {alert.createdAt}
                      </span>
                      {alert.repo && <span>{alert.repo}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setReadState((prev) => ({
                          ...prev,
                          [alert.id]: !prev[alert.id],
                        }))
                      }
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title={isRead ? "Mark as unread" : "Mark as read"}
                    >
                      {isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
