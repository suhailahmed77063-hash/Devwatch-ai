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
  GitBranch,
  GitPullRequest,
  Shield,
  Clock,
  ExternalLink,
} from "lucide-react";

const repositories = [
  {
    id: "1",
    name: "acme-platform",
    fullName: "acme-corp/acme-platform",
    description: "Main platform application",
    language: "TypeScript",
    stars: 142,
    openPRs: 2,
    securityIssues: 3,
    lastCommit: "2 hours ago",
    isPrivate: true,
    health: "good",
  },
  {
    id: "2",
    name: "acme-api",
    fullName: "acme-corp/acme-api",
    description: "REST API service",
    language: "TypeScript",
    stars: 87,
    openPRs: 1,
    securityIssues: 2,
    lastCommit: "5 hours ago",
    isPrivate: true,
    health: "warning",
  },
  {
    id: "3",
    name: "acme-mobile",
    fullName: "acme-corp/acme-mobile",
    description: "React Native mobile app",
    language: "TypeScript",
    stars: 56,
    openPRs: 1,
    securityIssues: 1,
    lastCommit: "1 day ago",
    isPrivate: true,
    health: "warning",
  },
  {
    id: "4",
    name: "acme-infra",
    fullName: "acme-corp/acme-infra",
    description: "Infrastructure as Code",
    language: "HCL",
    stars: 34,
    openPRs: 0,
    securityIssues: 1,
    lastCommit: "3 days ago",
    isPrivate: true,
    health: "good",
  },
  {
    id: "5",
    name: "acme-docs",
    fullName: "acme-corp/acme-docs",
    description: "Documentation site",
    language: "MDX",
    stars: 23,
    openPRs: 0,
    securityIssues: 0,
    lastCommit: "5 days ago",
    isPrivate: false,
    health: "good",
  },
];

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  HCL: "#7b42bc",
  MDX: "#fcb32c",
};

export default function RepositoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Repositories</h1>
        <p className="text-sm text-muted-foreground">
          Monitored repositories and their health status
        </p>
      </div>

      <div className="grid gap-4">
        {repositories.map((repo) => (
          <Link key={repo.id} href={`/repositories/${repo.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-base font-semibold">{repo.name}</h3>
                      {repo.isPrivate && (
                        <Badge variant="outline" className="text-xs">
                          Private
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {repo.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              languageColors[repo.language] || "#6b7280",
                          }}
                        />
                        {repo.language}
                      </div>
                      <div className="flex items-center gap-1">
                        <GitPullRequest className="h-3 w-3" />
                        {repo.openPRs} open PRs
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {repo.securityIssues} security issues
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {repo.lastCommit}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        repo.health === "good"
                          ? "bg-green-500"
                          : "bg-yellow-500"
                      }`}
                    />
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
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
