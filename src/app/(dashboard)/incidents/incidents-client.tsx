"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Shield,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Activity,
  Zap,
} from "lucide-react";

interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  errorMessage: string | null;
  errorRate: string | null;
  affectedServices: string[] | null;
  affectedApis: string[] | null;
  detectedAt: string;
  resolvedAt: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  open: number;
  resolved: number;
  critical: number;
}

const severityColors: Record<string, string> = {
  sev1: "bg-red-500/10 text-red-500 border-red-500/20",
  sev2: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  sev3: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  sev4: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  sev5: "bg-green-500/10 text-green-500 border-green-500/20",
};

const severityLabels: Record<string, string> = {
  sev1: "SEV-1 Critical",
  sev2: "SEV-2 Major",
  sev3: "SEV-3 Moderate",
  sev4: "SEV-4 Minor",
  sev5: "SEV-5 Low",
};

const statusColors: Record<string, string> = {
  detected: "bg-red-500/10 text-red-500",
  investigating: "bg-orange-500/10 text-orange-500",
  identified: "bg-yellow-500/10 text-yellow-500",
  monitoring: "bg-blue-500/10 text-blue-500",
  resolved: "bg-green-500/10 text-green-500",
  closed: "bg-gray-500/10 text-gray-500",
};

const statusLabels: Record<string, string> = {
  detected: "Detected",
  investigating: "Investigating",
  identified: "Root Cause Identified",
  monitoring: "Monitoring Fix",
  resolved: "Resolved",
  closed: "Closed",
};

export function IncidentsClient() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, resolved: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  async function fetchIncidents() {
    try {
      const res = await fetch("/api/incidents");
      const data = await res.json();
      setIncidents(data.incidents || []);
      setStats(data.stats || { total: 0, open: 0, resolved: 0, critical: 0 });
    } catch {
      // empty state
    } finally {
      setLoading(false);
    }
  }

  async function createIncident(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        severity: form.get("severity"),
        errorMessage: form.get("errorMessage"),
      }),
    });
    if (res.ok) {
      setShowCreateModal(false);
      fetchIncidents();
    }
  }

  const filtered = incidents.filter((inc) => {
    const matchSearch = !search || inc.title.toLowerCase().includes(search.toLowerCase());
    const matchSev = severityFilter === "all" || inc.severity === severityFilter;
    const matchStatus = statusFilter === "all" || inc.status === statusFilter;
    return matchSearch && matchSev && matchStatus;
  });

  function getDuration(detectedAt: string, resolvedAt: string | null) {
    const start = new Date(detectedAt);
    const end = resolvedAt ? new Date(resolvedAt) : new Date();
    const mins = Math.floor((end.getTime() - start.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
          <p className="text-muted-foreground">Monitor, investigate, and resolve production incidents</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Report Incident
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <AlertTriangle className="h-4 w-4" />
            Total Incidents
          </div>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Activity className="h-4 w-4" />
            Open
          </div>
          <p className="text-2xl font-bold mt-1 text-orange-500">{stats.open}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Resolved
          </div>
          <p className="text-2xl font-bold mt-1 text-green-500">{stats.resolved}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Zap className="h-4 w-4" />
            Critical (SEV-1)
          </div>
          <p className="text-2xl font-bold mt-1 text-red-500">{stats.critical}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Severities</option>
          <option value="sev1">SEV-1 Critical</option>
          <option value="sev2">SEV-2 Major</option>
          <option value="sev3">SEV-3 Moderate</option>
          <option value="sev4">SEV-4 Minor</option>
          <option value="sev5">SEV-5 Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="detected">Detected</option>
          <option value="investigating">Investigating</option>
          <option value="identified">Identified</option>
          <option value="monitoring">Monitoring</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <Link
          href="/incidents/history"
          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Clock className="inline h-4 w-4 mr-1" />
          History
        </Link>
      </div>

      {/* Incident List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold">No incidents</h3>
          <p className="text-muted-foreground mt-1">No incidents match your filters. That&apos;s a good sign!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inc) => (
            <Link
              key={inc.id}
              href={`/incidents/${inc.id}`}
              className="group block rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${severityColors[inc.severity] || "bg-gray-100 text-gray-600"}`}>
                      {severityLabels[inc.severity] || inc.severity}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[inc.status] || "bg-gray-100 text-gray-600"}`}>
                      {statusLabels[inc.status] || inc.status}
                    </span>
                    {inc.errorRate && (
                      <span className="text-xs text-muted-foreground">Error Rate: {inc.errorRate}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                    {inc.title}
                  </h3>
                  {inc.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{inc.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Detected: {new Date(inc.detectedAt).toLocaleString()}</span>
                    <span>Duration: {getDuration(inc.detectedAt, inc.resolvedAt)}</span>
                    {inc.affectedServices && inc.affectedServices.length > 0 && (
                      <span>Services: {inc.affectedServices.slice(0, 3).join(", ")}{inc.affectedServices.length > 3 ? ` +${inc.affectedServices.length - 3}` : ""}</span>
                    )}
                    {inc.affectedApis && inc.affectedApis.length > 0 && (
                      <span>APIs: {inc.affectedApis.length} affected</span>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold mb-4">Report New Incident</h2>
            <form onSubmit={createIncident} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <input name="title" required className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm" placeholder="e.g., Payment API returning 500 errors" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea name="description" rows={3} className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm" placeholder="What's happening?" />
              </div>
              <div>
                <label className="text-sm font-medium">Severity</label>
                <select name="severity" className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm">
                  <option value="sev1">SEV-1 Critical</option>
                  <option value="sev2">SEV-2 Major</option>
                  <option value="sev3" selected>SEV-3 Moderate</option>
                  <option value="sev4">SEV-4 Minor</option>
                  <option value="sev5">SEV-5 Low</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Error Message</label>
                <input name="errorMessage" className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm" placeholder="e.g., TypeError: Cannot read property..." />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Create Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
