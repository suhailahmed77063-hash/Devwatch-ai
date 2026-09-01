"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  GitBranch,
  GitPullRequest,
  Shield,
  ExternalLink,
} from "lucide-react";

interface Repo {
  id: string;
  name: string;
  fullName: string | null;
  description: string | null;
  isPrivate: boolean | null;
  openPRs: number;
  securityIssues: number;
  updatedAt: Date | null;
}

export default function ReposClient({ repositories }: { repositories: Repo[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Repositories</h1>
        <p className="text-sm text-muted-foreground">
          Monitored repositories and their health status
        </p>
      </div>

      {repositories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No repositories connected yet. Add your GitHub repositories to start monitoring.</p>
          </CardContent>
        </Card>
      ) : (
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
                          <Badge variant="outline" className="text-xs">Private</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {repo.description || "No description"}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
  
                        <div className="flex items-center gap-1">
                          <GitPullRequest className="h-3 w-3" />
                          {repo.openPRs} open PRs
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {repo.securityIssues} security issues
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
