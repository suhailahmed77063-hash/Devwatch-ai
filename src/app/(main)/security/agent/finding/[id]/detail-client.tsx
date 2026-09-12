"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert, FlaskConical, Wrench, RefreshCcw, ExternalLink, ChevronRight,
  Lock, FileCode2, CheckCircle2, XCircle, AlertCircle, Loader2, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner, StatusPill, EmptyState } from "@/components/ui/misc";
import { apiFetch } from "@/lib/client/api";
import { SectionCard, AgentToolIcon } from "../../agent-client";

// ── Types ───────────────────────────────────────────────────────────────────

interface Evidence { file: string; line?: number; excerpt: string }
interface AttackStep { label: string; detail: string; file?: string; line?: number }

interface FindingDetail {
  id: string; ruleId: string; title: string; category: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number; cwe?: string | null; cve?: string | null;
  filePath?: string | null; lineStart?: number | null; lineEnd?: number | null;
  snippet?: string | null; rootCause?: string | null;
  evidence?: Evidence[] | null; impact?: string | null;
  aiAnalysis?: string | null; verdict?: string | null; verdictReason?: string | null;
  status: string; attackPath?: AttackStep[] | null;
  project: { id: string; name: string };
  run: { repoSource: string; repoUrl: string | null; repoBranch: string | null };
  validations: ValidationRow[];
  patches: PatchRow[];
  verifications: VerificationRow[];
  actions: ActionRow[];
}

interface ValidationRow {
  id: string; status: string; environment: string; authorized: boolean;
  pocScript?: string | null; output?: string | null; exploitReproduced: boolean;
  durationMs?: number | null; error?: string | null; startedAt: string;
  evidence?: { label: string; output?: string; exitCode?: number | null }[] | null;
}

interface PatchRow {
  id: string; status: string; summary?: string | null; strategy?: string | null;
  diff: string; verificationPlan?: string | null; createdAt: string;
}

interface VerificationRow {
  id: string; status: string; beforeState?: string | null;
  rescan?: { findingCount: number; reproduced: boolean; notes?: string } | null;
  testsPassed?: boolean | null; remainingRisks?: string[] | null;
  summary?: string | null; finishedAt?: string | null;
}

interface ActionRow {
  id: string; tool: string; action: string; status: string;
  environment?: string | null; authorized: boolean; createdAt: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export function FindingDetailClient({ findingId }: { findingId: string }) {
  const [data, setData] = useState<FindingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authPurpose, setAuthPurpose] = useState<"validate" | "verify">("validate");
  const [confirmText, setConfirmText] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<{ finding: FindingDetail }>(`/api/security/agent/findings/${findingId}`);
      setData(d.finding);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load finding");
    } finally {
      setLoading(false);
    }
  }, [findingId]);

  useEffect(() => { void load(); }, [load]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const runAction = useCallback(async (kind: "validate" | "remediate" | "verify" | "issue") => {
    if (!data) return;
    setBusy(kind);
    setError(null);
    try {
      if (kind === "validate") {
        await apiFetch(`/api/security/agent/validate`, {
          method: "POST",
          body: JSON.stringify({ findingId: data.id, authorized: true }),
        });
        flash("Sandbox validation complete.");
      } else if (kind === "remediate") {
        await apiFetch(`/api/security/agent/remediate`, {
          method: "POST",
          body: JSON.stringify({ findingId: data.id }),
        });
        flash("Patch generated — review it below. Nothing was merged.");
      } else if (kind === "verify") {
        const latestPatch = data.patches[0]?.id;
        await apiFetch(`/api/security/agent/verify`, {
          method: "POST",
          body: JSON.stringify({ findingId: data.id, patchId: latestPatch, authorized: true }),
        });
        flash("Verification complete.");
      } else {
        const r = await apiFetch<{ issueUrl: string; issueNumber: number }>(`/api/security/agent/github-issue`, {
          method: "POST",
          body: JSON.stringify({ findingId: data.id }),
        });
        flash(`GitHub issue #${r.issueNumber} created.`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
      setAuthOpen(false);
    }
  }, [data, load]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-5 py-16 flex items-center gap-3 text-zinc-400"><Spinner /> Loading finding…</div>;
  }

  if (error && !data) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-16">
        <EmptyState icon={<ShieldAlert className="w-6 h-6 text-red-400" />} title="Finding unavailable" desc={error}>
          <Link href="/security/agent"><Button variant="outline">Back to dashboard</Button></Link>
        </EmptyState>
      </div>
    );
  }

  if (!data) return null;

  const latestPatch = data.patches[0];
  const latestVerification = data.verifications[0];
  const sevTone = data.severity === "critical" || data.severity === "high" ? "red" : data.severity === "medium" ? "amber" : "zinc";

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/security/agent" className="text-xs text-zinc-500 hover:text-white transition">← Security Agent</Link>
        <div className="flex flex-wrap items-start justify-between gap-4 mt-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={sevTone}>{data.severity}</StatusPill>
              <StatusPill tone="zinc">{data.status.replace(/_/g, " ").toLowerCase()}</StatusPill>
              {data.verdict && <StatusPill tone={data.verdict === "FALSE_POSITIVE" ? "zinc" : data.verdict === "CONFIRMED" ? "red" : "amber"}>{data.verdict.toLowerCase()}</StatusPill>}
              <span className="text-[11px] text-zinc-600 font-mono">{data.confidence}% confidence</span>
            </div>
            <h1 className="font-display font-bold text-xl text-white mt-2">{data.title}</h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              {data.filePath ? `${data.filePath}${data.lineStart ? `:${data.lineStart}` : ""} · ` : ""}{data.ruleId}{data.cwe ? ` · ${data.cwe}` : ""}{data.cve ? ` · ${data.cve}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { setAuthPurpose("validate"); setAuthOpen(true); }} disabled={busy !== null}>
              {busy === "validate" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />} Validate in Sandbox
            </Button>
            <Button size="sm" variant="subtle" onClick={() => runAction("remediate")} disabled={busy !== null}>
              {busy === "remediate" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />} Generate Fix
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setAuthPurpose("verify"); setAuthOpen(true); }} disabled={busy !== null}>
              {busy === "verify" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />} Run Verification
            </Button>
            <Button size="sm" variant="ghost" onClick={() => runAction("issue")} disabled={busy !== null}>
              {busy === "issue" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />} Create GitHub Issue
            </Button>
          </div>
        </div>
      </div>

      {error && data && (
        <div className="glass rounded-xl border-red-500/30 text-red-300 text-sm px-4 py-3 mb-5">{error}</div>
      )}
      {toast && (
        <div className="glass rounded-xl border-emerald-500/30 text-emerald-300 text-sm px-4 py-3 mb-5">{toast}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Overview + root cause */}
          <SectionCard title="Overview">
            <div className="px-4 py-4 space-y-3 text-sm">
              <InfoRow label="Root cause" value={data.rootCause} />
              <InfoRow label="Impact" value={data.impact} />
              <InfoRow label="AI analysis" value={data.aiAnalysis} mono={false} />
              {data.verdictReason && <InfoRow label="Reachability" value={data.verdictReason} />}
              <InfoRow label="Repository" value={
                data.run.repoUrl
                  ? `${data.run.repoUrl}${data.run.repoBranch ? ` @ ${data.run.repoBranch}` : ""} (${data.run.repoSource.toLowerCase()})`
                  : `Project workspace (${data.run.repoSource.toLowerCase()})`
              } />
            </div>
          </SectionCard>

          {/* Attack path */}
          {data.attackPath && data.attackPath.length > 0 && (
            <SectionCard title="Attack path">
              <ol className="px-4 py-4 space-y-0">
                {data.attackPath.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="w-7 h-7 rounded-lg bg-acc/10 border border-acc/25 text-acc-soft font-bold text-[11px] flex items-center justify-center">{i + 1}</span>
                      {i < data.attackPath!.length - 1 && <span className="w-px flex-1 bg-gradient-to-b from-acc/40 to-transparent my-1" />}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className="text-sm font-semibold text-zinc-200">{s.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{s.detail}</p>
                      {s.file && (
                        <p className="text-[11px] text-zinc-600 font-mono mt-1 flex items-center gap-1">
                          <FileCode2 className="w-3 h-3" /> {s.file}{s.line ? `:${s.line}` : ""}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}

          {/* Evidence */}
          {data.evidence && data.evidence.length > 0 && (
            <SectionCard title="Source-code evidence">
              <div className="px-4 py-4 space-y-3">
                {data.evidence.map((e, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-white/5">
                    <div className="bg-white/5 px-3 py-1.5 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                      <span>{e.file}{e.line ? `:${e.line}` : ""}</span>
                      <CopyButton text={`${e.file}${e.line ? `:${e.line}` : ""}\n${e.excerpt}`} />
                    </div>
                    <pre className="bg-black/50 p-3 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre">{e.excerpt}</pre>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Patch */}
          {latestPatch && (
            <SectionCard title="Generated patch (proposal — nothing merged)">
              <div className="px-4 py-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <StatusPill tone="amber">{latestPatch.status.toLowerCase()}</StatusPill>
                  <span className="text-zinc-500">{latestPatch.strategy}</span>
                </div>
                <p className="text-sm text-zinc-300">{latestPatch.summary}</p>
                <DiffViewer diff={latestPatch.diff} />
                {latestPatch.verificationPlan && (
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
                    <p className="text-xs font-semibold text-emerald-300 mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> How to verify the fix</p>
                    <p className="text-xs text-zinc-400 whitespace-pre-wrap">{latestPatch.verificationPlan}</p>
                  </div>
                )}
                <p className="text-[11px] text-zinc-600 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Patches are proposals only. Review, run tests, then merge through your GitHub workflow.
                </p>
              </div>
            </SectionCard>
          )}

          {/* Verifications */}
          {data.verifications.length > 0 && (
            <SectionCard title="Verification results">
              <div className="px-4 py-4 space-y-4">
                {data.verifications.map((v) => (
                  <div key={v.id} className="rounded-xl border border-white/5 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <StatusPill tone={v.status === "FIXED" ? "green" : v.status === "STILL_VULNERABLE" ? "red" : "amber"}>
                        {v.status === "FIXED" ? "🟢 fixed" : v.status === "STILL_VULNERABLE" ? "🔴 still vulnerable" : v.status.toLowerCase()}
                      </StatusPill>
                      <span className="text-zinc-600">{v.finishedAt ? new Date(v.finishedAt).toLocaleString() : ""}</span>
                    </div>
                    <p className="text-sm text-zinc-300">{v.summary}</p>
                    {v.rescan && (
                      <p className="text-xs text-zinc-500">
                        Re-scan: {v.rescan.findingCount} finding(s) · original rule {v.rescan.reproduced ? "still fires" : "no longer fires"}{v.rescan.notes ? ` · ${v.rescan.notes}` : ""}
                      </p>
                    )}
                    {v.testsPassed !== null && v.testsPassed !== undefined && (
                      <p className="text-xs text-zinc-500">Tests: {v.testsPassed ? "✅ passed" : "❌ failed"}</p>
                    )}
                    {v.remainingRisks && v.remainingRisks.length > 0 && (
                      <div className="text-xs text-amber-300/80">
                        <p className="font-semibold mb-1">Remaining risks:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {v.remainingRisks.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Validation */}
          <SectionCard title="Validation (isolated sandbox)">
            <div className="px-4 py-4 space-y-3">
              {data.validations.length === 0 ? (
                <p className="text-xs text-zinc-500">No validation run yet. Validation executes a non-destructive PoC inside an isolated sandbox.</p>
              ) : (
                data.validations.map((v) => (
                  <div key={v.id} className="rounded-xl border border-white/5 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <StatusPill tone={v.status === "EXPLOITABLE" ? "red" : v.status === "NOT_EXPLOITABLE" ? "green" : "amber"}>
                        {v.exploitReproduced ? "🔴 reproduced" : v.status === "NOT_EXPLOITABLE" ? "🟢 not reproduced" : v.status.toLowerCase()}
                      </StatusPill>
                      <span className="text-[10px] text-zinc-600">{v.durationMs ?? "?"} ms</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {v.environment} · authorized
                    </p>
                    {v.output && (
                      <pre className="bg-black/50 rounded-lg p-2 text-[10px] font-mono text-zinc-400 max-h-40 overflow-auto whitespace-pre-wrap">{v.output}</pre>
                    )}
                    {v.error && <p className="text-[11px] text-red-400">{v.error}</p>}
                  </div>
                ))
              )}
              <p className="text-[10px] text-zinc-600 border-t border-white/5 pt-2">
                Validation requires ADMIN authorization. PoCs are read-only, time-limited and network-isolated.
              </p>
            </div>
          </SectionCard>

          {/* Audit history */}
          <SectionCard title="Audit history">
            {data.actions.length === 0 ? (
              <p className="text-xs text-zinc-500 px-4 py-4">No agent actions recorded yet.</p>
            ) : (
              <ul className="px-4 py-3 space-y-2.5">
                {data.actions.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-[11px]">
                    <AgentToolIcon tool={a.tool} />
                    <div className="min-w-0 flex-1">
                      <p className="text-zinc-300">{a.action}</p>
                      <p className="text-zinc-600 font-mono text-[10px]">
                        {a.tool} · {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Authorization dialog */}
      <Modal open={authOpen} onClose={() => setAuthOpen(false)} title="Authorization required">
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200 space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Validation Environment: Isolated Sandbox</p>
            <ul className="list-disc list-inside space-y-1 text-amber-200/80">
              <li>The PoC runs in a temporary sandbox, destroyed afterwards.</li>
              <li>Non-destructive: no data mutation, no external network access.</li>
              <li>Strict timeout and resource limits are enforced.</li>
              <li>Only minimal evidence (output + exit status) is stored.</li>
            </ul>
          </div>
          <p className="text-xs text-zinc-400">
            Type <span className="font-mono text-zinc-200">AUTHORIZE</span> to confirm you are authorized to run this
            {authPurpose === "validate" ? " validation" : " verification"} against this repository.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="AUTHORIZE"
            className="w-full glass rounded-xl px-3 py-2 text-sm bg-panel text-zinc-100"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAuthOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={confirmText !== "AUTHORIZE" || busy !== null}
              onClick={() => runAction(authPurpose)}
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
              {authPurpose === "validate" ? "Run validation" : "Run verification"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = true }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="text-zinc-500 hover:text-white transition"
      aria-label="Copy evidence"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

/** Minimal, dependency-free diff viewer with +/- line coloring. */
function DiffViewer({ diff }: { diff: string }) {
  if (!diff) return <p className="text-xs text-zinc-500">No changes produced.</p>;
  return (
    <div className="rounded-xl overflow-hidden border border-white/5">
      <div className="bg-white/5 px-3 py-1.5 text-[11px] font-mono text-zinc-400">proposed patch · unified diff</div>
      <pre className="bg-black/50 p-3 text-[11px] font-mono overflow-x-auto max-h-96 overflow-y-auto">
        {diff.split("\n").map((line, i) => (
          <div key={i} className={
            line.startsWith("+") && !line.startsWith("+++") ? "text-emerald-400 bg-emerald-500/5"
            : line.startsWith("-") && !line.startsWith("---") ? "text-red-400 bg-red-500/5"
            : line.startsWith("@@") ? "text-acc-soft"
            : "text-zinc-400"
          }>{line || " "}</div>
        ))}
      </pre>
    </div>
  );
}
