"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink, Package, Shield } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const vulnerabilities = [
  {
    id: "1",
    package: "lodash",
    version: "4.17.19",
    patchedVersion: "4.17.21",
    severity: "high",
    title: "Prototype Pollution in lodash",
    description: "A prototype pollution vulnerability in lodash allows an attacker to modify Object.prototype.",
    cve: "CVE-2021-23337",
    advisory: "https://github.com/advisories/GHSA-35jh-r3h4-6jhm",
    repo: "acme-platform",
    isDirect: true,
    createdAt: "1 day ago",
  },
  {
    id: "2",
    package: "axios",
    version: "0.20.0",
    patchedVersion: "0.21.1",
    severity: "high",
    title: "Server-Side Request Forgery in axios",
    description: "A SSRF vulnerability was discovered in axios affecting all versions before 0.21.1.",
    cve: "CVE-2021-3749",
    advisory: "https://github.com/advisories/GHSA-4w2v-q235-vp99",
    repo: "acme-api",
    isDirect: true,
    createdAt: "2 days ago",
  },
  {
    id: "3",
    package: "express",
    version: "4.17.1",
    patchedVersion: "4.18.2",
    severity: "medium",
    title: "Open Redirect in Express",
    description: "Express is vulnerable to open redirect attacks via manipulated URLs.",
    cve: "CVE-2022-24999",
    advisory: "https://github.com/advisories/GHSA-rv95-896h-c2v1",
    repo: "acme-api",
    isDirect: true,
    createdAt: "3 days ago",
  },
  {
    id: "4",
    package: "react-native-fetch-blob",
    version: "0.10.8",
    patchedVersion: "0.10.9",
    severity: "high",
    title: "Path Traversal vulnerability",
    description: "react-native-fetch-blob is vulnerable to path traversal attacks.",
    cve: "CVE-2019-10780",
    advisory: "",
    repo: "acme-mobile",
    isDirect: true,
    createdAt: "5 days ago",
  },
  {
    id: "5",
    package: "terraform-aws-modules",
    version: "1.0.0",
    patchedVersion: "1.2.0",
    severity: "medium",
    title: "Insecure default S3 configuration",
    description: "Default S3 bucket configuration allows public access.",
    cve: "",
    advisory: "",
    repo: "acme-infra",
    isDirect: true,
    createdAt: "1 week ago",
  },
];

const vulnStats = [
  { name: "High", value: 3, color: "#f97316" },
  { name: "Medium", value: 2, color: "#eab308" },
];

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": return "destructive";
    case "high": return "destructive";
    case "medium": return "secondary";
    case "low": return "outline";
    default: return "outline";
  }
}

export default function VulnerabilitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Vulnerabilities</h1>
        <p className="text-sm text-muted-foreground">
          Known vulnerabilities in dependencies across repositories
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-8 w-8 text-orange-500" />
              <p className="mt-2 text-3xl font-bold">5</p>
              <p className="text-sm text-muted-foreground">Total Vulnerabilities</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={vulnStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vulnStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">High</span>
                <span className="font-medium text-orange-500">3</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Medium</span>
                <span className="font-medium text-yellow-500">2</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Patched Available</span>
                <span className="font-medium text-green-500">5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {vulnerabilities.map((vuln) => (
          <Card key={vuln.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(vuln.severity) as any}>
                      {vuln.severity}
                    </Badge>
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {vuln.package}@{vuln.version}
                    </span>
                    {vuln.cve && (
                      <code className="text-xs text-muted-foreground">{vuln.cve}</code>
                    )}
                  </div>
                  <h3 className="text-sm font-medium">{vuln.title}</h3>
                  <p className="text-sm text-muted-foreground">{vuln.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Repo: {vuln.repo}</span>
                    <span>Fixed in: {vuln.patchedVersion}</span>
                    <span>{vuln.createdAt}</span>
                  </div>
                </div>
                {vuln.advisory && (
                  <a
                    href={vuln.advisory}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Advisory <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
