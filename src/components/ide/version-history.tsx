"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface Checkpoint {
  id: string;
  version: number;
  message: string;
  commitHash: string | null;
  createdAt: string;
  files: number;
}

interface DiffResult {
  path: string;
  status: "added" | "removed" | "modified" | "unchanged";
  oldContent?: string;
  newContent?: string;
}

interface CompareResult {
  checkpointA: { id: string; version: number; message: string; createdAt: string };
  checkpointB: { id: string; version: number; message: string; createdAt: string };
  diff: { path: string; status: string }[];
  stats: { total: number; added: number; removed: number; modified: number; unchanged: number };
}

export function VersionHistory({ projectId }: { projectId: string }) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDiff, setShowDiff] = useState<DiffResult[] | null>(null);
  const [diffCheckpoint, setDiffCheckpoint] = useState<Checkpoint | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<Checkpoint | null>(null);

  const fetchCheckpoints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/checkpoints`);
      const data = await res.json();
      setCheckpoints(data.checkpoints ?? []);
    } catch {
      setError("Failed to load version history");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchCheckpoints(); }, [fetchCheckpoints]);

  const handleRestore = async (cp: Checkpoint) => {
    setRestoring(cp.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/checkpoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", checkpointId: cp.id }),
      });
      const data = await res.json();
      if (data.success) {
        setConfirmRestore(null);
        await fetchCheckpoints();
      } else {
        setError(data.error || "Restore failed");
      }
    } catch {
      setError("Restore failed");
    } finally {
      setRestoring(null);
    }
  };

  const handleDiff = async (cp: Checkpoint) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/checkpoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "diff", checkpointId: cp.id }),
      });
      const data = await res.json();
      setShowDiff(data.changes ?? []);
      setDiffCheckpoint(cp);
    } catch {
      setError("Failed to load diff");
    }
  };

  const handleCompare = async () => {
    const ids = Array.from(selected);
    if (ids.length !== 2) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/checkpoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "compare", checkpointIdA: ids[0], checkpointIdB: ids[1] }),
      });
      const data = await res.json();
      setCompareResult(data);
    } catch {
      setError("Failed to compare checkpoints");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 2) next.add(id);
      return next;
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return d.toLocaleDateString();
  };

  const statusColor = (s: string) => {
    if (s === "added") return "text-green-400";
    if (s === "removed") return "text-red-400";
    if (s === "modified") return "text-yellow-400";
    return "text-zinc-500";
  };

  const statusIcon = (s: string) => {
    if (s === "added") return "+";
    if (s === "removed") return "−";
    if (s === "modified") return "~";
    return "·";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        <div className="animate-spin w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full mr-2" />
        Loading versions...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Version History</h3>
        <div className="flex gap-1">
          {selected.size === 2 && (
            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={handleCompare}>
              Compare Selected
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-6 text-xs text-zinc-400" onClick={fetchCheckpoints}>
            ↻
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 text-xs text-red-400 bg-red-500/10 border-b border-red-500/20 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Checkpoint list */}
      <div className="flex-1 overflow-y-auto">
        {checkpoints.length === 0 ? (
          <div className="p-4 text-center text-zinc-600 text-sm">
            No checkpoints yet. Checkpoints are created automatically when the AI generates or modifies your app.
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {checkpoints.map((cp) => (
              <div
                key={cp.id}
                className={`group p-2 rounded-md cursor-pointer transition-colors ${
                  selected.has(cp.id)
                    ? "bg-blue-500/15 border border-blue-500/30"
                    : "hover:bg-zinc-800/50 border border-transparent"
                }`}
                onClick={() => toggleSelect(cp.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-1 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${
                      cp.version === checkpoints[0]?.version ? "bg-green-500" : "bg-zinc-600"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-500">v{cp.version}</span>
                      {cp.version === checkpoints[0]?.version && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-500/15 text-green-400 rounded">current</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 mt-0.5 truncate">{cp.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-600">{formatTime(cp.createdAt)}</span>
                      <span className="text-[10px] text-zinc-600">{cp.files} files</span>
                      {cp.commitHash && (
                        <span className="text-[10px] font-mono text-zinc-600">{cp.commitHash.slice(0, 7)}</span>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0">
                    <button
                      className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                      onClick={(e) => { e.stopPropagation(); handleDiff(cp); }}
                    >
                      Diff
                    </button>
                    {cp.version !== checkpoints[0]?.version && (
                      <button
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                        onClick={(e) => { e.stopPropagation(); setConfirmRestore(cp); }}
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diff panel */}
      {showDiff && diffCheckpoint && (
        <div className="border-t border-zinc-800 max-h-[40vh] flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50">
            <span className="text-xs text-zinc-400">
              Diff vs v{diffCheckpoint.version} — {showDiff.length} change(s)
            </span>
            <button className="text-xs text-zinc-500 hover:text-white" onClick={() => { setShowDiff(null); setDiffCheckpoint(null); }}>✕</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 font-mono text-xs space-y-0.5">
              {showDiff.map((c) => (
                <div key={c.path} className="flex items-center gap-2 py-0.5">
                  <span className={statusColor(c.status)}>{statusIcon(c.status)}</span>
                  <span className="text-zinc-300">{c.path}</span>
                  <span className={`text-[10px] ${statusColor(c.status)}`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compare panel */}
      {compareResult && (
        <div className="border-t border-zinc-800 max-h-[40vh] flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50">
            <span className="text-xs text-zinc-400">
              v{compareResult.checkpointA.version} → v{compareResult.checkpointB.version}
              {" · "}
              {compareResult.stats.added} added, {compareResult.stats.removed} removed, {compareResult.stats.modified} modified
            </span>
            <button className="text-xs text-zinc-500 hover:text-white" onClick={() => setCompareResult(null)}>✕</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 font-mono text-xs space-y-0.5">
              {compareResult.diff.map((d) => (
                <div key={d.path} className="flex items-center gap-2 py-0.5">
                  <span className={statusColor(d.status)}>{statusIcon(d.status)}</span>
                  <span className="text-zinc-300">{d.path}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Restore confirmation dialog */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-2">Restore Checkpoint?</h3>
            <p className="text-xs text-zinc-400 mb-1">
              This will replace all current files with the snapshot from <span className="text-zinc-300">v{confirmRestore.version}</span>.
            </p>
            <p className="text-xs text-zinc-500 mb-4">
              &ldquo;{confirmRestore.message}&rdquo;
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setConfirmRestore(null)}
                disabled={!!restoring}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                onClick={() => handleRestore(confirmRestore)}
                disabled={!!restoring}
              >
                {restoring ? "Restoring..." : "Restore v" + confirmRestore.version}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
