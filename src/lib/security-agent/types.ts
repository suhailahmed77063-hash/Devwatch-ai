/**
 * AI Security Agent — shared types.
 */

export type Severity = "critical" | "high" | "medium" | "low";

export type FindingCategory = "sast" | "dependency" | "secret" | "config" | "authz";

export type Verdict = "confirmed" | "likely" | "potential" | "false_positive";

export type FindingStatus =
  | "queued"
  | "investigating"
  | "validation_required"
  | "validating"
  | "confirmed"
  | "false_positive"
  | "remediation_ready"
  | "fixed"
  | "verified";

export interface FindingEvidence {
  file: string;
  line?: number;
  excerpt: string;
}

export interface AttackPathStep {
  label: string;
  detail: string;
  file?: string;
  line?: number;
}

export interface DependencyRef {
  name: string;
  version?: string;
  ecosystem: string;
  cve?: string;
  ghsa?: string;
  summary?: string;
  fixedVersion?: string;
}

/** Raw scanner output before AI investigation. */
export interface RawFinding {
  ruleId: string;
  title: string;
  category: FindingCategory;
  severity: Severity;
  confidence: number;
  cwe?: string;
  cve?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  snippet?: string;
  rootCause?: string;
  evidence?: FindingEvidence[];
  impact?: string;
  attackPath?: AttackPathStep[];
  components?: DependencyRef[];
}

export interface ScanResult {
  files: Record<string, string>;
  fileCount: number;
  findings: RawFinding[];
  skipped: string[];
}

export type AgentEvent =
  | { type: "stage"; label: string }
  | { type: "finding"; finding: { id: string; ruleId: string; title: string; severity: Severity; filePath?: string } }
  | { type: "investigation"; findingId: string; verdict: Verdict; summary: string }
  | { type: "validation"; findingId: string; status: string; exploitReproduced: boolean }
  | { type: "reply"; text: string }
  | { type: "error"; message: string; code: string }
  | { type: "done" };

/** AI output schema shape (investigator). */
export interface Investigation {
  reachability: "REACHABLE" | "CONDITIONAL" | "UNREACHABLE" | "UNKNOWN";
  verdict: Verdict;
  confidence: number;
  rootCause: string;
  triggerPath: string;
  affectedComponents: string[];
  existingControls: string[];
  evidence: FindingEvidence[];
  attackPath: AttackPathStep[];
  impact: string;
  analysis: string;
  exploitabilityNotes: string;
}

/** AI output schema shape (remediation). */
export interface Remediation {
  problem: string;
  rootCause: string;
  fixStrategy: string;
  files: Array<{ path: string; oldContent: string; newContent: string }>;
  verificationPlan: string;
  explanation: string;
}
