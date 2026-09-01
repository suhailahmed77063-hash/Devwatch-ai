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
  Link2,
  GitBranch,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Settings,
  Plus,
  Webhook,
} from "lucide-react";

const integrations = [
  {
    id: "github",
    name: "GitHub",
    description: "Connect GitHub repositories for monitoring",
    icon: GitBranch,
    status: "connected",
    config: {
      organization: "acme-corp",
      repositories: 5,
      webhookActive: true,
      lastSync: "2 minutes ago",
    },
  },
  {
    id: "webhook",
    name: "GitHub Webhooks",
    description: "Real-time event processing from GitHub",
    icon: Webhook,
    status: "active",
    config: {
      endpoint: "/api/webhooks/github",
      events: ["push", "pull_request", "pull_request_review", "check_run", "security_alert"],
      lastEvent: "5 minutes ago",
      totalEvents: 1247,
    },
  },
  {
    id: "ci-cd",
    name: "CI/CD Monitoring",
    description: "Monitor GitHub Actions and CI/CD pipelines",
    icon: RefreshCw,
    status: "active",
    config: {
      successRate: "87%",
      totalRuns: 156,
      failedRuns: 2,
      lastRun: "1 hour ago",
    },
  },
];

const availableIntegrations = [
  {
    id: "slack",
    name: "Slack",
    description: "Send alerts and reports to Slack channels",
    status: "available",
  },
  {
    id: "jira",
    name: "Jira",
    description: "Sync issues and track project progress",
    status: "available",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Track issues and project status",
    status: "available",
  },
  {
    id: "sonarcloud",
    name: "SonarCloud",
    description: "Code quality and security analysis",
    status: "available",
  },
  {
    id: "snyk",
    name: "Snyk",
    description: "Vulnerability scanning and monitoring",
    status: "available",
  },
];

const recentWebhookEvents = [
  { type: "push", repo: "acme-platform", message: "3 commits pushed to main", time: "5 min ago", status: "processed" },
  { type: "pull_request", repo: "acme-api", message: "PR #103 opened: Migrate API to GraphQL", time: "3 hours ago", status: "processed" },
  { type: "check_run", repo: "acme-platform", message: "CI Pipeline #103 passed", time: "4 hours ago", status: "processed" },
  { type: "pull_request_review", repo: "acme-mobile", message: "Review submitted on PR #105", time: "6 hours ago", status: "processed" },
  { type: "push", repo: "acme-infra", message: "2 commits pushed to main", time: "1 day ago", status: "processed" },
  { type: "security_alert", repo: "acme-platform", message: "New security alert detected", time: "1 day ago", status: "processed" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "connected":
    case "active":
    case "processed":
      return (
        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
          <CheckCircle className="mr-1 h-3 w-3" />
          {status}
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Error
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Manage connected services and webhook configuration
        </p>
      </div>

      {/* Active Integrations */}
      <div className="space-y-4">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <integration.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{integration.name}</h3>
                      {getStatusBadge(integration.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(integration.config).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">
                      {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </p>
                    <p className="text-xs font-medium">
                      {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
          <div className="space-y-2">
            {recentWebhookEvents.map((event, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-24 justify-center text-[10px]">
                    {event.type}
                  </Badge>
                  <div>
                    <p className="text-sm">{event.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.repo} • {event.time}
                    </p>
                  </div>
                </div>
                {getStatusBadge(event.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
          <CardDescription>Add more services to DevWatch AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableIntegrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.description}</p>
                </div>
                <button className="flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/80">
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
