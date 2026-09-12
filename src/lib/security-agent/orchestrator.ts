/**
 * AI Security Agent — Orchestrator.
 *
 * Drives the Detect → Investigate pipeline and persists everything through
 * Drizzle: agent_runs, security_findings (agent extension columns),
 * agent_validations, agent_patches, agent_verifications, agent_actions
 * (append-only audit).
 */

import { db } from "@/lib/db";
import {
  agentRuns,
  agentActions,
  securityFindings,
  repositories,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { RawFinding, AgentEvent, Severity } from "./types";
import { runAllScanners } from "./scanners";
import { investigateFinding } from "./investigator";
import { loadRepoSource } from "./source";
import { fingerprintOf, redactSecrets } from "./utils";

type RunRow = typeof agentRuns.$inferSelect;

async function logAction(entry: {
  orgId: string;
  runId?: string | null;
  findingId?: string | null;
  actorId?: string | null;
  tool: string;
  action: string;
  status?: string;
  authScope?: "none" | "user" | "explicit" | "system";
  authorized?: boolean;
  environment?: string;
  input?: unknown;
  result?: unknown;
  error?: string;
  durationMs?: number;
}): Promise<void> {
  try {
    await db.insert(agentActions).values({
      orgId: entry.orgId,
      runId: entry.runId ?? null,
      findingId: entry.findingId ?? null,
      actorId: entry.actorId ?? null,
      tool: entry.tool,
      action: entry.action,
      status: entry.status ?? "OK",
      authScope: entry.authScope ?? "user",
      authorized: entry.authorized ?? false,
      environment: entry.environment ?? null,
      input: redactSecrets(JSON.stringify(entry.input ?? null)),
      result: entry.result === undefined ? null : redactSecrets(JSON.stringify(entry.result)),
      error: entry.error ?? null,
      durationMs: entry.durationMs ?? null,
    });
  } catch {
    // Audit failures must never break the pipeline.
  }
}

export async function upsertRepoForLink(opts: {
  orgId: string;
  owner: string;
  repo: string;
  branch?: string;
  userId?: string | null;
}): Promise<{ repoId: string }> {
  const fullName = `${opts.owner}/${opts.repo}`;
  const existing = await db
    .select()
    .from(repositories)
    .where(and(eq(repositories.orgId, opts.orgId), eq(repositories.fullName, fullName)))
    .limit(1);
  if (existing[0]) return { repoId: existing[0].id };

  const [created] = await db
    .insert(repositories)
    .values({
      orgId: opts.orgId,
      githubId: `link-${fullName}`, // synthetic stable id for link-scanned repos
      name: opts.repo,
      fullName,
      defaultBranch: opts.branch ?? "main",
    })
    .returning();
  return { repoId: created.id };
}

export async function createAgentRun(opts: {
  orgId: string;
  repoId: string | null;
  repoLink?: string | null;
  branch?: string | null;
  kind?: "full" | "scan" | "investigate" | "validate" | "remediate" | "verify";
  userId?: string | null;
}): Promise<RunRow> {
  const [run] = await db
    .insert(agentRuns)
    .values({
      orgId: opts.orgId,
      repoId: opts.repoId,
      repoLink: opts.repoLink ?? null,
      branch: opts.branch ?? "main",
      kind: opts.kind ?? "full",
      status: "running",
      createdById: opts.userId ?? null,
      startedAt: new Date(),
    })
    .returning();
  await logAction({
    orgId: opts.orgId,
    runId: run.id,
    actorId: opts.userId ?? null,
    tool: "ORCHESTRATOR",
    action: "run_created",
    authScope: "user",
    input: { repoLink: opts.repoLink, kind: opts.kind ?? "full" },
  });
  return run;
}

export async function finishRun(opts: {
  run: RunRow;
  status: "completed" | "failed";
  fileCount?: number;
  findingCount?: number;
  summary?: string;
  error?: string;
}): Promise<void> {
  await db
    .update(agentRuns)
    .set({
      status: opts.status,
      fileCount: opts.fileCount ?? 0,
      findingCount: opts.findingCount ?? 0,
      summary: opts.summary ?? null,
      error: opts.error ?? null,
      finishedAt: new Date(),
    })
    .where(eq(agentRuns.id, opts.run.id));
}

/** Investigate + persist one finding. Returns the DB row id. */
export async function persistInvestigatedFinding(opts: {
  run: RunRow;
  repoId: string;
  finding: RawFinding;
  files: Record<string, string>;
  actor: { userId: string };
  existing?: typeof securityFindings.$inferSelect | undefined;
}): Promise<string> {
  const { run, finding } = opts;

  const investigation = await investigateFinding({
    finding,
    files: opts.files,
    repoLabel: run.repoLink ?? `${run.repoId ?? ""}`,
  });

  const fingerprint = fingerprintOf({
    ruleId: finding.ruleId,
    filePath: finding.filePath,
    lineStart: finding.lineStart,
  });

  const values = {
    runId: run.id,
    repoId: opts.repoId,
    ruleId: finding.ruleId,
    description: finding.title,
    severity: finding.severity as Severity, // severityEnum is a superset
    category: finding.category,
    file: finding.filePath ?? null,
    line: finding.lineStart ?? null,
    lineEnd: finding.lineEnd ?? null,
    snippet: finding.snippet ? redactSecrets(finding.snippet.slice(0, 400)) : null,
    rootCause: investigation.rootCause || (finding.rootCause ? redactSecrets(finding.rootCause) : null),
    evidence: investigation.evidence.length ? investigation.evidence : finding.evidence ?? null,
    impact: investigation.impact || finding.impact || null,
    attackPath: (investigation.attackPath.length ? investigation.attackPath : finding.attackPath) ?? null,
    components: finding.components ?? null,
    cweId: finding.cwe ?? null,
    cveId: finding.cve ?? null,
    verdict: investigation.verdict,
    verdictReason: investigation.exploitabilityNotes.slice(0, 1200),
    aiAnalysis: redactSecrets(investigation.analysis.slice(0, 8000)),
    confidence: investigation.confidence,
    agentStatus:
      investigation.verdict === "false_positive"
        ? ("false_positive" as const)
        : investigation.verdict === "confirmed"
          ? ("confirmed" as const)
          : ("validation_required" as const),
    fingerprint,
    orgId: run.orgId,
    source: "ai-agent",
  };

  if (opts.existing) {
    await db.update(securityFindings).set(values).where(eq(securityFindings.id, opts.existing.id));
    await logAction({
      orgId: run.orgId, runId: run.id, findingId: opts.existing.id, actorId: opts.actor.userId,
      tool: "ANALYZE_CODE", action: "investigation_updated", input: { ruleId: finding.ruleId },
      result: { verdict: investigation.verdict, confidence: investigation.confidence },
    });
    return opts.existing.id;
  }

  const [inserted] = await db.insert(securityFindings).values(values).returning({ id: securityFindings.id });
  await logAction({
    orgId: run.orgId, runId: run.id, findingId: inserted.id, actorId: opts.actor.userId,
    tool: "ANALYZE_CODE", action: "finding_investigated",
    input: { ruleId: finding.ruleId, file: finding.filePath },
    result: { verdict: investigation.verdict, confidence: investigation.confidence },
  });
  return inserted.id;
}

/** The full Detect → Investigate pipeline (invoked by the investigate API). */
export async function runInvestigationPipeline(opts: {
  run: RunRow;
  owner: string;
  repo: string;
  branch?: string;
  token?: string;
  actor: { userId: string };
  onEvent?: (event: AgentEvent) => void;
}): Promise<{ findingCount: number; fileCount: number }> {
  const { run } = opts;
  const emit = (e: AgentEvent) => opts.onEvent?.(e);

  try {
    if (!opts.run.repoId) throw new Error("Run has no linked repository");
    emit({ type: "stage", label: "Scanning repository — fetching source" });
    await logAction({ orgId: run.orgId, runId: run.id, actorId: opts.actor.userId, tool: "READ_REPOSITORY", action: "load_source", input: { owner: opts.owner, repo: opts.repo, branch: opts.branch } });
    const source = await loadRepoSource({ owner: opts.owner, repo: opts.repo, branch: opts.branch, token: opts.token });
    emit({ type: "stage", label: `Loaded ${source.fileCount} files${source.truncated ? " (capped)" : ""} — running scanners` });

    await logAction({ orgId: run.orgId, runId: run.id, actorId: opts.actor.userId, tool: "RUN_STATIC_SCAN", action: "scan_started", input: { fileCount: source.fileCount } });
    const rawFindings = await runAllScanners(source.files);
    emit({ type: "stage", label: `${rawFindings.length} raw findings — investigating` });
    await logAction({ orgId: run.orgId, runId: run.id, actorId: opts.actor.userId, tool: "RUN_STATIC_SCAN", action: "scan_completed", result: { findings: rawFindings.length } });

    // De-duplicate against open findings of this repo by fingerprint.
  const openRows = await db
    .select()
    .from(securityFindings)
    .where(and(eq(securityFindings.orgId, run.orgId), eq(securityFindings.runId, run.id)));
  const byFingerprint = new Map<string, (typeof openRows)[number]>();
  for (const row of openRows) if (row.fingerprint) byFingerprint.set(row.fingerprint, row);

    let investigated = 0;
    for (const finding of rawFindings) {
      const fingerprint = fingerprintOf({ ruleId: finding.ruleId, filePath: finding.filePath, lineStart: finding.lineStart });
      const existing = byFingerprint.get(fingerprint);      const id = await persistInvestigatedFinding({
        run,
        repoId: opts.run.repoId,
        finding,
        files: source.files,
        actor: opts.actor,
        existing,
      });
      byFingerprint.set(fingerprint, { id } as unknown as (typeof openRows)[number]);
      investigated++;
      emit({
        type: "finding",
        finding: { id, ruleId: finding.ruleId, title: finding.title, severity: finding.severity, filePath: finding.filePath },
      });
    }

    await finishRun({
      run,
      status: "completed",
      fileCount: source.fileCount,
      findingCount: investigated,
      summary: `${investigated} finding(s) across ${source.fileCount} files`,
    });
    await logAction({ orgId: run.orgId, runId: run.id, actorId: opts.actor.userId, tool: "ORCHESTRATOR", action: "run_completed", result: { findings: investigated } });

    return { findingCount: investigated, fileCount: source.fileCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishRun({ run, status: "failed", error: message });
    await logAction({ orgId: run.orgId, runId: run.id, actorId: opts.actor.userId, tool: "ORCHESTRATOR", action: "run_failed", status: "ERROR", error: message });
    emit({ type: "error", message, code: "pipeline_failed" });
    return { findingCount: 0, fileCount: 0 };
  }
}

/** Rebuild the AI-input shape of a persisted finding (for validate/remediate/verify). */
export async function rawFindingFromRow(row: typeof securityFindings.$inferSelect): Promise<RawFinding> {
  return {
    ruleId: row.ruleId ?? "unknown",
    title: row.description,
    category: (row.category as RawFinding["category"]) ?? "sast",
    severity: row.severity as Severity,
    confidence: row.confidence ?? 50,
    cwe: row.cweId ?? undefined,
    cve: row.cveId ?? undefined,
    filePath: row.file ?? undefined,
    lineStart: row.line ?? undefined,
    snippet: row.snippet ?? undefined,
    rootCause: row.rootCause ?? undefined,
    evidence: Array.isArray(row.evidence) ? (row.evidence as RawFinding["evidence"]) : undefined,
    attackPath: Array.isArray(row.attackPath) ? (row.attackPath as RawFinding["attackPath"]) : undefined,
    components: Array.isArray(row.components) ? (row.components as RawFinding["components"]) : undefined,
    impact: row.impact ?? undefined,
  };
}
