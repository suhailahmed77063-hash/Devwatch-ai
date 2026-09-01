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
  GitBranch,
  CheckCircle,
  Webhook,
  RefreshCw,
  Settings,
  Plus,
  ExternalLink,
} from "lucide-react";

interface Repo {
  id: string;
  name: string;
  fullName: string;
  isActive: boolean | null;
  lastSyncedAt: Date | null;
}

interface WebhookEvent {
  id: string;
  eventType: string;
  processed: boolean | null;
  createdAt: Date | null;
}

interface Integration {
  id: string;
  type: string;
  name: string;
  isActive: boolean | null;
}

function formatTime(date: Date | null) {
  if (!date) return "Never";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

export default function IntegrationsClient({
  repos,
  webhookEventCount,
  recentEvents,
  ciRate,
  ciTotal,
  integrations,
}: {
  repos: Repo[];
  webhookEventCount: number;
  recentEvents: WebhookEvent[];
  ciRate: number;
  ciTotal: number;
  integrations: Integration[];
}) {
  const hasGitHub = repos.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Manage connected services and webhook configuration
        </p>
      </div>

      {/* GitHub Integration */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <GitBranch className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">GitHub</h3>
                  {hasGitHub ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                      <CheckCircle className="mr-1 h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not Connected</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Connect GitHub repositories for monitoring</p>
              </div>
            </div>
            <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Configure <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[10px] text-muted-foreground">repositories</p>
              <p className="text-xs font-medium">{repos.length}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[10px] text-muted-foreground">webhook active</p>
              <p className="text-xs font-medium">{hasGitHub ? "Yes" : "No"}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[10px] text-muted-foreground">total events</p>
              <p className="text-xs font-medium">{webhookEventCount}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[10px] text-muted-foreground">CI success rate</p>
              <p className="text-xs font-medium">{ciRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to Connect */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🔗 How to Connect GitHub</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
              <div>
                <p className="font-medium">Create a GitHub Personal Access Token</p>
                <p className="text-muted-foreground">Go to GitHub → Settings → Developer settings → Personal access tokens → Generate new token</p>
                <p className="text-muted-foreground">Select scopes: <code className="bg-muted px-1 rounded text-xs">repo</code>, <code className="bg-muted px-1 rounded text-xs">read:org</code>, <code className="bg-muted px-1 rounded text-xs">admin:repo_hook</code></p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
              <div>
                <p className="font-medium">Add repositories</p>
                <p className="text-muted-foreground">Use the GitHub API or webhook to add repositories to your organization</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
              <div>
                <p className="font-medium">Set up Webhooks</p>
                <p className="text-muted-foreground">In each repo → Settings → Webhooks → Add webhook</p>
                <p className="text-muted-foreground">Payload URL: <code className="bg-muted px-1 rounded text-xs">https://your-app.vercel.app/api/webhooks/github</code></p>
                <p className="text-muted-foreground">Content type: <code className="bg-muted px-1 rounded text-xs">application/json</code></p>
                <p className="text-muted-foreground">Secret: Use your <code className="bg-muted px-1 rounded text-xs">GITHUB_WEBHOOK_SECRET</code></p>
                <p className="text-muted-foreground">Events: Select <code className="bg-muted px-1 rounded text-xs">Push, Pull request, Pull request review, Check run</code></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Webhook Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Recent Webhook Events
          </CardTitle>
          <CardDescription>Latest events received from GitHub</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No webhook events received yet. Set up webhooks in your GitHub repositories.</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-lg border p-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-28 justify-center text-[10px]">
                      {event.eventType}
                    </Badge>
                    <div>
                      <p className="text-xs text-muted-foreground">{formatTime(event.createdAt)}</p>
                    </div>
                  </div>
                  <Badge variant={event.processed ? "secondary" : "outline"}>
                    {event.processed ? "Processed" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
