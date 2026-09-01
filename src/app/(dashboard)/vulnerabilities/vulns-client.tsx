"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, ExternalLink } from "lucide-react";

interface Vuln {
  id: string;
  package: string;
  version: string | null;
  patchedVersion: string | null;
  severity: string;
  title: string;
  description: string | null;
  cveId: string | null;
  advisoryUrl: string | null;
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": case "high": return "destructive";
    case "medium": return "secondary";
    default: return "outline";
  }
}

export default function VulnsClient({ vulnerabilities }: { vulnerabilities: Vuln[] }) {
  const high = vulnerabilities.filter((v) => v.severity === "high").length;
  const medium = vulnerabilities.filter((v) => v.severity === "medium").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Vulnerabilities</h1>
        <p className="text-sm text-muted-foreground">Known vulnerabilities in dependencies across repositories</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-orange-500" />
          <p className="mt-2 text-3xl font-bold">{vulnerabilities.length}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-orange-500">{high}</p>
          <p className="text-sm text-muted-foreground">High</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-yellow-500">{medium}</p>
          <p className="text-sm text-muted-foreground">Medium</p>
        </CardContent></Card>
      </div>

      {vulnerabilities.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No vulnerabilities tracked.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {vulnerabilities.map((vuln) => (
            <Card key={vuln.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(vuln.severity) as "destructive" | "secondary" | "outline"}>{vuln.severity}</Badge>
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{vuln.package}@{vuln.version}</span>
                      {vuln.cveId && <code className="text-xs text-muted-foreground">{vuln.cveId}</code>}
                    </div>
                    <h3 className="text-sm font-medium">{vuln.title}</h3>
                    <p className="text-sm text-muted-foreground">{vuln.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {vuln.patchedVersion && <span>Fixed in: {vuln.patchedVersion}</span>}
                    </div>
                  </div>
                  {vuln.advisoryUrl && (
                    <a href={vuln.advisoryUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      Advisory <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
