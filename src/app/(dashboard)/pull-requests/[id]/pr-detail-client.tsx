"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  GitPullRequest,
  CheckCircle,
  Shield,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  FileCode,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface PRData {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  branch: string | null;
  baseBranch: string | null;
  additions: number | null;
  deletions: number | null;
  changedFiles: number | null;
  riskScore: number | null;
  ciStatus: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  repoName: string;
  developerName: string;
}

interface Review {
  id: string;
  state: string;
  body: string | null;
  submittedAt: Date | null;
  developerId: string | null;
}

interface CodeIssue {
  id: string;
  type: string;
  severity: string;
  file: string | null;
  line: number | null;
  rule: string | null;
  message: string;
  explanation: string | null;
  suggestedFix: string | null;
  confidence: number | null;
}

interface SecFinding {
  id: string;
  severity: string;
  description: string;
  file: string | null;
  line: number | null;
  category: string | null;
  cweId: string | null;
}

function getRiskColor(score: number) {
  if (score <= 30) return "bg-green-500";
  if (score <= 60) return "bg-yellow-500";
  if (score <= 80) return "bg-orange-500";
  return "bg-red-500";
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "low": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
}

function timeAgo(date: Date | null) {
  if (!date) return "Unknown";
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  pr: PRData;
  reviews: Review[];
  codeFindings: CodeIssue[];
  securityFindings: SecFinding[];
}

export default function PRDetailClient({ pr, reviews, codeFindings, securityFindings }: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    aiAnalysis: true,
    security: true,
    reviews: true,
  });

  const toggle = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const riskScore = pr.riskScore || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/pull-requests"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Pull Requests
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={
                  pr.state === "merged"
                    ? "bg-purple-500/10 text-purple-500"
                    : pr.state === "open"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-gray-500/10 text-gray-500"
                }
              >
                <GitPullRequest className="mr-1 h-3 w-3" />
                {pr.state}
              </Badge>
              <span className="text-sm font-semibold">#{pr.number}</span>
            </div>
            <h1 className="mt-1 font-heading text-2xl font-bold">{pr.title}</h1>
            {pr.body && (
              <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{pr.body}</p>
            )}
          </div>
          {riskScore > 0 && (
            <div className="flex flex-col items-end gap-2">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 ${getRiskColor(riskScore)}`}>
                <div className="text-center">
                  <span className="text-lg font-bold text-white">{riskScore}</span>
                  <p className="text-[10px] text-white/80">RISK</p>
                </div>
              </div>
              <Badge variant={riskScore > 60 ? "destructive" : "secondary"}>
                {riskScore > 80 ? "🔴 Critical" : riskScore > 60 ? "🟠 High" : riskScore > 30 ? "🟡 Medium" : "🟢 Low"} Risk
              </Badge>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {pr.developerName}</span>
          <span>{pr.repoName}</span>
          {pr.branch && <span>{pr.branch} → {pr.baseBranch || "main"}</span>}
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(pr.createdAt)}</span>
          {pr.additions ? <span className="text-green-500">+{pr.additions}</span> : null}
          {pr.deletions ? <span className="text-red-500">-{pr.deletions}</span> : null}
          {pr.changedFiles ? <span>{pr.changedFiles} files changed</span> : null}
        </div>
      </div>

      {/* CI Status */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pr.ciStatus === "success" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : pr.ciStatus === "failure" ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <p className="text-sm font-medium">CI Pipeline</p>
                <p className="text-xs text-muted-foreground">
                  {pr.ciStatus === "success" ? "All checks passed" : pr.ciStatus === "failure" ? "Checks failed" : "Pending"}
                </p>
              </div>
            </div>
            <Badge variant={pr.ciStatus === "success" ? "secondary" : "destructive"}>
              {pr.ciStatus || "pending"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* AI Code Analysis */}
      {codeFindings.length > 0 && (
        <Card>
          <button
            onClick={() => toggle("aiAnalysis")}
            className="flex w-full items-center gap-2 p-4 text-left"
          >
            {expandedSections.aiAnalysis ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Brain className="h-4 w-4 text-purple-500" />
            <CardTitle className="text-base">AI Code Analysis ({codeFindings.length} findings)</CardTitle>
          </button>
          {expandedSections.aiAnalysis && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                {codeFindings.map((finding) => (
                  <div key={finding.id} className={`rounded-lg border p-4 ${getSeverityColor(finding.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{finding.severity}</Badge>
                          <Badge variant="outline" className="text-xs">{finding.type}</Badge>
                          {finding.rule && <code className="text-xs opacity-70">{finding.rule}</code>}
                        </div>
                        <p className="text-sm font-medium">{finding.message}</p>
                        {finding.explanation && <p className="text-xs opacity-80">{finding.explanation}</p>}
                        {finding.suggestedFix && (
                          <div className="mt-2 rounded-md bg-background/50 p-2">
                            <p className="text-xs font-medium">Suggested Fix:</p>
                            <p className="text-xs opacity-80">{finding.suggestedFix}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs opacity-60">
                          {finding.file && <span>{finding.file}:{finding.line}</span>}
                          {finding.confidence && <span>Confidence: {finding.confidence}%</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Security Findings */}
      {securityFindings.length > 0 && (
        <Card>
          <button
            onClick={() => toggle("security")}
            className="flex w-full items-center gap-2 p-4 text-left"
          >
            {expandedSections.security ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Shield className="h-4 w-4 text-red-500" />
            <CardTitle className="text-base">Security Findings ({securityFindings.length})</CardTitle>
          </button>
          {expandedSections.security && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                {securityFindings.map((f) => (
                  <div key={f.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">{f.severity}</Badge>
                      {f.category && <Badge variant="outline" className="text-xs">{f.category}</Badge>}
                      {f.cweId && <code className="text-xs opacity-70">{f.cweId}</code>}
                    </div>
                    <p className="text-sm font-medium mt-1">{f.description}</p>
                    {f.file && <p className="text-xs text-muted-foreground mt-1">{f.file}:{f.line}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <Card>
          <button
            onClick={() => toggle("reviews")}
            className="flex w-full items-center gap-2 p-4 text-left"
          >
            {expandedSections.reviews ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <CardTitle className="text-base">Reviews ({reviews.length})</CardTitle>
          </button>
          {expandedSections.reviews && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={review.state === "APPROVED" ? "secondary" : "destructive"}>
                          {review.state === "APPROVED" ? "✓ Approved" : review.state === "CHANGES_REQUESTED" ? "✕ Changes Requested" : review.state}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{timeAgo(review.submittedAt)}</span>
                    </div>
                    {review.body && <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
