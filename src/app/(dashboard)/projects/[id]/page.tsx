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
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  GitPullRequest,
  GitCommit,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

const project = {
  name: "Platform v2.0",
  description: "Major platform upgrade with new features, performance improvements, and security hardening.",
  status: "active",
  progress: 72,
  lead: "Sarah Chen",
  startDate: "Jul 1, 2024",
  deadline: "Oct 15, 2024",
  daysLeft: 30,
  repos: ["acme-platform"],
};

const milestones = [
  { title: "Authentication System", status: "completed", progress: 100, dueDate: "Aug 1, 2024", tasks: 6 },
  { title: "Dashboard Revamp", status: "in_progress", progress: 65, dueDate: "Sep 15, 2024", tasks: 8 },
  { title: "Performance Optimization", status: "todo", progress: 10, dueDate: "Oct 10, 2024", tasks: 5 },
];

const tasks = [
  { title: "Redesign dashboard layout", status: "done", type: "feature", assignee: "Sarah Chen", priority: 1 },
  { title: "Add dark mode toggle", status: "in_progress", type: "feature", assignee: "Alex Rodriguez", priority: 2 },
  { title: "Fix chart rendering bug", status: "in_review", type: "bug", assignee: "Jordan Kim", priority: 0 },
  { title: "Performance optimization", status: "todo", type: "task", assignee: "Emma Wilson", priority: 3 },
  { title: "Add notification system", status: "todo", type: "feature", assignee: "Lisa Nguyen", priority: 1 },
  { title: "Implement search autocomplete", status: "backlog", type: "feature", assignee: "Unassigned", priority: 2 },
  { title: "Fix responsive layout", status: "in_progress", type: "bug", assignee: "Alex Rodriguez", priority: 0 },
  { title: "Add unit tests for auth", status: "todo", type: "task", assignee: "David Brown", priority: 1 },
];

const relatedPRs = [
  { number: 102, title: "Add dark mode support", state: "merged", riskScore: 28 },
  { number: 103, title: "Implement search", state: "open", riskScore: 58 },
  { number: 105, title: "Fix chart rendering", state: "open", riskScore: 35 },
  { number: 107, title: "Full-text search", state: "open", riskScore: 58 },
];

const recentCommits = 18;

function getStatusColor(status: string) {
  switch (status) {
    case "done": return "bg-green-500/10 text-green-500";
    case "in_progress": return "bg-blue-500/10 text-blue-500";
    case "in_review": return "bg-purple-500/10 text-purple-500";
    case "todo": return "bg-muted text-muted-foreground";
    case "backlog": return "bg-muted/50 text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
}

function getPriorityLabel(p: number) {
  if (p === 0) return "🔴 Urgent";
  if (p === 1) return "🟠 High";
  if (p === 2) return "🟡 Medium";
  return "🔵 Low";
}

export default function ProjectDetailPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{project.description}</p>
          </div>
          <Badge variant="secondary" className="bg-green-500/10 text-green-500">
            Active
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-2xl font-bold">{project.progress}%</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Related PRs</p>
            <p className="text-2xl font-bold">{relatedPRs.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Commits</p>
            <p className="text-2xl font-bold">{recentCommits}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Days Left</p>
            <p className="text-2xl font-bold">{project.daysLeft}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle>Milestones ({milestones.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {milestones.map((ms, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {ms.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : ms.status === "in_progress" ? (
                      <Clock className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{ms.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Due: {ms.dueDate}</span>
                    <Badge variant="outline" className="text-xs">{ms.progress}%</Badge>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      ms.progress === 100 ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${ms.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks ({tasks.length})</CardTitle>
          <CardDescription>
            {tasks.filter((t) => t.status === "done").length} done, {tasks.filter((t) => t.status === "in_progress").length} in progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(task.status)} variant="outline">
                    {task.status.replace("_", " ")}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.assignee} • {task.type} • {getPriorityLabel(task.priority)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Related PRs */}
      <Card>
        <CardHeader>
          <CardTitle>Related Pull Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {relatedPRs.map((pr) => (
              <Link key={pr.number} href={`/pull-requests/${pr.number}`}>
                <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      #{pr.number} {pr.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={pr.state === "merged" ? "secondary" : "outline"}>
                      {pr.state}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Risk: {pr.riskScore}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
