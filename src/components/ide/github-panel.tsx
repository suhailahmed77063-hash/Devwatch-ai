"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  GitBranch, GitPullRequest, Upload, Download, Link2, Unlink,
  Loader2, CheckCircle2, AlertCircle, RefreshCw, Plus, ExternalLink,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface GitHubStatus {
  connected: boolean;
  repo: string | null;
  branch: string;
  user: string | null;
  hasGlobalToken: boolean;
}

interface Repo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  private: boolean;
  updated_at: string;
}

interface Branch {
  name: string;
  commit: { sha: string };
}

interface PR {
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  head: { ref: string };
  base: { ref: string };
}

export function GitHubPanel({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [tab, setTab] = useState<"repos" | "branches" | "prs">("repos");
  const [commitMsg, setCommitMsg] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/github`);
      const data = await res.json();
      setStatus(data);
      if (data.connected && data.repo) {
        fetchBranches();
        fetchPRs();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const fetchRepos = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "repos" }),
      });
      const data = await res.json();
      setRepos(data.repos ?? []);
    } catch {
      toast("Failed to load repos", "error");
    }
  }, [projectId]);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "branches" }),
      });
      const data = await res.json();
      setBranches(data.branches ?? []);
    } catch {
      // ignore
    }
  }, [projectId]);

  const fetchPRs = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prs" }),
      });
      const data = await res.json();
      setPrs(data.prs ?? []);
    } catch {
      // ignore
    }
  }, [projectId]);

  const handleConnect = useCallback(async () => {
    if (!token.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", token: token.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast(`Connected as ${data.user.login}`, "success");
        setToken("");
        fetchStatus();
      } else {
        toast(data.error || "Connection failed", "error");
      }
    } catch {
      toast("Connection failed", "error");
    } finally {
      setConnecting(false);
    }
  }, [projectId, token, fetchStatus]);

  const handleDisconnect = useCallback(async () => {
    try {
      await fetch(`/api/projects/${projectId}/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      toast("Disconnected from GitHub", "info");
      fetchStatus();
    } catch {
      toast("Disconnect failed", "error");
    }
  }, [projectId, fetchStatus]);

  const handleImport = useCallback(async (owner: string, repo: string) => {
    setImporting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", owner, repo }),
      });
      const data = await res.json();
      if (data.success) {
        toast(`Imported ${data.files} files from ${owner}/${repo}`, "success");
        fetchStatus();
      } else {
        toast(data.error || "Import failed", "error");
      }
    } catch {
      toast("Import failed", "error");
    } finally {
      setImporting(false);
    }
  }, [projectId, fetchStatus]);

  const handleCommit = useCallback(async () => {
    if (!commitMsg.trim()) return;
    setCommitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", message: commitMsg.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast(`Committed: ${data.commit.sha.slice(0, 7)}`, "success");
        setCommitMsg("");
      } else {
        toast(data.error || "Commit failed", "error");
      }
    } catch {
      toast("Commit failed", "error");
    } finally {
      setCommitting(false);
    }
  }, [projectId, commitMsg]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  // ── Not connected ──
  if (!status?.connected) {
    return (
      <div className="p-3 space-y-3">
        <div className="text-center py-4">
          <Link2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-zinc-300">Connect GitHub</h3>
          <p className="text-[11px] text-zinc-500 mt-1">Import repos, commit changes, create PRs</p>
        </div>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          placeholder="GitHub Personal Access Token"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-acc/50 text-zinc-200 placeholder-zinc-600"
        />
        <Button
          size="sm"
          className="w-full h-8 text-xs"
          onClick={handleConnect}
          disabled={connecting || !token.trim()}
        >
          {connecting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Link2 className="w-3 h-3 mr-1" />}
          Connect
        </Button>
        <p className="text-[10px] text-zinc-600 text-center">
          Token needs <code>repo</code> scope. Settings → Developer settings → Personal access tokens.
        </p>
      </div>
    );
  }

  // ── Connected ──
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-medium text-zinc-300">{status.user}</span>
          </div>
          <button onClick={handleDisconnect} className="text-[10px] text-zinc-600 hover:text-red-400">
            <Unlink className="w-3 h-3" />
          </button>
        </div>
        {status.repo && (
          <div className="flex items-center gap-1.5 mt-1">
            <GitBranch className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-500 font-mono">{status.repo}</span>
            <span className="text-[10px] text-zinc-600">· {status.branch}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="h-8 flex items-center border-b border-zinc-800">
        {(["repos", "branches", "prs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "repos") fetchRepos(); if (t === "branches") fetchBranches(); if (t === "prs") fetchPRs(); }}
            className={`flex-1 text-[10px] font-medium h-full transition ${
              tab === t ? "text-white border-b-2 border-acc" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "repos" ? "Repos" : t === "branches" ? `Branches (${branches.length})` : `PRs (${prs.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "repos" && (
          <div className="p-2 space-y-1">
            {repos.length === 0 ? (
              <div className="text-center py-8">
                <Button size="sm" variant="outline" className="text-xs" onClick={fetchRepos}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Load Repos
                </Button>
              </div>
            ) : (
              repos.map((repo) => (
                <div key={repo.full_name} className="p-2 rounded-md hover:bg-zinc-800/50 group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-300 font-mono truncate">{repo.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleImport(repo.full_name.split("/")[0], repo.name)}
                        disabled={importing}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                      >
                        Import
                      </button>
                      <a href={repo.html_url} target="_blank" rel="noopener" className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600">
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                  {repo.description && <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{repo.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    {repo.language && <span className="text-[10px] text-zinc-600">{repo.language}</span>}
                    {repo.private && <span className="text-[10px] text-amber-500/60">Private</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "branches" && (
          <div className="p-2 space-y-1">
            {branches.map((b) => (
              <div key={b.name} className="flex items-center gap-2 p-1.5 rounded hover:bg-zinc-800/50">
                <GitBranch className="w-3 h-3 text-zinc-600" />
                <span className="text-xs text-zinc-300 font-mono">{b.name}</span>
                {b.name === status?.branch && (
                  <span className="text-[9px] px-1 py-0.5 bg-acc/15 text-acc-soft rounded">linked</span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "prs" && (
          <div className="p-2 space-y-1">
            {prs.length === 0 ? (
              <p className="text-center text-[11px] text-zinc-600 py-8">No pull requests</p>
            ) : (
              prs.map((pr) => (
                <a key={pr.number} href={pr.html_url} target="_blank" rel="noopener" className="block p-2 rounded hover:bg-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <GitPullRequest className={`w-3 h-3 ${pr.state === "open" ? "text-green-400" : "text-zinc-500"}`} />
                    <span className="text-xs text-zinc-300 truncate">#{pr.number} {pr.title}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{pr.head.ref} → {pr.base.ref}</p>
                </a>
              ))
            )}
          </div>
        )}
      </div>

      {/* Commit bar (when repo is linked) */}
      {status.repo && (
        <div className="shrink-0 border-t border-zinc-800 p-2">
          <div className="flex gap-1.5">
            <input
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              placeholder="Commit message..."
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none focus:border-acc/50 text-zinc-200 placeholder-zinc-600"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCommit(); } }}
            />
            <Button
              size="sm"
              className="h-7 text-[10px]"
              onClick={handleCommit}
              disabled={committing || !commitMsg.trim()}
            >
              {committing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
