"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, TrendingUp, Shield } from "lucide-react";

interface RootCause {
  id: string;
  incidentId: string;
  rootCauseType: string;
  confidence: number;
  description: string;
  evidence: string[];
  isConfirmed: boolean;
  createdAt: string;
}

interface IncidentInfo {
  id: string;
  title: string;
  severity: string;
  status: string;
}

export function RootCausesClient() {
  const [rootCauses, setRootCauses] = useState<(RootCause & { incident?: IncidentInfo })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const incRes = await fetch("/api/incidents");
      const incData = await incRes.json();
      const incidents = incData.incidents || [];

      const allRcas: (RootCause & { incident?: IncidentInfo })[] = [];
      for (const inc of incidents.slice(0, 10)) {
        try {
          const res = await fetch(`/api/incidents/${inc.id}`);
          const data = await res.json();
          if (data.rootCauses) {
            data.rootCauses.forEach((rca: RootCause) => {
              allRcas.push({ ...rca, incident: { id: inc.id, title: inc.title, severity: inc.severity, status: inc.status } });
            });
          }
        } catch { /* skip */ }
      }
      allRcas.sort((a, b) => b.confidence - a.confidence);
      setRootCauses(allRcas);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }

  const filtered = rootCauses.filter((rca) => {
    if (filter === "confirmed") return rca.isConfirmed;
    if (filter === "high") return rca.confidence >= 70;
    if (filter === "medium") return rca.confidence >= 40 && rca.confidence < 70;
    if (filter === "low") return rca.confidence < 40;
    return true;
  });

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
          <Shield className="h-6 w-6" /> Root Cause Analysis
        </h1>
        <p className="text-muted-foreground">All AI-generated root cause findings across incidents</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Findings</p>
          <p className="text-2xl font-bold">{rootCauses.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">High Confidence (≥70%)</p>
          <p className="text-2xl font-bold text-red-500">{rootCauses.filter((r) => r.confidence >= 70).length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Confirmed</p>
          <p className="text-2xl font-bold text-green-500">{rootCauses.filter((r) => r.isConfirmed).length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">PR-Related</p>
          <p className="text-2xl font-bold text-blue-500">{rootCauses.filter((r) => r.rootCauseType === "pull_request_change").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "confirmed", "high", "medium", "low"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold mt-4">No root cause findings</h3>
          <p className="text-muted-foreground mt-1">Root causes are identified automatically when incidents are created.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rca) => (
            <div key={rca.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold ${
                      rca.confidence > 70 ? "text-red-500" : rca.confidence > 40 ? "text-orange-500" : "text-yellow-500"
                    }`}>
                      {rca.confidence}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {rca.rootCauseType === "pull_request_change" ? "PR Change" : "Deployment"}
                    </span>
                    {rca.isConfirmed && (
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Confirmed
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{rca.description}</p>
                  {rca.evidence && rca.evidence.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {(rca.evidence as string[]).slice(0, 3).map((e, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5">✓</span> {e}
                        </li>
                      ))}
                    </ul>
                  )}
                  {rca.incident && (
                    <div className="mt-2">
                      <Link href={`/incidents/${rca.incidentId}`}
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        {rca.incident.title} ({rca.incident.severity?.toUpperCase()})
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
