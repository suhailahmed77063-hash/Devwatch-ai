"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Key, Bug, Eye } from "lucide-react";

interface Finding {
  id: string;
  severity: string;
  category: string | null;
  description: string;
  file: string | null;
  line: number | null;
  recommendation: string | null;
  cweId: string | null;
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical": return <Badge variant="destructive">🔴 Critical</Badge>;
    case "high": return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">🟠 High</Badge>;
    case "medium": return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">🟡 Medium</Badge>;
    case "low": return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">🔵 Low</Badge>;
    default: return <Badge variant="outline">ℹ️ Info</Badge>;
  }
}

function getCategoryIcon(category: string | null) {
  switch (category) {
    case "secret_detection": return <Key className="h-4 w-4" />;
    case "dependency": return <Bug className="h-4 w-4" />;
    case "sast": return <Eye className="h-4 w-4" />;
    default: return <Shield className="h-4 w-4" />;
  }
}

export default function SecurityClient({ findings }: { findings: Finding[] }) {
  const critical = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  const medium = findings.filter((f) => f.severity === "medium").length;
  const low = findings.filter((f) => f.severity === "low").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Security</h1>
        <p className="text-sm text-muted-foreground">Security findings and vulnerability overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card size="sm"><CardContent className="pt-0"><p className="text-xs text-muted-foreground">Critical</p><p className="text-2xl font-bold text-red-500">{critical}</p></CardContent></Card>
        <Card size="sm"><CardContent className="pt-0"><p className="text-xs text-muted-foreground">High</p><p className="text-2xl font-bold text-orange-500">{high}</p></CardContent></Card>
        <Card size="sm"><CardContent className="pt-0"><p className="text-xs text-muted-foreground">Medium</p><p className="text-2xl font-bold text-yellow-500">{medium}</p></CardContent></Card>
        <Card size="sm"><CardContent className="pt-0"><p className="text-xs text-muted-foreground">Low</p><p className="text-2xl font-bold text-blue-500">{low}</p></CardContent></Card>
      </div>

      {findings.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No security findings detected.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {findings.map((finding) => (
            <Card key={finding.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getCategoryIcon(finding.category)}</div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(finding.severity)}
                      {finding.cweId && <code className="text-xs text-muted-foreground">{finding.cweId}</code>}
                    </div>
                    <p className="text-sm font-medium">{finding.description}</p>
                    {finding.recommendation && (
                      <div className="rounded-md bg-muted/50 p-2">
                        <p className="text-xs font-medium">Recommendation:</p>
                        <p className="text-xs text-muted-foreground">{finding.recommendation}</p>
                      </div>
                    )}
                    {finding.file && (
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{finding.file}{finding.line ? `:${finding.line}` : ""}</code>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
