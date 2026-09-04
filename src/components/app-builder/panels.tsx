"use client";

import { useState } from "react";
import {
  FileCode2, Folder, FolderOpen, ChevronRight, Plus, Trash2, Pencil, Upload, KeyRound, ShieldCheck,
  CircleCheck, CircleAlert, TriangleAlert, Loader2, History, GitBranch, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppFileRow, CheckpointRow, EnvVarRow, PipelineStep, ReviewReport, RunRow } from "./workspace-types";

// ── File tree ───────────────────────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(files: AppFileRow[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const f of files) {
    const parts = f.path.split("/");
    let level = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isDir = i < parts.length - 1;
      let node = level.find((n) => n.name === part && n.isDir === isDir);
      if (!node) {
        node = { name: part, path: acc, isDir, children: [] };
        level.push(node);
      }
      if (!isDir) node.path = f.path;
      level = node.children;
    });
  }
  const sort = (nodes: TreeNode[]) => nodes.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
  const sortRec = (nodes: TreeNode[]) => {
    sort(nodes);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(root);
  return root;
}

export function FileTree({
  files,
  activePath,
  onOpen,
  onNewFile,
  onRename,
  onDelete,
}: {
  files: AppFileRow[];
  activePath: string | null;
  onOpen: (path: string) => void;
  onNewFile: () => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set(["src"]));
  const tree = buildTree(files);

  const toggle = (path: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const render = (nodes: TreeNode[], depth: number) =>
    nodes.map((n) =>
      n.isDir ? (
        <div key={n.path}>
          <button
            className="w-full flex items-center gap-1.5 text-[11.5px] text-zinc-400 hover:text-zinc-200 px-1.5 py-[3px] rounded transition text-left"
            style={{ paddingLeft: 6 + depth * 12 }}
            onClick={() => toggle(n.path)}
          >
            <ChevronRight className={cn("w-3 h-3 transition-transform", open.has(n.path) && "rotate-90")} />
            {open.has(n.path) ? <FolderOpen className="w-3.5 h-3.5 text-acc-soft" /> : <Folder className="w-3.5 h-3.5 text-zinc-500" />}
            <span className="truncate">{n.name}</span>
          </button>
          {open.has(n.path) && render(n.children, depth + 1)}
        </div>
      ) : (
        <button
          key={n.path}
          className={cn(
            "w-full flex items-center gap-1.5 text-[11.5px] px-1.5 py-[3px] rounded transition text-left group",
            n.path === activePath ? "bg-acc/15 text-white" : "text-zinc-400 hover:text-zinc-200"
          )}
          style={{ paddingLeft: 18 + depth * 12 }}
          onClick={() => onOpen(n.path)}
          title={n.path}
        >
          <FileCode2 className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
          <span className="truncate flex-1">{n.name}</span>
          <span className="hidden group-hover:flex items-center gap-1 text-zinc-500">
            <button
              aria-label={`Rename ${n.name}`}
              className="p-0.5 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onRename(n.path);
              }}
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              aria-label={`Delete ${n.name}`}
              className="p-0.5 hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(n.path);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        </button>
      )
    );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1.5">
      {tree.length === 0 && <p className="text-[11px] text-zinc-600 px-2 py-3">No files yet — generate an app or create one.</p>}
      {render(tree, 0)}
      <button
        onClick={onNewFile}
        className="w-full mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-white px-2 py-1 rounded transition"
      >
        <Plus className="w-3 h-3" /> New file
      </button>
    </div>
  );
}

// ── Env vars ────────────────────────────────────────────────────────────────

export function EnvVars({
  vars,
  onAdd,
  onDelete,
  disabled,
}: {
  vars: EnvVarRow[];
  onAdd: (name: string, value: string, isSecret: boolean) => Promise<void>;
  onDelete: (name: string) => void;
  disabled?: boolean;
}) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [isSecret, setIsSecret] = useState(true);
  const [busy, setBusy] = useState(false);

  return (
    <div className="border-t border-white/5 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300 mb-1.5">
        <KeyRound className="w-3 h-3 text-acc-soft" /> Environment variables
        <span className="text-zinc-600 font-normal ml-auto">{vars.length}</span>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {vars.map((v) => (
          <div key={v.id} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="truncate flex-1 font-mono" title={v.name}>{v.name}</span>
            <span className={cn("truncate max-w-[70px] font-mono", v.isSecret && "text-zinc-600")}>{v.value}</span>
            {v.isSecret && <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" aria-label="Secret" />}
            <button aria-label={`Delete ${v.name}`} className="text-zinc-600 hover:text-red-400 p-0.5" onClick={() => onDelete(v.name)} disabled={disabled}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <form
        className="mt-2 flex flex-col gap-1.5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          await onAdd(name.trim(), value, isSecret);
          setBusy(false);
          setName("");
          setValue("");
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          placeholder="DATABASE_URL"
          className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono outline-none focus:border-acc/60 text-zinc-200 placeholder-zinc-600"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isSecret ? "Secret value (encrypted)" : "Value"}
          type={isSecret ? "password" : "text"}
          className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono outline-none focus:border-acc/60 text-zinc-200 placeholder-zinc-600"
        />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] text-zinc-500 cursor-pointer">
            <input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} className="accent-[#e11d48]" />
            Secret
          </label>
          <button
            type="submit"
            disabled={disabled || busy || !name.trim()}
            className="ml-auto flex items-center gap-1 text-[11px] font-semibold btn-acc text-white px-2.5 py-1 rounded-lg disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3 h-3 spin-slow" /> : <Plus className="w-3 h-3" />} Add
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Run / pipeline panel ────────────────────────────────────────────────────

export function StepIcon({ status }: { status: string }) {
  if (status === "pass") return <CircleCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (status === "fail") return <CircleAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  if (status === "warn") return <TriangleAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  if (status === "running") return <Loader2 className="w-3.5 h-3.5 text-acc-soft spin-slow shrink-0" />;
  return <span className="w-3.5 h-3.5 shrink-0" />;
}

export function PipelineList({ steps }: { steps: PipelineStep[] }) {
  if (!steps.length) return <p className="text-[11px] text-zinc-600 py-4 text-center">No checks run yet.</p>;
  return (
    <div className="space-y-1">
      {steps.map((s, i) => (
        <div key={`${s.id}-${i}`} className="glass rounded-lg px-2.5 py-1.5">
          <div className="flex items-center gap-2 text-[11.5px]">
            <StepIcon status={s.status} />
            <span className="flex-1 text-zinc-300">{s.label}</span>
            {s.status === "pass" && <span className="text-[10px] text-emerald-400 font-semibold">✓ Passed</span>}
            {s.status === "fail" && <span className="text-[10px] text-red-400 font-semibold">✗ Failed</span>}
            {s.status === "warn" && <span className="text-[10px] text-amber-400 font-semibold">⚠ Warning</span>}
            {s.status === "running" && <span className="text-[10px] text-acc-soft font-semibold">Running…</span>}
            {typeof s.durationMs === "number" && s.status !== "running" && (
              <span className="text-[10px] text-zinc-600">{(s.durationMs / 1000).toFixed(1)}s</span>
            )}
          </div>
          {s.output && (
            <details className="mt-1">
              <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400">output</summary>
              <pre className="mt-1 max-h-36 overflow-auto text-[10px] font-mono text-zinc-400 whitespace-pre-wrap break-words bg-black/30 rounded-lg p-2">{s.output}</pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

export function RunPanel({
  steps,
  busy,
  runs,
  review,
  onRunAll,
}: {
  steps: PipelineStep[];
  busy: boolean;
  runs: RunRow[];
  review: ReviewReport | null;
  onRunAll: () => void;
}) {
  const readiness = review?.readiness;
  const security = review?.security;
  return (
    <div className="w-[300px] shrink-0 border-l border-white/5 bg-panel flex flex-col min-h-0">
      <div className="px-3 py-2.5 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-acc-soft" /> Automated QA
        </span>
        <button
          onClick={onRunAll}
          disabled={busy}
          className="btn-acc text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-3 h-3 spin-slow" /> : <Upload className="w-3 h-3" />}
          {busy ? "Running…" : "Test & Fix Everything"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <PipelineList steps={steps} />

        {(readiness || security) && (
          <div className="space-y-2">
            {security && (
              <div className="glass rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-300">Security score</span>
                  <span className={cn("font-display font-bold text-lg", security.score >= 85 ? "text-emerald-400" : security.score >= 70 ? "text-amber-400" : "text-red-400")}>
                    {security.score}
                    <span className="text-[10px] text-zinc-600 font-normal">/100</span>
                  </span>
                </div>
                {security.findings.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {security.findings.slice(0, 4).map((f) => (
                      <li key={f.id} className="text-[10.5px] text-zinc-500 flex gap-1.5">
                        <CircleAlert className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <span>{f.label}{f.file ? ` — ${f.file}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {readiness && (
              <div className="glass rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-300">Production readiness</span>
                  <span className={cn("font-display font-bold text-lg", readiness.score >= 80 ? "text-emerald-400" : readiness.score >= 50 ? "text-amber-400" : "text-red-400")}>
                    {readiness.score}
                    <span className="text-[10px] text-zinc-600 font-normal">/100</span>
                  </span>
                </div>
                {readiness.blockers.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {readiness.blockers.slice(0, 4).map((b) => (
                      <li key={b} className="text-[10.5px] text-red-400/90 flex gap-1.5">
                        <CircleAlert className="w-3 h-3 shrink-0 mt-0.5" /> {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {review?.git.configured && (
          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1.5 flex items-center gap-1">
              <GitBranch className="w-3 h-3" /> AI commits
            </h4>
            <div className="space-y-1">
              {review.git.log.slice(0, 6).map((c) => (
                <div key={c.hash} className="flex items-center gap-1.5 text-[10.5px] text-zinc-500">
                  <span className="font-mono text-acc-soft shrink-0">{c.hash.slice(0, 7)}</span>
                  <span className="truncate flex-1">{c.message}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-50 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {runs.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1.5 flex items-center gap-1">
              <History className="w-3 h-3" /> Recent runs
            </h4>
            <div className="space-y-1">
              {runs.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center gap-1.5 text-[10.5px] text-zinc-500">
                  <StepIcon status={r.status === "PASSED" ? "pass" : r.status === "FAILED" ? "fail" : "running"} />
                  <span className="truncate flex-1">{r.summary ?? r.kind}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Checkpoints ─────────────────────────────────────────────────────────────

export function Checkpoints({
  checkpoints,
  busyId,
  onRestore,
}: {
  checkpoints: CheckpointRow[];
  busyId: string | null;
  onRestore: (id: string) => void;
}) {
  return (
    <div className="border-t border-white/5 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300 mb-1.5">
        <History className="w-3 h-3 text-acc-soft" /> Snapshots
        <span className="text-zinc-600 font-normal ml-auto">{checkpoints.length}</span>
      </div>
      <div className="space-y-1 max-h-36 overflow-y-auto">
        {checkpoints.length === 0 && <p className="text-[10.5px] text-zinc-600">AI changes create snapshots automatically.</p>}
        {checkpoints.map((c) => (
          <div key={c.id} className="flex items-center gap-1.5 text-[10.5px] text-zinc-400">
            <span className="w-5 h-5 rounded-md bg-acc/15 border border-acc/25 text-acc-soft flex items-center justify-center text-[9px] font-bold shrink-0">
              {c.version}
            </span>
            <span className="truncate flex-1" title={c.message}>{c.message}</span>
            <button
              onClick={() => onRestore(c.id)}
              disabled={busyId === c.id}
              className="text-[10px] text-acc-soft hover:underline shrink-0 disabled:opacity-50"
            >
              {busyId === c.id ? "Restoring…" : "Restore"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}