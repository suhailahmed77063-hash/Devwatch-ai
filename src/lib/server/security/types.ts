/**
 * Security Agent — shared types.
 *
 * Pipeline: Detect → Investigate → Safely Validate → Explain → Remediate → Verify.
 * DB models live in prisma/schema.prisma (SecurityRun / SecurityFinding /
 * SecurityValidation / SecurityPatch / SecurityVerification / SecurityAction).
 */

export type Severity = "critical" | "high" | "medium" | "low";

export type FindingCategory = "sast" | "dependency" | "secret" | "config" | "authz";

export type Verdict = "CONFIRMED" | "LIKELY" | "POTENTIAL" | "FALSE_POSITIVE";

export type FindingStatus =
  | "QUEUED"
  | "INVESTIGATING"
  | "VALIDATION_REQUIRED"
  | "VALIDATING"
  | "CONFIRMED"
  | "FALSE_POSITIVE"
  | "REMEDIATION_READY"
  | "FIXED"
  | "VERIFIED";

/** One code excerpt proving a claim. Never contains secret values. */
export interface FindingEvidence {
  file: string;
  line?: number;
  excerpt: string;
}

/** One step of an attack path: input → endpoint → vulnerable fn → impact. */
export interface AttackPathStep {
  label: string;
  detail: string;
  file?: string;
  line?: number;
}

export interface DependencyRef {
  name: string;
  version?: string;
  ecosystem: string; // npm | pip | go | ...
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
  confidence: number; // 0..100
  cwe?: string;
  cve?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  snippet?: string;
  rootCause?: string;
  evidence?: FindingEvidence[];
  impact?: string;
  recommendation?: string;
  attackPath?: AttackPathStep[];
  components?: DependencyRef[];
}

export interface ScanResult {
  files: Record<string, string>;
  fileCount: number;
  findings: RawFinding[];
  skipped: string[]; // files excluded by caps
}

export type RunKind = "SCAN" | "INVESTIGATE" | "VALIDATE" | "REMEDIATE" | "VERIFY" | "FULL";

export type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type RepoSource = "WORKSPACE" | "LINKED_REPO" | "GITHUB_LINK";

export type ValidationStatus =
  | "PENDING"
  | "RUNNING"
  | "EXPLOITABLE"
  | "NOT_EXPLOITABLE"
  | "INCONCLUSIVE"
  | "FAILED"
  | "SKIPPED";

export type VerificationStatus =
  | "PENDING"
  | "RUNNING"
  | "FIXED"
  | "STILL_VULNERABLE"
  | "INCONCLUSIVE"
  | "FAILED";

/** Agent SSE events — same shape family as the app-builder agent. */
export type SecurityAgentEvent =
  | { type: "stage"; label: string }
  | { type: "run"; runId: string }
  | { type: "finding"; finding: { id: string; ruleId: string; title: string; severity: Severity; filePath?: string } }
  | { type: "investigation"; findingId: string; verdict: Verdict; summary: string }
  | { type: "validation"; findingId: string; status: ValidationStatus; exploitReproduced: boolean }
  | { type: "reply"; text: string }
  | { type: "error"; message: string; code: string }
  | { type: "done" };
