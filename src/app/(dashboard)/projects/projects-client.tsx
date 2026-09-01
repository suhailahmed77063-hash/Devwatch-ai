"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FolderKanban, Calendar, CheckCircle } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  progress: number | null;
  deadline: Date | null;
}

function getProgressColor(progress: number) {
  if (progress >= 75) return "bg-green-500";
  if (progress >= 50) return "bg-blue-500";
  if (progress >= 25) return "bg-yellow-500";
  return "bg-orange-500";
}

function formatDate(date: Date | null) {
  if (!date) return "No deadline";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysLeft(date: Date | null) {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function ProjectsClient({ projects }: { projects: Project[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Projects</h1>
        <p className="text-sm text-muted-foreground">Track project progress, milestones, and team assignments</p>
      </div>

      {projects.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No projects tracked yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const days = daysLeft(project.deadline);
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-lg font-semibold">{project.name}</h3>
                          <Badge variant="outline">{project.status || "active"}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{project.description || "No description"}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Due: {formatDate(project.deadline)}
                            {days !== null && ` (${days} days)`}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>Progress</span>
                            <span className="font-medium">{project.progress || 0}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div className={`h-full rounded-full transition-all ${getProgressColor(project.progress || 0)}`} style={{ width: `${project.progress || 0}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
