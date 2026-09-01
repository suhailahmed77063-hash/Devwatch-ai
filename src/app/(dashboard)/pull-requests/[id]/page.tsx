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
  ArrowLeft,
  GitPullRequest,
  GitMerge,
  CheckCircle,
  AlertTriangle,
  Shield,
  FileCode,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const pr = {
  number: 103,
  title: "Migrate API to GraphQL",
  body: "This PR migrates the REST API to GraphQL, including schema design, resolver implementation, and basic query optimization. This is a major architectural change that affects multiple services.",
  author: "Marcus Johnson",
  repo: "acme-api",
  state: "open",
  branch: "feat/api",
  baseBranch: "main",
  additions: 456,
  deletions: 123,
  changedFiles: 12,
  riskScore: 72,
  ciStatus: "success",
  createdAt: "3 days ago",
  updatedAt: "2 hours ago",
};

const filesChanged = [
  { name: "src/graphql/schema.ts", additions: 156, deletions: 0, status: "added" },
  { name: "src/graphql/resolver.ts", additions: 189, deletions: 0, status: "added" },
  { name: "src/graphql/types.ts", additions: 78, deletions: 0, status: "added" },
  { name: "src/api/routes.ts", additions: 0, deletions: 89, status: "removed" },
  { name: "src/api/controllers/user.ts", additions: 0, deletions: 34, status: "removed" },
  { name: "package.json", additions: 8, deletions: 5, status: "modified" },
  { name: "tsconfig.json", additions: 3, deletions: 0, status: "modified" },
  { name: "src/middleware/auth.ts", additions: 12, deletions: 18, status: "modified" },
  { name: "tests/graphql/schema.test.ts", additions: 62, deletions: 0, status: "added" },
  { name: "tests/graphql/resolver.test.ts", appointments: 89, additions: 89, deletions: 0, status: "added" },
  { name: ".env.example", additions: 4, deletions: 2, status: "modified" },
  { name: "README.md", additions: 23, deletions: 15, status: "modified" },
];

const aiFindings = [
  {
    type: "security",
    severity: "high",
    file: "src/graphql/resolver.ts",
    line: 42,
    rule: "sql-injection",
    message: "Potential SQL injection in user resolver",
    explanation: "User input from GraphQL arguments is passed directly to the database query builder without sanitization.",
    suggestedFix: "Use parameterized queries or the ORM's built-in query builder to prevent injection.",
    confidence: 80,
  },
  {
    type: "security",
    severity: "medium",
    file: "src/graphql/schema.ts",
    line: 15,
    rule: "complex-schema",
    message: "Schema definition exceeds recommended complexity",
    explanation: "Large monolithic schema files are harder to maintain and review. Consider splitting into modular type definitions.",
    suggestedFix: "Split the schema into separate type definition files per domain.",
    confidence: 85,
  },
  {
    type: "code_quality",
    severity: "medium",
    file: "src/middleware/auth.ts",
    line: 28,
    rule: "breaking-change",
    message: "Authentication middleware changed without backward compatibility",
    explanation: "The auth middleware now requires a different token format, which may break existing clients.",
    suggestedFix: "Add a migration path or version the API to maintain backward compatibility.",
    confidence: 75,
  },
  {
    type: "code_quality",
    severity: "low",
    file: ".env.example",
    line: 3,
    rule: "hardcoded-value",
    message: "Environment variable placeholder looks like a real secret",
    explanation: "The GraphQL Playground URL includes what appears to be a real API endpoint.",
    suggestedFix: "Use clearly placeholder values like 'your-api-key-here'.",
    confidence: 70,
  },
];

const reviews = [
  {
    author: "Sarah Chen",
    state: "APPROVED",
    body: "Looks good overall. Just one concern about the auth middleware changes.",
    submittedAt: "1 day ago",
  },
  {
    author: "Jordan Kim",
    state: "CHANGES_REQUESTED",
    body: "Please address the SQL injection concern in the resolver before merging.",
    submittedAt: "12 hours ago",
  },
];

const securityFindings = [
  {
    severity: "high",
    category: "sast",
    description: "Potential SQL injection via unsanitized GraphQL arguments",
    file: "src/graphql/resolver.ts",
    line: 42,
    cweId: "CWE-89",
  },
];

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

export default function PRDetailPage() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    files: true,
    aiAnalysis: true,
    security: true,
    reviews: true,
  });

  const toggle = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6">
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
              <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                <GitPullRequest className="mr-1 h-3 w-3" />
                Open
              </Badge>
              <span className="text-sm font-semibold">#{pr.number}</span>
            </div>
            <h1 className="mt-1 font-heading text-2xl font-bold">{pr.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{pr.body}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 ${getRiskColor(pr.riskScore)}`}>
              <div className="text-center">
                <span className="text-lg font-bold text-white">{pr.riskScore}</span>
                <p className="text-[10px] text-white/80">RISK</p>
              </div>
            </div>
            <Badge variant={pr.riskScore > 60 ? "destructive" : "secondary"}>
              {pr.riskScore > 80
                ? "🔴 Critical"
                : pr.riskScore > 60
                ? "🟠 High"
                : pr.riskScore > 30
                ? "🟡 Medium"
                : "🟢 Low"} Risk
            </Badge>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {pr.author}</span>
          <span>{pr.repo}</span>
          <span>{pr.branch} → {pr.baseBranch}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {pr.createdAt}</span>
          <span className="text-green-500">+{pr.additions}</span>
          <span className="text-red-500">-{pr.deletions}</span>
          <span>{pr.changedFiles} files changed</span>
        </div>
      </div>

      {/* CI Status */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">CI Pipeline</p>
                <p className="text-xs text-muted-foreground">All checks passed</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-500/10 text-green-500">
              Success
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Files Changed */}
      <Card>
        <button
          onClick={() => toggle("files")}
          className="flex w-full items-center gap-2 p-4 text-left"
        >
          {expandedSections.files ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <FileCode className="h-4 w-4" />
          <CardTitle className="text-base">Files Changed ({filesChanged.length})</CardTitle>
        </button>
        {expandedSections.files && (
          <CardContent className="pt-0">
            <div className="space-y-1">
              {filesChanged.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between rounded-lg border p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        file.status === "added"
                          ? "bg-green-500"
                          : file.status === "removed"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    />
                    <code className="text-xs">{file.name}</code>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-green-500">+{file.additions}</span>
                    <span className="text-red-500">-{file.deletions}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* AI Analysis */}
      <Card>
        <button
          onClick={() => toggle("aiAnalysis")}
          className="flex w-full items-center gap-2 p-4 text-left"
        >
          {expandedSections.aiAnalysis ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Brain className="h-4 w-4 text-purple-500" />
          <CardTitle className="text-base">AI Code Analysis ({aiFindings.length} findings)</CardTitle>
        </button>
        {expandedSections.aiAnalysis && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              {aiFindings.map((finding, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-4 ${getSeverityColor(finding.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {finding.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {finding.type}
                        </Badge>
                        <code className="text-xs opacity-70">{finding.rule}</code>
                      </div>
                      <p className="text-sm font-medium">{finding.message}</p>
                      <p className="text-xs opacity-80">{finding.explanation}</p>
                      <div className="mt-2 rounded-md bg-background/50 p-2">
                        <p className="text-xs font-medium">Suggested Fix:</p>
                        <p className="text-xs opacity-80">{finding.suggestedFix}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs opacity-60">
                        <span>
                          {finding.file}:{finding.line}
                        </span>
                        <span>•</span>
                        <span>Confidence: {finding.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Security Findings */}
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
            {securityFindings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No security findings detected.</p>
            ) : (
              <div className="space-y-3">
                {securityFindings.map((finding, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-red-500/20 bg-red-500/5 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {finding.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {finding.category}
                          </Badge>
                          <code className="text-xs opacity-70">{finding.cweId}</code>
                        </div>
                        <p className="text-sm font-medium">{finding.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {finding.file}:{finding.line}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Reviews */}
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
              {reviews.map((review, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{review.author}</span>
                      <Badge
                        variant={
                          review.state === "APPROVED" ? "secondary" : "destructive"
                        }
                      >
                        {review.state === "APPROVED" ? "✓ Approved" : "✕ Changes Requested"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{review.submittedAt}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
