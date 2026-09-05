"use client";

import { useState, useCallback, useEffect } from "react";
import {
  PanelLeft, PanelRight, Terminal as TerminalIcon, Code2, Globe,
  Loader2, Bot, Play, Square, CheckCircle2, AlertCircle, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch, streamPost } from "@/lib/client/api";
import { toast } from "@/components/ui/toast";
import { MonacoEditor } from "./monaco-editor";
import { FileExplorer } from "./file-explorer";
import { IntegratedTerminal } from "./terminal";
import { LivePreview } from "./live-preview";

interface FileItem {
  path: string;
  size: number;
  updatedAt?: string;
}

interface OpenTab {
  path: string;
  content: string;
  saved: boolean;
}

interface AgentEvent {
  type: string;
  [key: string]: unknown;
}

export function IdeWorkspace({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  // Files state
  const [files, setFiles] = useState<FileItem[]>([]);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [savingPath, setSavingPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Agent state
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [agentActivity, setAgentActivity] = useState<string[]>([]);

  // UI state
  const [leftPanel, setLeftPanel] = useState<"files" | "agent">("files");
  const [rightPanel, setRightPanel] = useState<"terminal" | "preview">("terminal");
  const [rightOpen, setRightOpen] = useState(true);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [previewStatus, setPreviewStatus] = useState<"loading" | "ready" | "error">();

  // ── Load files ──────────────────────────────────────────────────────────

  const refreshFiles = useCallback(async () => {
    try {
      const res = await apiFetch<{ files: FileItem[] }>(`/api/projects/${projectId}/app-files`);
      setFiles(res.files);
    } catch (e) {
      console.error("Failed to load files:", e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refreshFiles();
  }, [refreshFiles]);

  // ── File operations ─────────────────────────────────────────────────────

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

  const deleteFile = useCallback(
    async (path: string) => {
      if (!window.confirm(`Delete ${path}?`)) return;
      try {
        await apiFetch(`/api/projects/${projectId}/app-files`, {
          method: "POST",
          body: JSON.stringify({ action: "delete", path }),
        });
        setTabs((prev) => prev.filter((t) => t.path !== path));
        setActivePath((cur) => (cur === path ? null : cur));
        await refreshFiles();
        toast(`Deleted ${path.split("/").pop()}`, "info");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Delete failed", "error");
      }
    },
    [projectId, refreshFiles]
  );

  // ── AI Agent ────────────────────────────────────────────────────────────

  const handleAgentMessage = useCallback(async (message: string) => {
    if (!message.trim() || busy) return;
    setBusy(true);
    setAgentActivity([]);
    setPrompt("");

    try {
      await streamPost(`/api/projects/${projectId}/app-agent`, { message }, {
        onEvent: (event: string, data: unknown) => {
          const d = data as Record<string, unknown>;
          switch (event) {
            case "stage":
              setAgentActivity((prev) => [...prev, `⚙️ ${d.label}`]);
              break;
            case "op":
              setAgentActivity((prev) => [...prev, `📝 ${d.label}`]);
              break;
            case "reply":
              setAgentActivity((prev) => [...prev, `✅ ${d.text}`]);
              toast(String(d.text), "success");
              break;
            case "error":
              setAgentActivity((prev) => [...prev, `❌ ${d.message}`]);
              toast(String(d.message), "error");
              break;
            case "done":
              break;
          }
        },
        onDone: () => {
          setBusy(false);
          void refreshFiles();
        },
        onError: (err) => {
          setBusy(false);
          toast(err.message, "error");
        },
      });
    } catch (e) {
      setBusy(false);
      toast(e instanceof Error ? e.message : "Agent failed", "error");
    }
  }, [projectId, busy, refreshFiles]);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0c] text-zinc-200">
      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <header className="h-10 shrink-0 flex items-center gap-2 px-3 border-b border-white/5 bg-panel">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-acc/20 flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 text-acc-soft" />
          </span>
          <span className="text-xs font-semibold text-white">AIForge IDE</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span>{files.length} files</span>
          <span>·</span>
          <span>{tabs.length} open</span>
        </div>
      </header>

      {/* ── Main Layout ────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar */}
        <div className="w-56 shrink-0 border-r border-white/5 bg-panel flex flex-col min-h-0">
          {/* Sidebar tabs */}
          <div className="h-9 shrink-0 flex items-center border-b border-white/5">
            <button
              onClick={() => setLeftPanel("files")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium h-full transition",
                leftPanel === "files" ? "text-white border-b-2 border-acc" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Files
            </button>
            <button
              onClick={() => setLeftPanel("agent")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium h-full transition",
                leftPanel === "agent" ? "text-white border-b-2 border-acc" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Bot className="w-3 h-3" /> Agent
            </button>
          </div>

          {leftPanel === "files" ? (
            <FileExplorer
              files={files}
              activePath={activePath}
              onOpen={openFile}
              onNewFile={() => {}}
              onDelete={deleteFile}
              onRefresh={refreshFiles}
              loading={loading}
            />
          ) : (
            /* Agent Panel */
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                {agentActivity.length === 0 && !busy && (
                  <div className="text-center py-8">
                    <Sparkles className="w-6 h-6 text-acc-soft mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">Describe what you want to build</p>
                  </div>
                )}
                {agentActivity.map((line, i) => (
                  <div key={i} className="text-[11px] text-zinc-400 leading-relaxed">
                    {line}
                  </div>
                ))}
                {busy && (
                  <div className="flex items-center gap-2 text-[11px] text-acc-soft">
                    <Loader2 className="w-3 h-3 animate-spin" /> Working...
                  </div>
                )}
              </div>
              <div className="shrink-0 border-t border-white/5 p-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleAgentMessage(prompt);
                  }}
                  className="flex gap-1.5"
                >
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={busy || !canEdit}
                    placeholder="Describe your app..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-acc/50 text-zinc-200 placeholder-zinc-600 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={busy || !prompt.trim() || !canEdit}
                    className="p-1.5 rounded-lg bg-acc text-white hover:bg-acc/80 disabled:opacity-30"
                  >
                    {busy ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Center: Editor + optional bottom panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          <MonacoEditor
            tabs={tabs}
            activePath={activePath}
            onSelect={setActivePath}
            onClose={closeTab}
            onChange={changeTab}
            onSave={saveFile}
            saving={savingPath}
            onDirtyAll={saveAll}
          />
        </div>

        {/* Right panel */}
        {rightOpen && (
          <div className="w-96 shrink-0 border-l border-white/5 bg-panel flex flex-col min-h-0">
            {/* Right panel tabs */}
            <div className="h-9 shrink-0 flex items-center border-b border-white/5">
              <button
                onClick={() => setRightPanel("terminal")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium h-full transition",
                  rightPanel === "terminal" ? "text-white border-b-2 border-acc" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <TerminalIcon className="w-3 h-3" /> Terminal
              </button>
              <button
                onClick={() => setRightPanel("preview")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium h-full transition",
                  rightPanel === "preview" ? "text-white border-b-2 border-acc" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Globe className="w-3 h-3" /> Preview
              </button>
            </div>

            {rightPanel === "terminal" ? (
              <IntegratedTerminal projectId={projectId} />
            ) : (
              <LivePreview projectId={projectId} url={previewUrl} status={previewStatus} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
