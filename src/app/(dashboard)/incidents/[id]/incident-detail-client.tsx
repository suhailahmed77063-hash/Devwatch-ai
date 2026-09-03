"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Shield,
  GitPullRequest,
  GitCommit,
  Rocket,
  MessageSquare,
  Map,
  FileText,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  errorMessage: string | null;
  stackTrace: string | null;
  errorRate: string | null;
  affectedServices: string[] | null;
  affectedApis: string[] | null;
  detectedAt: string;
  acknowledgedAt: string | null;
  identifiedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  eventType: string;
  title: string;
  description: string | null;
  source: string;
}

interface RootCause {
  id: string;
  rootCauseType: string;
  confidence: number;
  description: string;
  evidence: string[];
  relatedPrId: string | null;
  relatedDeploymentId: string | null;
  isConfirmed: boolean;
}

interface BlastRadiusItem {
  id: string;
  entityType: string;
  entityName: string;
  impactLevel: string;
  description: string | null;
}

const severityColors: Record<string, string> = {
  sev1: "bg-red-500/10 text-red-500 border-red-500/20",
  sev2: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  sev3: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  sev4: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  sev5: "bg-green-500/10 text-green-500 border-green-500/20",
};

const impactColors: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10",
  high: "text-orange-500 bg-orange-500/10",
  medium: "text-yellow-500 bg-yellow-500/10",
  low: "text-green-500 bg-green-500/10",
};

const impactEmoji: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

const typeIcons: Record<string, string> = {
  incident_detected: "🚨",
  status_change: "🔄",
  status_change_acknowledged: "👀",
  status_change_investigating: "🔍",
  status_change_identified: "🎯",
  status_change_monitoring: "📡",
  status_change_resolved: "✅",
  status_change_closed: "🏁",
  rca_candidate: "🤖",
  deployment_linked: "🚀",
  evidence_found: "📎",
};

export function IncidentDetailClient({ params }: Props) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; message: string }[]>([]);
  const [expandedRca, setExpandedRca] = useState<string | null>(null);

  useEffect(() => {
    fetchIncident();
  }, [id]);

  async function fetchIncident() {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      const d = await res.json();
      setData(d);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: string) {
    await fetch(`/api/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchIncident();
  }

  async function investigate() {
    setInvestigating(true);
    setChatHistory([{ role: "user", message: "What caused this incident? Analyze recent changes, deployments, and PRs." }]);
    try {
      const res = await fetch(`/api/incidents/${id}/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "What caused this incident? Analyze recent changes, deployments, and PRs." }),
      });
      const d = await res.json();
      setChatHistory((prev) => [...prev, { role: "assistant", message: d.response || "Analysis complete." }]);
    } catch {
      setChatHistory((prev) => [...prev, { role: "assistant", message: "Failed to run investigation." }]);
    } finally {
      setInvestigating(false);
    }
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", message: msg }]);
    try {
      const res = await fetch(`/api/incidents/${id}/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const d = await res.json();
      setChatHistory((prev) => [...prev, { role: "assistant", message: d.response || "No response." }]);
    } catch {
      setChatHistory((prev) => [...prev, { role: "assistant", message: "Failed to get response." }]);
    }
  }

  function getDuration() {
    if (!data?.incident) return "—";
    const inc = data.incident;
    const start = new Date(inc.detectedAt);
    const end = inc.resolvedAt ? new Date(inc.resolvedAt) : new Date();
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

  if (!data?.incident) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Incident not found</h2>
        <Link href="/incidents" className="mt-4 inline-flex items-center text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Incidents
        </Link>
      </div>
    );
  }

  const inc = data.incident;
  const timeline: TimelineEvent[] = data.timeline || [];
  const rootCauses: RootCause[] = data.rootCauses || [];
  const blast: BlastRadiusItem[] = data.blastRadius || [];
  const relatedPRs = data.relatedPRs || [];
  const relatedDeployments = data.relatedDeployments || [];
  const similarIncidents = data.similarIncidents || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/incidents" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Incidents
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${severityColors[inc.severity]}`}>
              {inc.severity.toUpperCase()}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              inc.status === "resolved" || inc.status === "closed" ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
            }`}>
              {inc.status}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{inc.title}</h1>
          {inc.description && <p className="text-muted-foreground mt-1">{inc.description}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={investigate} disabled={investigating}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Zap className="h-4 w-4" />
            {investigating ? "Analyzing..." : "Investigate with AI"}
          </button>
          <Link href={`/incidents/${id}/investigation`}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
            <MessageSquare className="h-4 w-4" />
            Investigation Chat
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Duration</div>
          <p className="text-lg font-bold mt-1">{getDuration()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Error Rate</div>
          <p className="text-lg font-bold mt-1 text-red-500">{inc.errorRate || "—"}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Affected Services</div>
          <p className="text-lg font-bold mt-1">{inc.affectedServices?.length || 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Root Cause Candidates</div>
          <p className="text-lg font-bold mt-1">{rootCauses.length}</p>
        </div>
      </div>

      {/* Status Actions */}
      {inc.status !== "resolved" && inc.status !== "closed" && (
        <div className="flex gap-2 flex-wrap">
          {inc.status === "detected" && (
            <button onClick={() => updateStatus("investigating")} className="rounded-lg bg-orange-500/10 text-orange-500 px-3 py-1.5 text-sm font-medium hover:bg-orange-500/20">
              Start Investigation
            </button>
          )}
          {inc.status === "investigating" && (
            <button onClick={() => updateStatus("identified")} className="rounded-lg bg-yellow-500/10 text-yellow-500 px-3 py-1.5 text-sm font-medium hover:bg-yellow-500/20">
              Root Cause Identified
            </button>
          )}
          {inc.status === "identified" && (
            <button onClick={() => updateStatus("monitoring")} className="rounded-lg bg-blue-500/10 text-blue-500 px-3 py-1.5 text-sm font-medium hover:bg-blue-500/20">
              Monitoring Fix
            </button>
          )}
          <button onClick={() => updateStatus("resolved")} className="rounded-lg bg-green-500/10 text-green-500 px-3 py-1.5 text-sm font-medium hover:bg-green-500/20">
            Mark Resolved
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Timeline
            </h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timeline events yet.</p>
            ) : (
              <div className="space-y-0 relative ml-3">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                {timeline.map((event, i) => (
                  <div key={event.id} className="relative pl-6 pb-4">
                    <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                      event.source === "ai" ? "bg-primary border-primary" : "bg-background border-border"
                    }`} />
                    <div className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</div>
                    <div className="text-sm font-medium mt-0.5">
                      {typeIcons[event.eventType] || "📌"} {event.title}
                    </div>
                    {event.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{event.description}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Root Cause Analysis */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Root Cause Analysis
            </h2>
            {rootCauses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No root causes identified yet. Click "Investigate with AI" to analyze.</p>
            ) : (
              <div className="space-y-3">
                {rootCauses.map((rca) => (
                  <div key={rca.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`text-sm font-bold ${
                          rca.confidence > 70 ? "text-red-500" : rca.confidence > 40 ? "text-orange-500" : "text-yellow-500"
                        }`}>
                          {rca.confidence}%
                        </div>
                        <div>
                          <div className="text-sm font-medium">{rca.description}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {rca.rootCauseType === "pull_request_change" ? "PR Change" : rca.rootCauseType === "deployment_change" ? "Deployment" : rca.rootCauseType}
                            {rca.isConfirmed && <span className="ml-2 text-green-500">✓ Confirmed</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedRca(expandedRca === rca.id ? null : rca.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {expandedRca === rca.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>
                    {expandedRca === rca.id && rca.evidence && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Evidence:</div>
                        <ul className="text-sm space-y-1">
                          {(rca.evidence as string[]).map((e, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                              {e}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Label: {rca.confidence > 70 ? "Likely Cause" : rca.confidence > 40 ? "Possible Cause" : "Low-confidence Candidate"}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Details */}
          {(inc.errorMessage || inc.stackTrace) && (
            <div className="rounded-xl border bg-card p-5">
              <h2 className="text-base font-semibold mb-4">Error Details</h2>
              {inc.errorMessage && (
                <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3 text-sm font-mono text-red-500">
                  {inc.errorMessage}
                </div>
              )}
              {inc.stackTrace && (
                <pre className="mt-3 rounded-lg bg-muted p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                  {inc.stackTrace}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Blast Radius */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Map className="h-4 w-4" /> Blast Radius
            </h2>
            {blast.length === 0 ? (
              <p className="text-sm text-muted-foreground">Blast radius not calculated.</p>
            ) : (
              <div className="space-y-2">
                {blast.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{b.entityName}</div>
                      <div className="text-xs text-muted-foreground">{b.entityType}</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${impactColors[b.impactLevel] || "text-gray-500 bg-gray-100"}`}>
                      {impactEmoji[b.impactLevel] || "⚪"} {b.impactLevel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related PRs */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <GitPullRequest className="h-4 w-4" /> Related PRs
            </h2>
            {relatedPRs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No related PRs found.</p>
            ) : (
              <div className="space-y-2">
                {relatedPRs.map((pr: any) => (
                  <Link key={pr.id} href={`/pull-requests/${pr.id}`}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 hover:bg-muted transition-colors">
                    <GitPullRequest className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">PR #{pr.number}</div>
                      <div className="text-xs text-muted-foreground truncate">{pr.title}</div>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Related Deployments */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Rocket className="h-4 w-4" /> Related Deployments
            </h2>
            {relatedDeployments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No related deployments.</p>
            ) : (
              <div className="space-y-2">
                {relatedDeployments.map((dep: any) => (
                  <div key={dep.id} className="rounded-lg bg-muted/50 px-3 py-2">
                    <div className="text-sm font-medium">{dep.version || "Unknown version"}</div>
                    <div className="text-xs text-muted-foreground">{dep.environment} — {dep.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Similar Incidents */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Similar Incidents
            </h2>
            {similarIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No similar incidents found.</p>
            ) : (
              <div className="space-y-2">
                {similarIncidents.map((si: any) => (
                  <Link key={si.id} href={`/incidents/${si.id}`}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 hover:bg-muted transition-colors">
                    <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{si.title}</div>
                      <div className="text-xs text-muted-foreground">{si.severity} — {new Date(si.detectedAt).toLocaleDateString()}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Investigation Chat */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Quick Chat
            </h2>
            {chatHistory.length > 0 && (
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`rounded-lg p-2 text-sm ${msg.role === "user" ? "bg-primary/10 ml-4" : "bg-muted mr-4"}`}>
                    <div className="text-xs font-medium mb-0.5 text-muted-foreground">{msg.role === "user" ? "You" : "AI"}</div>
                    <div className="whitespace-pre-wrap">{msg.message}</div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={sendChat} className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about this incident..."
                className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm"
              />
              <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Ask
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
