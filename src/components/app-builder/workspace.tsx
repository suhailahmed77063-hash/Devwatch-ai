"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles, Send, Square, RefreshCw, Terminal, Monitor, Tablet, Smartphone,
  Loader2, CircleCheck, CircleAlert, Bot, FolderTree, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch, streamPost, ApiClientError } from "@/lib/client/api";
import { toast } from "@/components/ui/toast";
import { FileTree, EnvVars, RunPanel, Checkpoints, PipelineList, StepIcon } from "./panels";
import { EditorPane } from "./editor";
import type {
  AppFileRow, AppMeta, OpenTab, EnvVarRow, CheckpointRow, RunRow, PipelineStep, ReviewReport,
} from "./workspace-types";

const EXAMPLES = [
  "Build me a SaaS dashboard with authentication, Stripe subscription, PostgreSQL database and admin panel",
  "Create a todo app with user accounts and a REST API",
  "Build an e-commerce storefront with cart, checkout and order history",
  "Make a URL shortener with analytics and custom slugs",
];

type ActivityEntry =
  | { kind: "stage"; label: string }
  | { kind: "op"; label: string }
  | { kind: "reply"; text: string }
  | { kind: "error"; text: string };

export function AppWorkspace({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [files, setFiles] = useState<AppFileRow[]>([]);
  const [meta, setMeta] = useState<AppMeta | null>(null);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [savingPath, setSavingPath] = useState<string | null>(null);

  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointRow[]>([]);
  const [envVars, setEnvVars] = useState<EnvVarRow[]>([]);
  const [review, setReview] = useState<ReviewReport | null>(null);

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [plan, setPlan] = useState<string[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [consoleTab, setConsoleTab] = useState<"activity" | "runtime">("activity");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const [fileRes, runRes, cpRes, envRes, revRes] = await Promise.all([
        apiFetch<{ files: AppFileRow[]; meta: AppMeta }>(`/api/projects/${projectId}/app-files`),
        apiFetch<{ runs: RunRow[] }>(`/api/projects/${projectId}/app-runs`),
        apiFetch<{ checkpoints: CheckpointRow[] }>(`/api/projects/${projectId}/app-checkpoints`),
        apiFetch<{ vars: EnvVarRow[] }>(`/api/projects/${projectId}/env-vars`),
        apiFetch<ReviewReport>(`/api/projects/${projectId}/app-review`),
      ]);
      setFiles(fileRes.files);
      setMeta(fileRes.meta);
      setRuns(runRes.runs);
      setCheckpoints(cpRes.checkpoints);
      setEnvVars(envRes.vars);
      setReview(revRes);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not load workspace", "error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSseEvent = useCallback(
    (event: string, data: unknown) => {
      const d = data as Record<string, unknown>;
      switch (event) {
        case "runId":
          if (typeof d.runId === "string") setActiveRunId(d.runId);
          break;
        case "stage":
          setBusyLabel(typeof d.label === "string" ? d.label : null);
          setActivity((a) => [...a, { kind: "stage", label: String(d.label ?? "") }]);
          break;
        case "plan":
          if (Array.isArray(d.steps)) setPlan(d.steps.map(String));
          break;
        case "op":
          setActivity((a) => [...a, { kind: "op", label: String(d.label ?? "") }]);
          break;
        case "step": {
          const step = d as unknown as PipelineStep;
          if (step?.id) {
            setSteps((prev) => {
              const idx = prev.findIndex((s) => s.id === step.id);
              const next = [...prev];
              if (idx >= 0) next[idx] = { ...next[idx], ...step };
              else next.push(step);
              return next;
            });
          }
          break;
        }
        case "run": {
          const runSteps = Array.isArray(d.steps) ? (d.steps as PipelineStep[]) : [];
          setSteps(runSteps);
          setRuns((prev) => [
            {
              id: String(d.runId ?? `run-${Date.now()}`),
              kind: "full",
              status: String(d.status ?? "PASSED"),
              steps: runSteps as PipelineStep[],
              summary: typeof d.summary === "string" ? d.summary : null,
              error: null,
              durationMs: null,
              startedAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          break;
        }
        case "checkpoint":
          setCheckpoints((prev) => [
            {
              id: `cp-${Date.now()}`,
              version: Number(d.version ?? 0),
              message: String(d.message ?? "Snapshot"),
              commitHash: null,
              createdAt: new Date().toISOString(),
              files: 0,
            },
            ...prev,
          ]);
          break;
        case "reply":
          setActivity((a) => [...a, { kind: "reply", text: String(d.text ?? "") }]);
          break;
        case "error":
          setActivity((a) => [...a, { kind: "error", text: String(d.message ?? "Agent error") }]);
          toast(String(d.message ?? "Agent error"), "error");
          break;
        case "done":
          break;
      }
    },
    []
  );

  const endRun = useCallback(
    (label: string | null) => {
      setBusy(false);
      busyRef.current = false;
      setBusyLabel(null);
      setActiveRunId(null);
      abortRef.current = null;
      if (label) toast(label, label.startsWith("✅") ? "success" : "info");
      void refresh();
    },
    [refresh]
  );

  const startStream = useCallback(
    async (url: string, body: unknown) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setBusyLabel("Starting…");
      setSteps([]);
      setPlan([]);
      setActivity([]);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        await streamPost(url, body, {
          onEvent: handleSseEvent,
          onDone: () => endRun(null),
          onError: (err) => {
            setActivity((a) => [...a, { kind: "error", text: err.message }]);
            toast(err.message, "error");
            endRun(null);
          },
        });
      } catch (e) {
        if (e instanceof ApiClientError && e.code === "ABORT_ERR") {
          endRun("Run cancelled");
          return;
        }
        setActivity((a) => [...a, { kind: "error", text: e instanceof Error ? e.message : String(e) }]);
        endRun(null);
      }
    },
    [endRun, handleSseEvent]
  );

  const runIdRef = useRef<string | null>(null);
  useEffect(() => {
    runIdRef.current = activeRunId;
  }, [activeRunId]);

  const sendAgent = useCallback(
    async (msg?: string) => {
      const text = (msg ?? prompt).trim();
      if (!text || busy) return;
      setPrompt("");
      await startStream(`/api/projects/${projectId}/app-agent`, { message: text });
    },
    [prompt, busy, projectId, startStream]
  );

  const runQa = useCallback(() => {
    void startStream(`/api/projects/${projectId}/app-runs`, {});
  }, [projectId, startStream]);

  const cancelRun = useCallback(async () => {
    const runId = runIdRef.current;
    if (!runId) return;
    try {
      await apiFetch(`/api/projects/${projectId}/app-agent/cancel`, { method: "POST", body: JSON.stringify({ runId }) });
      setActivity((a) => [...a, { kind: "op", label: "Cancelling…" }]);
    } catch {
      // best-effort
    }
  }, [projectId]);

  // ── file ops ───────────────────────────────────────────────────────────────

  const openFile = useCallback(
    async (path: string) => {
      const existing = tabs.find((t) => t.path === path);
      if (existing) {
        setActivePath(path);
        return;
      }
      try {
        const res = await apiFetch<{ file: { path: string; content: string } | null }>(
          `/api/projects/${projectId}/app-files?path=${encodeURIComponent(path)}`
        );
        if (!res.file) return;
        setTabs((prev) => [...prev, { path: res.file!.path, content: res.file!.content, saved: true }]);
        setActivePath(path);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Could not open file", "error");
      }
    },
    [projectId, tabs]
  );

  const saveFile = useCallback(
    async (path: string) => {
      const tab = tabs.find((t) => t.path === path);
      if (!tab || tab.saved) return;
      setSavingPath(path);
      try {
        await apiFetch(`/api/projects/${projectId}/app-files`, {
          method: "PUT",
          body: JSON.stringify({ path, content: tab.content }),
        });
        setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, saved: true } : t)));
        setFiles((prev) => prev.map((f) => (f.path === path ? { ...f, size: tab.content.length } : f)));
        toast(`Saved ${path.split("/").pop()}`, "success");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Save failed", "error");
      } finally {
        setSavingPath(null);
      }
    },
    [projectId, tabs]
  );

  const saveAll = useCallback(() => {
    void Promise.all(tabs.filter((t) => !t.saved).map((t) => saveFile(t.path)));
  }, [tabs, saveFile]);

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => prev.filter((t) => t.path !== path));
      setActivePath((cur) => (cur === path ? null : cur));
    },
    []
  );

  const changeTab = useCallback((path: string, content: string) => {
    setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, content, saved: false } : t)));
  }, []);

  const createFile = useCallback(
    async (name?: string) => {
      const clean = (name ?? newFileName ?? "").trim();
      if (!clean) {
        setNewFileName("");
        return;
      }
      try {
        const path = clean.startsWith("/") ? clean.slice(1) : clean;
        await apiFetch(`/api/projects/${projectId}/app-files`, {
          method: "POST",
          body: JSON.stringify({ action: "create", path, content: "" }),
        });
        setNewFileName(null);
        await refresh();
        await openFile(path);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Could not create file", "error");
      }
    },
    [projectId, refresh, openFile, newFileName]
  );

  const renameFile = useCallback(
    async (path: string) => {
      const newPath = window.prompt("New path", path);
      if (!newPath || newPath === path) return;
      try {
        await apiFetch(`/api/projects/${projectId}/app-files`, {
          method: "POST",
          body: JSON.stringify({ action: "rename", path, newPath }),
        });
        setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, path: newPath } : t)));
        setActivePath((cur) => (cur === path ? newPath : cur));
        await refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Rename failed", "error");
      }
    },
    [projectId, refresh]
  );

  const deleteFile = useCallback(
    async (path: string) => {
      if (!window.confirm(`Delete ${path}? This cannot be undone.`)) return;
      try {
        await apiFetch(`/api/projects/${projectId}/app-files`, {
          method: "POST",
          body: JSON.stringify({ action: "delete", path }),
        });
        setTabs((prev) => prev.filter((t) => t.path !== path));
        setActivePath((cur) => (cur === path ? null : cur));
        await refresh();
        toast(`Deleted ${path.split("/").pop()}`, "info");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Delete failed", "error");
      }
    },
    [projectId, refresh]
  );

  const addEnvVar = useCallback(
    async (name: string, value: string, isSecret: boolean) => {
      try {
        await apiFetch(`/api/projects/${projectId}/env-vars`, {
          method: "POST",
          body: JSON.stringify({ name, value, isSecret }),
        });
        await refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Could not add variable", "error");
      }
    },
    [projectId, refresh]
  );

  const deleteEnvVar = useCallback(
    async (name: string) => {
      try {
        await apiFetch(`/api/projects/${projectId}/env-vars`, {
          method: "DELETE",
          body: JSON.stringify({ name }),
        });
        await refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Could not delete variable", "error");
      }
    },
    [projectId, refresh]
  );

  const restoreCheckpoint = useCallback(
    async (id: string) => {
      if (!window.confirm("Restore this snapshot? Current files will be replaced.")) return;
      setRestoringId(id);
      try {
        await apiFetch(`/api/projects/${projectId}/app-checkpoints`, {
          method: "POST",
          body: JSON.stringify({ checkpointId: id }),
        });
        setTabs([]);
        setActivePath(null);
        await refresh();
        toast("Snapshot restored", "success");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Restore failed", "error");
      } finally {
        setRestoringId(null);
      }
    },
    [projectId, refresh]
  );

  const starter = useMemo(() => (meta?.appStatus === "starter" ? files.length <= 8 : false), [meta, files]);

  // ── render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-ink">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="w-6 h-6 spin-slow text-acc-soft" />
          <span className="text-xs">Loading app workspace…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-ink text-zinc-200">
      {/* Agent prompt bar */}
      <div className="shrink-0 border-b border-white/5 glass border-x-0 border-t-0 px-4 py-3">
        {starter ? (
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-acc-soft bg-acc/10 border border-acc/25 rounded-full px-3 py-1 mb-3">
              <Bot className="w-3.5 h-3.5" /> AI App Builder
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              Describe the app — I&apos;ll build, test and fix it
            </h2>
            <p className="text-xs text-zinc-500 mt-1.5 max-w-md mx-auto">
              WebForge AI generates the project structure, source files, tests and environment requirements, then runs the automated QA pipeline until it&apos;s production-ready.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) void sendAgent();
                }}
                disabled={busy}
                placeholder="e.g. Build me a SaaS dashboard with authentication, Stripe and an admin panel"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-acc/60 text-zinc-200 placeholder-zinc-600"
              />
              <button
                onClick={() => void sendAgent()}
                disabled={busy || !prompt.trim()}
                className="btn-acc text-white text-sm font-semibold px-5 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 spin-slow" /> : <Sparkles className="w-4 h-4" />}
                Build app
              </button>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="text-[11px] text-zinc-500 hover:text-white glass rounded-full px-3 py-1 transition"
                >
                  {ex.length > 72 ? `${ex.slice(0, 72)}…` : ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) void sendAgent();
                }}
                disabled={busy || !canEdit}
                placeholder="Ask the coding agent — add Stripe, fix the failing test, make it mobile responsive…"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-acc/60 text-zinc-200 placeholder-zinc-600"
              />
              <button
                onClick={() => void sendAgent()}
                disabled={busy || !canEdit || !prompt.trim()}
                aria-label="Send to agent"
                className="p-2.5 rounded-xl btn-acc text-white disabled:opacity-40"
              >
                {busy ? <Loader2 className="w-4 h-4 spin-slow" /> : <Send className="w-4 h-4" />}
              </button>
              {busy && (
                <button
                  onClick={() => void cancelRun()}
                  className="p-2.5 rounded-xl glass text-zinc-300 hover:text-white"
                  aria-label="Cancel run"
                >
                  <Square className="w-4 h-4" />
                </button>
              )}
            </div>
            {busy && busyLabel && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-acc-soft">
                <Loader2 className="w-3 h-3 spin-slow" /> {busyLabel}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main panes */}
      <div className="flex-1 flex min-h-0">
        {/* Left: explorer + env + checkpoints */}
        <aside className="w-60 shrink-0 border-r border-white/5 bg-panel flex flex-col min-h-0 hidden md:flex">
          <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
            <FolderTree className="w-3.5 h-3.5 text-acc-soft" /> Files
            <span className="text-zinc-600 font-normal ml-auto">{files.length}</span>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            {newFileName !== null ? (
              <form
                className="px-2 py-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void createFile();
                }}
              >
                <input
                  autoFocus
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onBlur={() => setNewFileName(null)}
                  placeholder="src/app.ts"
                  className="w-full bg-white/5 border border-acc/50 rounded-lg px-2 py-1 text-[11px] font-mono outline-none text-zinc-200 placeholder-zinc-600"
                />
              </form>
            ) : null}
            <FileTree
              files={files}
              activePath={activePath}
              onOpen={(p) => void openFile(p)}
              onNewFile={() => setNewFileName("")}
              onRename={(p) => void renameFile(p)}
              onDelete={(p) => void deleteFile(p)}
            />
          </div>
          <EnvVars vars={envVars} onAdd={addEnvVar} onDelete={deleteEnvVar} disabled={!canEdit} />
          <Checkpoints checkpoints={checkpoints} busyId={restoringId} onRestore={(id) => void restoreCheckpoint(id)} />
        </aside>

        {/* Center: editor + output console */}
        <main className="flex-1 min-w-0 flex flex-col">
          <EditorPane
            tabs={tabs}
            activePath={activePath}
            onSelect={setActivePath}
            onClose={closeTab}
            onChange={changeTab}
            onSave={(p) => void saveFile(p)}
            saving={savingPath}
            onDirtyAll={() => void saveAll()}
          />

          {/* Output console */}
          <div className="shrink-0 border-t border-white/5 bg-[#0b0b0d] flex flex-col max-h-[38%] min-h-[120px]">
            <div className="h-8 shrink-0 flex items-center gap-1 px-2 border-b border-white/5">
              <button
                onClick={() => setConsoleTab("activity")}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition",
                  consoleTab === "activity" ? "text-white bg-white/5" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Terminal className="w-3 h-3" /> Agent activity
                {busy && <span className="w-1.5 h-1.5 rounded-full bg-acc animate-pulse" />}
              </button>
              <button
                onClick={() => setConsoleTab("runtime")}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition",
                  consoleTab === "runtime" ? "text-white bg-white/5" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Play className="w-3 h-3" /> App output
              </button>
              <div className="flex-1" />
              <div className="flex items-center gap-0.5 glass rounded-lg p-0.5">
                {(
                  [
                    ["desktop", Monitor],
                    ["tablet", Tablet],
                    ["mobile", Smartphone],
                  ] as const
                ).map(([d, Icon]) => (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    aria-label={`${d} frame`}
                    className={cn("p-1 rounded-md", device === d ? "text-acc-soft bg-white/5" : "text-zinc-500 hover:text-white")}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3">
              {consoleTab === "activity" ? (
                <ActivityLog entries={activity} plan={plan} />
              ) : (
                <RuntimeOutput review={review} device={device} />
              )}
            </div>
          </div>
        </main>

        {/* Right: QA / readiness */}
        <RunPanel
          steps={steps}
          busy={busy}
          runs={runs}
          review={review}
          onRunAll={() => {
            if (busy) void cancelRun();
            else void runQa();
          }}
        />
      </div>
    </div>
  );
}

// ── Activity log ─────────────────────────────────────────────────────────────

function ActivityLog({ entries, plan }: { entries: ActivityEntry[]; plan: string[] }) {
  if (!entries.length && !plan.length) {
    return <p className="text-[11px] text-zinc-600 py-2">The AI agent&apos;s steps, plan and results will stream here in real time.</p>;
  }
  return (
    <div className="space-y-1.5 font-mono text-[11px]">
      {plan.length > 0 && (
        <div className="glass rounded-lg p-2.5 mb-2">
          <div className="text-zinc-400 font-semibold mb-1 flex items-center gap-1.5">
            <Bot className="w-3 h-3 text-acc-soft" /> PLAN
          </div>
          <ol className="space-y-0.5 text-zinc-300">
            {plan.map((p, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-acc-soft shrink-0">{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {entries.map((e, i) => {
        const text = e.kind === "stage" || e.kind === "op" ? e.label : e.text;
        return (
          <div
            key={i}
            className={cn(
              "flex gap-2 items-start leading-relaxed",
              e.kind === "stage" && "text-acc-soft font-semibold",
              e.kind === "op" && "text-zinc-300",
              e.kind === "reply" && "text-emerald-400/90",
              e.kind === "error" && "text-red-400"
            )}
          >
            {e.kind === "stage" ? (
              <Loader2 className="w-3 h-3 spin-slow shrink-0 mt-0.5" />
            ) : e.kind === "op" ? (
              <span className="text-zinc-600 shrink-0">▸</span>
            ) : e.kind === "reply" ? (
              <CircleCheck className="w-3 h-3 shrink-0 mt-0.5" />
            ) : (
              <CircleAlert className="w-3 h-3 shrink-0 mt-0.5" />
            )}
            <span className="whitespace-pre-wrap break-words">{text}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Runtime output (real app output from the QA pipeline) ────────────────────

function RuntimeOutput({ review, device }: { review: ReviewReport | null; device: "desktop" | "tablet" | "mobile" }) {
  const runtime = review?.lastRun?.steps.find((s) => s.id === "runtime");
  const output = runtime?.output;
  const width = device === "mobile" ? "100%" : device === "tablet" ? "100%" : "100%";
  const maxW = device === "mobile" ? "max-w-[420px]" : device === "tablet" ? "max-w-[640px]" : "max-w-full";

  return (
    <div className={cn("mx-auto transition-all", maxW)} style={{ width }}>
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/5">
          <span className="w-2 h-2 rounded-full bg-red-500/70" />
          <span className="w-2 h-2 rounded-full bg-amber-500/70" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
          <span className="ml-2 text-[10px] text-zinc-600 font-mono">node dist/index.js — generated app runtime</span>
        </div>
        <pre className="p-3 text-[10.5px] font-mono text-zinc-300 whitespace-pre-wrap break-words max-h-44 overflow-y-auto">
          {output ? (
            output
          ) : (
            <span className="text-zinc-600">
              No runtime output yet. Run “Test &amp; Fix Everything” to build and execute the generated app — its real output appears here.
            </span>
          )}
        </pre>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-600">
        <RefreshCw className="w-3 h-3" /> Output captured from the last real pipeline run
        <span className="flex-1" />
        <StepIcon status={runtime?.status ?? "skip"} />
        {runtime?.status === "pass" ? "Runtime healthy" : runtime?.status === "fail" ? "Runtime failed" : "Not run yet"}
      </div>
    </div>
  );
}