"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitBranch,
  GitPullRequest,
  GitCommit,
  Code2,
  Server,
  Database,
  Rocket,
  AlertTriangle,
  Users,
  ArrowRight,
  Network,
  Shield,
  Activity,
} from "lucide-react";

interface Entity {
  id: string;
  entityType: string;
  entityId: string | null;
  name: string;
  riskLevel: string | null;
  incidentCount: number | null;
  metadata: any;
  lastDeployedAt: string | null;
  createdAt: string;
}

const entityIcons: Record<string, any> = {
  repository: GitBranch,
  service: Server,
  api: Code2,
  database: Database,
  deployment: Rocket,
  incident: AlertTriangle,
  developer: Users,
  project: GitPullRequest,
};

const entityColors: Record<string, string> = {
  repository: "border-blue-500/30 bg-blue-500/5",
  service: "border-purple-500/30 bg-purple-500/5",
  api: "border-green-500/30 bg-green-500/5",
  database: "border-orange-500/30 bg-orange-500/5",
  deployment: "border-cyan-500/30 bg-cyan-500/5",
  incident: "border-red-500/30 bg-red-500/5",
  developer: "border-yellow-500/30 bg-yellow-500/5",
  project: "border-indigo-500/30 bg-indigo-500/5",
};

const riskColors: Record<string, string> = {
  critical: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-green-500",
};

// Static knowledge graph data for visual display
const graphNodes = [
  { type: "repository", label: "Repositories", icon: GitBranch, color: "bg-blue-500" },
  { type: "service", label: "Services", icon: Server, color: "bg-purple-500" },
  { type: "api", label: "APIs", icon: Code2, color: "bg-green-500" },
  { type: "database", label: "Database", icon: Database, color: "bg-orange-500" },
  { type: "deployment", label: "Deployments", icon: Rocket, color: "bg-cyan-500" },
  { type: "incident", label: "Incidents", icon: AlertTriangle, color: "bg-red-500" },
];

const graphEdges = [
  { from: 0, to: 1, label: "contains" },
  { from: 1, to: 2, label: "exposes" },
  { from: 1, to: 3, label: "queries" },
  { from: 4, to: 0, label: "deploys" },
  { from: 4, to: 5, label: "may cause" },
  { from: 2, to: 5, label: "errors in" },
  { from: 3, to: 5, label: "data issues" },
];

export function EngineeringMapClient() {
  const [repos, setRepos] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/repositories").then((r) => r.json()).catch(() => ({ repositories: [] })),
      fetch("/api/incidents").then((r) => r.json()).catch(() => ({ incidents: [] })),
    ]).then(([repoData, incData]) => {
      setRepos(repoData.repositories || []);
      setIncidents(incData.incidents || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Network className="h-6 w-6" /> Engineering Knowledge Map
        </h1>
        <p className="text-muted-foreground">Visualize relationships between repositories, services, APIs, deployments, and incidents</p>
      </div>

      {/* Knowledge Graph Visualization */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-base font-semibold mb-6">Architecture Overview</h2>
        <div className="relative min-h-[300px]">
          {/* Nodes */}
          <div className="flex flex-wrap justify-center gap-6">
            {graphNodes.map((node, i) => {
              const Icon = node.icon;
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-16 h-16 rounded-xl ${node.color} flex items-center justify-center text-white shadow-lg`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="text-sm font-medium">{node.label}</span>
                </div>
              );
            })}
          </div>
          {/* Edge Labels */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {graphEdges.map((edge, i) => (
              <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
                <span>{graphNodes[edge.from].label}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{graphNodes[edge.to].label}</span>
                <span className="text-primary font-medium ml-1">{edge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Entity Explorer */}
      <div className="flex gap-2 flex-wrap">
        {["all", "repository", "service", "api", "database", "deployment", "incident"].map((type) => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              activeFilter === type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}s
          </button>
        ))}
      </div>

      {/* Repository Nodes */}
      {(activeFilter === "all" || activeFilter === "repository") && repos.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-blue-500" /> Repositories ({repos.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {repos.map((repo) => (
              <Link
                key={repo.id}
                href={`/repositories/${repo.id}`}
                className={`rounded-xl border p-4 hover:shadow-md transition-all ${entityColors.repository}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">{repo.name}</span>
                </div>
                {repo.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{repo.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {repo.language && <span>{repo.language}</span>}
                  {repo.defaultBranch && <span>Branch: {repo.defaultBranch}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Incident Nodes */}
      {(activeFilter === "all" || activeFilter === "incident") && incidents.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" /> Incidents ({incidents.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {incidents.map((inc) => (
              <Link
                key={inc.id}
                href={`/incidents/${inc.id}`}
                className={`rounded-xl border p-4 hover:shadow-md transition-all ${entityColors.incident}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-medium text-red-500">{inc.severity?.toUpperCase()}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    inc.status === "resolved" ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                  }`}>
                    {inc.status}
                  </span>
                </div>
                <span className="font-medium text-sm">{inc.title}</span>
                {inc.affectedServices && inc.affectedServices.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {inc.affectedServices.slice(0, 3).map((s: string) => (
                      <span key={s} className="text-xs bg-muted rounded px-1.5 py-0.5">{s}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Engineering Health Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-500">{repos.length}</p>
            <p className="text-xs text-muted-foreground">Repositories</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">
              {incidents.filter((i) => ["resolved", "closed"].includes(i.status)).length}
            </p>
            <p className="text-xs text-muted-foreground">Resolved Incidents</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">
              {incidents.filter((i) => !["resolved", "closed"].includes(i.status)).length}
            </p>
            <p className="text-xs text-muted-foreground">Open Incidents</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">
              {incidents.filter((i) => i.severity === "sev1" && !["resolved", "closed"].includes(i.status)).length}
            </p>
            <p className="text-xs text-muted-foreground">Critical Open</p>
          </div>
        </div>
      </div>
    </div>
  );
}
