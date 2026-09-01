"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  FolderKanban,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

const projects = [
  {
    id: "1",
    name: "Platform v2.0",
    description: "Major platform upgrade with new features",
    status: "active",
    progress: 72,
    lead: "Sarah Chen",
    deadline: "Oct 15, 2024",
    daysLeft: 30,
    tasks: { total: 24, done: 17, inProgress: 4 },
    repos: ["acme-platform"],
    risk: "low",
    milestones: { total: 3, completed: 1 },
    openIssues: 2,
  },
  {
    id: "2",
    name: "API Redesign",
    description: "REST to GraphQL migration",
    status: "active",
    progress: 45,
    lead: "Marcus Johnson",
    deadline: "Nov 30, 2024",
    daysLeft: 76,
    tasks: { total: 18, done: 8, inProgress: 3 },
    repos: ["acme-api"],
    risk: "high",
    milestones: { total: 2, completed: 0 },
    openIssues: 5,
  },
  {
    id: "3",
    name: "Mobile App Launch",
    description: "React Native mobile application",
    status: "active",
    progress: 28,
    lead: "Priya Patel",
    deadline: "Dec 31, 2024",
    daysLeft: 107,
    tasks: { total: 32, done: 9, inProgress: 5 },
    repos: ["acme-mobile"],
    risk: "medium",
    milestones: { total: 4, completed: 0 },
    openIssues: 8,
  },
];

function getRiskBadge(risk: string) {
  switch (risk) {
    case "low":
      return <Badge variant="secondary" className="bg-green-500/10 text-green-500">🟢 Low Risk</Badge>;
    case "medium":
      return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">🟡 Medium Risk</Badge>;
    case "high":
      return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">🟠 High Risk</Badge>;
    case "critical":
      return <Badge variant="destructive">🔴 Critical</Badge>;
    default:
      return <Badge variant="outline">{risk}</Badge>;
  }
}

function getProgressColor(progress: number) {
  if (progress >= 75) return "bg-green-500";
  if (progress >= 50) return "bg-blue-500";
  if (progress >= 25) return "bg-yellow-500";
  return "bg-orange-500";
}

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Track project progress, milestones, and team assignments
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Active Projects</p>
            <p className="text-2xl font-bold">{projects.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Avg Progress</p>
            <p className="text-2xl font-bold">
              {Math.round(projects.reduce((a, p) => a + p.progress, 0) / projects.length)}%
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">At Risk</p>
            <p className="text-2xl font-bold text-orange-500">
              {projects.filter((p) => p.risk === "high").length}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Open Issues</p>
            <p className="text-2xl font-bold">{projects.reduce((a, p) => a + p.openIssues, 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{project.name}</h3>
                      {getRiskBadge(project.risk)}
                    </div>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {project.lead}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Due: {project.deadline} ({project.daysLeft} days)
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {project.tasks.done}/{project.tasks.total} tasks
                      </span>
                      <span>{project.repos.join(", ")}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>Progress</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${getProgressColor(project.progress)}`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
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
