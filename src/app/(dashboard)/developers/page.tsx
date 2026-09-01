"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  GitCommit,
  GitPullRequest,
  Eye,
  CheckCircle,
  AlertTriangle,
  Activity,
} from "lucide-react";

const developers = [
  {
    id: "1",
    name: "Sarah Chen",
    githubUsername: "sarah-chen",
    avatarUrl: "https://avatars.githubusercontent.com/u/1",
    commits: 12,
    pullRequests: 3,
    reviews: 5,
    prMergeRate: 85,
    ciFailures: 0,
    securityFindings: 0,
    isActive: true,
    recentActivity: "2 hours ago",
  },
  {
    id: "2",
    name: "Marcus Johnson",
    githubUsername: "marcus-johnson",
    avatarUrl: "https://avatars.githubusercontent.com/u/2",
    commits: 8,
    pullRequests: 2,
    reviews: 4,
    prMergeRate: 80,
    ciFailures: 1,
    securityFindings: 1,
    isActive: true,
    recentActivity: "5 hours ago",
  },
  {
    id: "3",
    name: "Priya Patel",
    githubUsername: "priya-patel",
    avatarUrl: "https://avatars.githubusercontent.com/u/3",
    commits: 6,
    pullRequests: 2,
    reviews: 3,
    prMergeRate: 100,
    ciFailures: 0,
    securityFindings: 0,
    isActive: true,
    recentActivity: "1 day ago",
  },
  {
    id: "4",
    name: "Alex Rodriguez",
    githubUsername: "alex-rodriguez",
    avatarUrl: "https://avatars.githubusercontent.com/u/4",
    commits: 5,
    pullRequests: 1,
    reviews: 2,
    prMergeRate: 75,
    ciFailures: 0,
    securityFindings: 0,
    isActive: true,
    recentActivity: "2 days ago",
  },
  {
    id: "5",
    name: "Jordan Kim",
    githubUsername: "jordan-kim",
    avatarUrl: "https://avatars.githubusercontent.com/u/5",
    commits: 4,
    pullRequests: 1,
    reviews: 3,
    prMergeRate: 90,
    ciFailures: 1,
    securityFindings: 0,
    isActive: true,
    recentActivity: "2 days ago",
  },
  {
    id: "6",
    name: "Emma Wilson",
    githubUsername: "emma-wilson",
    avatarUrl: "https://avatars.githubusercontent.com/u/6",
    commits: 3,
    pullRequests: 1,
    reviews: 2,
    prMergeRate: 88,
    ciFailures: 0,
    securityFindings: 0,
    isActive: true,
    recentActivity: "3 days ago",
  },
  {
    id: "7",
    name: "David Brown",
    githubUsername: "david-brown",
    avatarUrl: "https://avatars.githubusercontent.com/u/7",
    commits: 4,
    pullRequests: 0,
    reviews: 1,
    prMergeRate: 70,
    ciFailures: 0,
    securityFindings: 0,
    isActive: true,
    recentActivity: "4 days ago",
  },
  {
    id: "8",
    name: "Lisa Nguyen",
    githubUsername: "lisa-nguyen",
    avatarUrl: "https://avatars.githubusercontent.com/u/8",
    commits: 3,
    pullRequests: 1,
    reviews: 1,
    prMergeRate: 82,
    ciFailures: 0,
    securityFindings: 0,
    isActive: false,
    recentActivity: "5 days ago",
  },
];

export default function DevelopersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Developers</h1>
        <p className="text-sm text-muted-foreground">
          Engineering team activity and contribution metrics
        </p>
      </div>

      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-yellow-700 dark:text-yellow-400">
        ℹ️ <strong>Activity metrics are informational.</strong> These represent engineering activity, not performance or productivity judgments.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {developers.map((dev) => (
          <Link key={dev.id} href={`/developers/${dev.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {dev.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    {dev.isActive && (
                      <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-semibold">{dev.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      @{dev.githubUsername}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold">{dev.commits}</p>
                    <p className="text-[10px] text-muted-foreground">Commits</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{dev.pullRequests}</p>
                    <p className="text-[10px] text-muted-foreground">PRs</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{dev.reviews}</p>
                    <p className="text-[10px] text-muted-foreground">Reviews</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Merge rate: {dev.prMergeRate}%</span>
                  <span>{dev.recentActivity}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
