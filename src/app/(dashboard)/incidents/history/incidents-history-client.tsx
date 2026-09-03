"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, ExternalLink } from "lucide-react";

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  detectedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  affectedServices: string[] | null;
}

export function IncidentsHistoryClient() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/incidents")
      .then((r) => r.json())
      .then((d) => {
        const resolved = (d.incidents || []).filter((i: Incident) =>
          ["resolved", "closed"].includes(i.status)
        );
        setIncidents(resolved);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getDuration(detectedAt: string, resolvedAt: string | null) {
    const start = new Date(detectedAt);
    const end = resolvedAt ? new Date(resolvedAt) : new Date();
    const mins = Math.floor((end.getTime() - start.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${Math.floor(mins / 1440)}d`;
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
      <div>
        <Link href="/incidents" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Incidents
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Incident History</h1>
        <p className="text-muted-foreground">Previously resolved and closed incidents</p>
      </div>

      {incidents.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold">No resolved incidents</h3>
          <p className="text-muted-foreground mt-1">All clear — no incidents have been resolved yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Incident</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Detected</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Services</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {incidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/incidents/${inc.id}`} className="text-sm font-medium hover:text-primary flex items-center gap-1">
                      {inc.title}
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      inc.severity === "sev1" ? "bg-red-500/10 text-red-500" :
                      inc.severity === "sev2" ? "bg-orange-500/10 text-orange-500" :
                      "bg-yellow-500/10 text-yellow-500"
                    }`}>
                      {inc.severity?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      inc.status === "resolved" ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"
                    }`}>
                      {inc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(inc.detectedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <Clock className="inline h-3 w-3 mr-1" />
                    {getDuration(inc.detectedAt, inc.resolvedAt || inc.closedAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {inc.affectedServices?.join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
