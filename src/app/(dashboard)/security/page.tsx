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
  Shield,
  AlertTriangle,
  Lock,
  Key,
  Bug,
  Eye,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const securityStats = [
  { severity: "Critical", count: 2, color: "#ef4444" },
  { severity: "High", count: 3, color: "#f97316" },
  { severity: "Medium", count: 3, color: "#eab308" },
  { severity: "Low", count: 1, color: "#3b82f6" },
  { severity: "Info", count: 1, color: "#6b7280" },
];

const findings = [
  {
    id: "1",
    severity: "critical",
    category: "secret_detection",
    title: "AWS Access Key Found in CI Configuration",
    description: "An active AWS access key was found hardcoded in the CI/CD configuration file for acme-platform.",
    file: "config/deploy.yml",
    line: 42,
    repo: "acme-platform",
    cwe: "CWE-798",
    recommendation: "Remove the AWS key from the repository and rotate it immediately. Store credentials in GitHub Secrets or a cloud secrets manager.",
    createdAt: "2 hours ago",
    isResolved: false,
  },
  {
    id: "2",
    severity: "high",
    category: "dependency",
    title: "Vulnerable lodash Version (CVE-2021-23337)",
    description: "The dependency lodash@4.17.19 has a known prototype pollution vulnerability.",
    file: "package.json",
    repo: "acme-api",
    cwe: "CWE-1321",
    recommendation: "Update lodash to version 4.17.21 or later.",
    createdAt: "1 day ago",
    isResolved: false,
  },
  {
    id: "3",
    severity: "high",
    category: "sast",
    title: "Authentication Bypass via Missing Session Validation",
    description: "Several API endpoints lack proper session token validation, allowing unauthenticated access.",
    file: "src/auth/login.ts",
    line: 71,
    repo: "acme-platform",
    cwe: "CWE-287",
    recommendation: "Add session token validation middleware to all protected routes.",
    createdAt: "1 day ago",
    isResolved: false,
  },
  {
    id: "4",
    severity: "high",
    category: "secret_detection",
    title: "Elasticsearch Credentials in Source Code",
    description: "Elasticsearch API key was found hardcoded in the search module configuration.",
    file: "src/search/index.ts",
    line: 55,
    repo: "acme-platform",
    cwe: "CWE-798",
    recommendation: "Move the API key to environment variables.",
    createdAt: "2 days ago",
    isResolved: false,
  },
  {
    id: "5",
    severity: "medium",
    category: "sast",
    title: "User Data Exposed in Error Responses",
    description: "Detailed error messages leak sensitive user information in API responses.",
    file: "src/api/users.ts",
    line: 34,
    repo: "acme-api",
    cwe: "CWE-200",
    recommendation: "Sanitize error messages to avoid leaking user data in production.",
    createdAt: "2 days ago",
    isResolved: false,
  },
  {
    id: "6",
    severity: "medium",
    category: "sast",
    title: "Unrestricted File Upload",
    description: "File upload endpoint does not validate file types, allowing potential malicious uploads.",
    file: "src/storage/FileHandler.ts",
    line: 28,
    repo: "acme-mobile",
    cwe: "CWE-434",
    recommendation: "Validate file types and implement size limits on uploads.",
    createdAt: "3 days ago",
    isResolved: false,
  },
  {
    id: "7",
    severity: "medium",
    category: "sast",
    title: "Notification Content Not Sanitized",
    description: "Push notification body is rendered without sanitization, potential for content injection.",
    file: "src/push/notify.ts",
    line: 28,
    repo: "acme-mobile",
    cwe: "CWE-79",
    recommendation: "Sanitize all user-generated content before rendering in notifications.",
    createdAt: "3 days ago",
    isResolved: false,
  },
  {
    id: "8",
    severity: "low",
    category: "configuration",
    title: "S3 Bucket Publicly Accessible",
    description: "Terraform configuration creates an S3 bucket with public access enabled.",
    file: "terraform/main.tf",
    repo: "acme-infra",
    cwe: "CWE-538",
    recommendation: "Set bucket ACL to private and enable server-side encryption.",
    createdAt: "5 days ago",
    isResolved: false,
  },
  {
    id: "9",
    severity: "informational",
    category: "best_practice",
    title: "Placeholder Secrets Look Real in .env.example",
    description: "The .env.example file contains placeholder values that look like real API keys.",
    file: ".env.example",
    repo: "acme-platform",
    cwe: "",
    recommendation: "Use clearly fake placeholder values (e.g., 'your-api-key-here').",
    createdAt: "1 week ago",
    isResolved: true,
  },
];

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge variant="destructive">🔴 Critical</Badge>;
    case "high":
      return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">🟠 High</Badge>;
    case "medium":
      return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">🟡 Medium</Badge>;
    case "low":
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">🔵 Low</Badge>;
    default:
      return <Badge variant="outline">ℹ️ Info</Badge>;
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "secret_detection": return <Key className="h-4 w-4" />;
    case "dependency": return <Bug className="h-4 w-4" />;
    case "sast": return <Eye className="h-4 w-4" />;
    case "configuration": return <Lock className="h-4 w-4" />;
    default: return <Shield className="h-4 w-4" />;
  }
}

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Security</h1>
        <p className="text-sm text-muted-foreground">
          Security findings and vulnerability overview
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {securityStats.map((stat) => (
          <Card key={stat.severity} size="sm">
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.severity}</p>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>
                    {stat.count}
                  </p>
                </div>
                <Shield className="h-5 w-5" style={{ color: stat.color }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Findings by Severity</CardTitle>
          <CardDescription>Distribution of security findings</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={securityStats}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="severity" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {securityStats.map((entry, index) => (
                  <rect key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Findings List */}
      <div className="space-y-3">
        {findings.map((finding) => (
          <Card key={finding.id} className={finding.isResolved ? "opacity-60" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(finding.severity)}
                    <Badge variant="outline" className="gap-1">
                      {getCategoryIcon(finding.category)}
                      {finding.category.replace("_", " ")}
                    </Badge>
                    {finding.cwe && (
                      <code className="text-xs text-muted-foreground">{finding.cwe}</code>
                    )}
                    {finding.isResolved && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-sm font-medium">{finding.title}</h3>
                  <p className="text-sm text-muted-foreground">{finding.description}</p>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-xs font-medium">Recommendation:</p>
                    <p className="text-xs text-muted-foreground">{finding.recommendation}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{finding.repo}</span>
                    {finding.file && (
                      <code className="rounded bg-muted px-1 py-0.5">
                        {finding.file}{finding.line ? `:${finding.line}` : ""}
                      </code>
                    )}
                    <span>{finding.createdAt}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
