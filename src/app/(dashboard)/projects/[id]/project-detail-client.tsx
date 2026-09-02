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
  CheckCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  progress: number | null;
  startDate: Date | null;
  deadline: Date | null;
  leadName: string;
  daysLeft: number | null;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  createdAt: Date | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: number | null;
}

interface Milestone {
  id: string;
  title: string;
  status: string;
  progress: number | null;
  dueDate: Date | null;
}

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

interface Props {
  project: ProjectData;
  tasks: Task[];
  milestonesList: Milestone[];
}

export default function ProjectDetailClient({ project, tasks, milestonesList }: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
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
            <p className="text-sm text-muted-foreground">{project.description || "No description"}</p>
            <p className="text-xs text-muted-foreground mt-1">Lead: {project.leadName}</p>
          </div>
          <Badge variant="secondary" className="bg-green-500/10 text-green-500">
            {project.status || "Active"}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-2xl font-bold">{project.progress || 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Tasks</p>
            <p className="text-2xl font-bold">{project.totalTasks}</p>
            <p className="text-xs text-muted-foreground">{project.doneTasks} done, {project.inProgressTasks} in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Milestones</p>
            <p className="text-2xl font-bold">{milestonesList.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Days Left</p>
            <p className="text-2xl font-bold">{project.daysLeft ?? "N/A"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{project.progress || 0}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${project.progress || 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      {milestonesList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Milestones ({milestonesList.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {milestonesList.map((ms) => (
                <div key={ms.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ms.status === "completed" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : ms.status === "open" ? (
                        <Clock className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{ms.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {ms.dueDate && (
                        <span className="text-xs text-muted-foreground">Due: {new Date(ms.dueDate).toLocaleDateString()}</span>
                      )}
                      <Badge variant="outline" className="text-xs">{ms.progress || 0}%</Badge>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${(ms.progress || 0) === 100 ? "bg-green-500" : "bg-blue-500"}`}
                      style={{ width: `${ms.progress || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tasks ({tasks.length})</CardTitle>
            <CardDescription>
              {tasks.filter((t) => t.status === "done").length} done, {tasks.filter((t) => t.status === "in_progress").length} in progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(task.status)} variant="outline">
                      {task.status.replace("_", " ")}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.type}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
